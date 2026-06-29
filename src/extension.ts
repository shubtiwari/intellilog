import * as vscode from "vscode";
import * as path from "path";
import { providerRegistry } from "./providers/registry";
import { IntelliLogConfig, LanguageProvider } from "./providers/types";

interface LogData {
  selection: vscode.Selection;
  logStatement: string;
}

interface FunctionInfo {
  name: string;
  params: string[];
}

export function activate(context: vscode.ExtensionContext) {

  // ─── Gutter Decorations ────────────────────────────────────────────────────

  const gutterDecorationType = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.joinPath(context.extensionUri, "resources", "gutter-icon.svg"),
    gutterIconSize: "contain",
  });

  function refreshGutterDecorations(editor: vscode.TextEditor) {
    const ranges: vscode.Range[] = [];
    for (let i = 0; i < editor.document.lineCount; i++) {
      const line = editor.document.lineAt(i);
      if (isIntelliLogLine(line.text)) { ranges.push(line.range); }
    }
    editor.setDecorations(gutterDecorationType, ranges);
  }

  if (vscode.window.activeTextEditor) {
    refreshGutterDecorations(vscode.window.activeTextEditor);
  }

  // ─── Status Bar ────────────────────────────────────────────────────────────

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "intellilog.showQuickActions";
  statusBarItem.tooltip = "IntelliLog logs in this file — click to manage";

  function updateStatusBar(document?: vscode.TextDocument) {
    const doc = document ?? vscode.window.activeTextEditor?.document;
    if (!doc) { statusBarItem.hide(); return; }
    let count = 0;
    for (let i = 0; i < doc.lineCount; i++) {
      if (isIntelliLogLine(doc.lineAt(i).text)) { count++; }
    }
    if (count > 0) {
      statusBarItem.text = `🎯 ${count} log${count === 1 ? "" : "s"}`;
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }

  updateStatusBar();

  // ─── Event Listeners ───────────────────────────────────────────────────────

  context.subscriptions.push(
    gutterDecorationType,
    statusBarItem,

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshGutterDecorations(editor);
        updateStatusBar(editor.document);
      } else {
        statusBarItem.hide();
      }
    }),

    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document === event.document) {
        refreshGutterDecorations(editor);
        updateStatusBar(event.document);
      }
    }),

    // ─── Commands ─────────────────────────────────────────────────────────────

    vscode.commands.registerCommand("intellilog.showQuickActions", () => {
      vscode.commands.executeCommand("workbench.action.quickOpen", ">IntelliLog");
    }),

    vscode.commands.registerCommand("intellilog.smartLog", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }

      const provider = providerRegistry.getProviderForLanguage(editor.document.languageId);
      if (!provider) {
        vscode.window.showWarningMessage(`IntelliLog: Language '${editor.document.languageId}' is not supported yet!`);
        return;
      }

      const config = fetchIntelliLogConfig();
      const fileName = path.basename(editor.document.fileName);

      const logDataList = (
        await Promise.all(editor.selections.map((sel) =>
          buildLogDataForSelection(editor, sel, config, provider, fileName)
        ))
      ).filter((d): d is LogData => d !== null);

      if (logDataList.length === 0) {
        vscode.window.showWarningMessage("IntelliLog: Please select a variable first!");
        return;
      }

      await editor.edit((editBuilder) => {
        for (const data of logDataList.sort((a, b) => b.selection.end.line - a.selection.end.line)) {
          editBuilder.insert(new vscode.Position(data.selection.end.line + 1, 0), data.logStatement);
        }
      });
      refreshGutterDecorations(editor);
      updateStatusBar(editor.document);
    }),

    vscode.commands.registerCommand("intellilog.wrapFunction", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }

      const lineIndex = editor.selection.active.line;
      const lineText = editor.document.lineAt(lineIndex).text;
      const funcInfo = detectFunction(lineText, editor.document.languageId);

      if (!funcInfo) {
        vscode.window.showWarningMessage("IntelliLog: No function detected on this line. Place your cursor on a function definition.");
        return;
      }

      const indentation = lineText.match(/^\s*/)?.[0] ?? "";
      const bodyIndentation = lineIndex + 1 < editor.document.lineCount
        ? editor.document.lineAt(lineIndex + 1).text.match(/^\s*/)?.[0] ?? (indentation + "  ")
        : indentation + "  ";

      const config = fetchIntelliLogConfig();
      const fileName = path.basename(editor.document.fileName);
      const entryLog = buildFunctionEntryLog(funcInfo, editor.document.languageId, config, fileName, lineIndex + 1, bodyIndentation);

      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(lineIndex + 1, 0), entryLog);
      });
      refreshGutterDecorations(editor);
      updateStatusBar(editor.document);
    }),

    vscode.commands.registerCommand("intellilog.commentAllLogs", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }
      const commentChar = getCommentChar(editor.document.languageId);
      let count = 0;
      await editor.edit((editBuilder) => {
        for (let i = 0; i < editor.document.lineCount; i++) {
          const line = editor.document.lineAt(i);
          if (!isIntelliLogLine(line.text)) { continue; }
          const trimmedContent = line.text.trimStart();
          if (trimmedContent.startsWith("//") || trimmedContent.startsWith("#")) { continue; }
          const ind = line.text.match(/^\s*/)?.[0] ?? "";
          editBuilder.replace(line.range, `${ind}${commentChar} ${trimmedContent}`);
          count++;
        }
      });
      refreshGutterDecorations(editor);
      updateStatusBar(editor.document);
      vscode.window.showInformationMessage(`IntelliLog: Commented ${count} log statement(s).`);
    }),

    vscode.commands.registerCommand("intellilog.uncommentAllLogs", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }
      let count = 0;
      await editor.edit((editBuilder) => {
        for (let i = 0; i < editor.document.lineCount; i++) {
          const line = editor.document.lineAt(i);
          if (!isIntelliLogLine(line.text)) { continue; }
          const trimmedContent = line.text.trimStart();
          const ind = line.text.match(/^\s*/)?.[0] ?? "";
          let uncommented: string;
          if (trimmedContent.startsWith("// ")) { uncommented = trimmedContent.slice(3); }
          else if (trimmedContent.startsWith("//")) { uncommented = trimmedContent.slice(2); }
          else if (trimmedContent.startsWith("# ")) { uncommented = trimmedContent.slice(2); }
          else if (trimmedContent.startsWith("#")) { uncommented = trimmedContent.slice(1); }
          else { continue; }
          editBuilder.replace(line.range, `${ind}${uncommented}`);
          count++;
        }
      });
      refreshGutterDecorations(editor);
      updateStatusBar(editor.document);
      vscode.window.showInformationMessage(`IntelliLog: Uncommented ${count} log statement(s).`);
    }),

    vscode.commands.registerCommand("intellilog.deleteAllLogs", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }
      let count = 0;
      await editor.edit((editBuilder) => {
        for (let i = 0; i < editor.document.lineCount; i++) {
          const line = editor.document.lineAt(i);
          if (!isIntelliLogLine(line.text)) { continue; }
          editBuilder.delete(line.rangeIncludingLineBreak);
          count++;
        }
      });
      refreshGutterDecorations(editor);
      updateStatusBar(editor.document);
      vscode.window.showInformationMessage(`IntelliLog: Deleted ${count} log statement(s).`);
    }),
  );
}

export function deactivate() {}

// ─── Config ────────────────────────────────────────────────────────────────────

function fetchIntelliLogConfig(): IntelliLogConfig {
  const cfg = vscode.workspace.getConfiguration("intellilog");
  return {
    prefix: cfg.get<string>("logPrefix", "🎯"),
    suffix: cfg.get<boolean>("insertArrow", true) ? ":" : "",
    structuredOutput: cfg.get<boolean>("structuredOutput", false),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getLineIndentation(document: vscode.TextDocument, lineNumber: number): string {
  return document.lineAt(lineNumber).text.match(/^\s*/)?.[0] ?? "";
}

async function fetchHoverDetails(document: vscode.TextDocument, position: vscode.Position): Promise<string> {
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>("vscode.executeHoverProvider", document.uri, position);
  if (!hovers || hovers.length === 0) { return ""; }
  return hovers.map((h) => h.contents.map((c) => typeof c === "string" ? c : (c as vscode.MarkdownString).value).join("")).join("");
}

async function buildLogDataForSelection(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
  config: IntelliLogConfig,
  provider: LanguageProvider,
  fileName: string,
): Promise<LogData | null> {
  const selectedText = editor.document.getText(selection);
  if (!selectedText) { return null; }
  return {
    selection,
    logStatement: provider.buildLogStatement(
      selectedText,
      await fetchHoverDetails(editor.document, selection.active),
      getLineIndentation(editor.document, selection.start.line),
      config,
      fileName,
      selection.end.line + 1,
    ),
  };
}

function isIntelliLogLine(lineText: string): boolean {
  const t = lineText.trimEnd();
  return t.endsWith("// intellilog") || t.endsWith("# intellilog");
}

function getCommentChar(languageId: string): string {
  return languageId === "python" || languageId === "ruby" ? "#" : "//";
}

// ─── Function Wrap ─────────────────────────────────────────────────────────────

function detectFunction(lineText: string, languageId: string): FunctionInfo | null {
  const t = lineText.trim();

  if (["javascript", "typescript", "javascriptreact", "typescriptreact"].includes(languageId)) {
    let m = t.match(/(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
    if (m) { return { name: m[1], params: parseJsParams(m[2]) }; }
    m = t.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/);
    if (m) { return { name: m[1], params: parseJsParams(m[2]) }; }
    m = t.match(/^(\w+)\s*\(([^)]*)\)\s*(?::\s*[\w<>[\]|&\s]+)?\{/);
    if (m && !["if", "for", "while", "switch", "catch", "else"].includes(m[1])) {
      return { name: m[1], params: parseJsParams(m[2]) };
    }
  }

  if (languageId === "python") {
    const m = t.match(/(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
    if (m) { return { name: m[1], params: parseJsParams(m[2]).filter((p) => p !== "self" && p !== "cls") }; }
  }

  if (languageId === "go") {
    const m = t.match(/func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(([^)]*)\)/);
    if (m) { return { name: m[1], params: parseGoParams(m[2]) }; }
  }

  if (languageId === "php") {
    const m = t.match(/function\s+(\w+)\s*\(([^)]*)\)/);
    if (m) { return { name: m[1], params: parseJsParams(m[2]) }; }
  }

  if (languageId === "dart") {
    const m = t.match(/(?:(?:static|async|Future\S*|void|String|int|bool|double|List|Map|dynamic)\s+)+(\w+)\s*\(([^)]*)\)/);
    if (m && !["if", "for", "while", "switch"].includes(m[1])) {
      return { name: m[1], params: parseDartParams(m[2]) };
    }
  }

  if (languageId === "ruby") {
    const m = t.match(/def\s+(\w+)(?:\s*\(([^)]*)\))?/);
    if (m) { return { name: m[1], params: m[2] ? parseJsParams(m[2]) : [] }; }
  }

  if (languageId === "rust") {
    const m = t.match(/(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/);
    if (m) { return { name: m[1], params: parseRustParams(m[2]) }; }
  }

  return null;
}

function parseJsParams(raw: string): string[] {
  return raw.split(",").map((p) => p.trim().split(/[:\s=]/)[0].replace(/[^a-zA-Z0-9_$]/g, "").trim()).filter(Boolean);
}

function parseGoParams(raw: string): string[] {
  return raw.split(",").map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
}

function parseDartParams(raw: string): string[] {
  return raw.split(",").map((p) => {
    const withoutDefault = p.split("=")[0];
    const clean = withoutDefault.replace(/[{}[\]]/g, "").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    return parts[parts.length - 1]?.replace(/[^a-zA-Z0-9_]/g, "") ?? "";
  }).filter((p) => p && p !== "this");
}

function parseRustParams(raw: string): string[] {
  return raw.split(",").map((p) => {
    const name = p.trim().split(":")[0].replace(/^mut\s+/, "").replace(/^&(mut\s+)?/, "").trim();
    return name.replace(/[^a-zA-Z0-9_]/g, "");
  }).filter((p) => p && p !== "self");
}

function buildFunctionEntryLog(
  info: FunctionInfo,
  languageId: string,
  config: IntelliLogConfig,
  fileName: string,
  lineNumber: number,
  indentation: string,
): string {
  const { prefix } = config;
  const loc = `[${fileName}:${lineNumber}]`;
  const MARKER_JS = "// intellilog";
  const MARKER_PY = "# intellilog";

  if (["javascript", "typescript", "javascriptreact", "typescriptreact"].includes(languageId)) {
    const paramsObj = info.params.length > 0 ? `, { ${info.params.join(", ")} }` : "";
    return `${indentation}console.log('${prefix} ${loc} → ${info.name} called'${paramsObj}); ${MARKER_JS}\n`;
  }

  if (languageId === "python") {
    const pyParams = info.params.length > 0 ? ` | ${info.params.map((p) => `${p}={${p}}`).join(", ")}` : "";
    return `${indentation}print(f"${prefix} ${loc} → ${info.name} called${pyParams}") ${MARKER_PY}\n`;
  }

  if (languageId === "go") {
    if (info.params.length > 0) {
      const fmtStr = info.params.map((p) => `${p}=%v`).join(" ");
      return `${indentation}fmt.Printf("${prefix} ${loc} → ${info.name} called ${fmtStr}\\n", ${info.params.join(", ")}) ${MARKER_JS}\n`;
    }
    return `${indentation}fmt.Println("${prefix} ${loc} → ${info.name} called") ${MARKER_JS}\n`;
  }

  if (languageId === "php") {
    const phpParams = info.params.length > 0
      ? ` . json_encode([${info.params.map((p) => `'${p}' => $${p}`).join(", ")}])`
      : "";
    return `${indentation}echo "${prefix} ${loc} → ${info.name} called"${phpParams} . "\\n"; ${MARKER_JS}\n`;
  }

  if (languageId === "dart") {
    const dartParams = info.params.length > 0 ? ` ${info.params.map((p) => `${p}=\$${p}`).join(", ")}` : "";
    return `${indentation}debugPrint('${prefix} ${loc} → ${info.name} called${dartParams}'); ${MARKER_JS}\n`;
  }

  if (languageId === "ruby") {
    const rubyParams = info.params.length > 0 ? ` #{${info.params.map((p) => `"${p}=\#{${p}}"`).join(', ')}.join(', ')}` : "";
    return `${indentation}puts "${prefix} ${loc} → ${info.name} called${rubyParams}" ${MARKER_PY}\n`;
  }

  if (languageId === "rust") {
    if (info.params.length > 0) {
      const fmtStr = info.params.map((p) => `${p}={:?}`).join(", ");
      return `${indentation}println!("${prefix} ${loc} → ${info.name} called ${fmtStr}", ${info.params.join(", ")}); ${MARKER_JS}\n`;
    }
    return `${indentation}println!("${prefix} ${loc} → ${info.name} called"); ${MARKER_JS}\n`;
  }

  return "";
}
