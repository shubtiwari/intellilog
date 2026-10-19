import * as vscode from "vscode";
import * as path from "path";
import { providerRegistry } from "./providers/registry";
import { ImportEdit, IntelliLogConfig, LanguageProvider } from "./providers/types";
import { commentLine, findLogBlocks, LogBlock, uncommentLine } from "./logBlocks";
import { collectSignature, findBodyInsertion } from "./functionWrap";

interface LogRequest {
  selectedText: string;
  hoverText: string;
  indentation: string;
  /** 0-based line the log is inserted after. */
  afterLine: number;
}

const REFRESH_DELAY_MS = 150;

export function activate(context: vscode.ExtensionContext) {

  // ─── Gutter Decorations & Status Bar ───────────────────────────────────────

  const gutterDecorationType = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.joinPath(context.extensionUri, "resources", "gutter-icon.svg"),
    gutterIconSize: "contain",
  });

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "intellilog.showQuickActions";
  statusBarItem.tooltip = "IntelliLog logs in this file — click to manage";

  /** Scans the document once and updates every visible editor showing it plus the status bar. */
  function refresh(document: vscode.TextDocument) {
    const blocks = findDocumentLogBlocks(document);
    const ranges = blocks.map((b) => new vscode.Range(b.start, 0, b.start, 0));
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document === document) { editor.setDecorations(gutterDecorationType, ranges); }
    }
    if (vscode.window.activeTextEditor?.document === document) {
      const count = blocks.filter((b) => !b.isImport).length;
      if (count > 0) {
        statusBarItem.text = `🎯 ${count} log${count === 1 ? "" : "s"}`;
        statusBarItem.show();
      } else {
        statusBarItem.hide();
      }
    }
  }

  const pendingRefreshes = new Map<string, ReturnType<typeof setTimeout>>();
  function scheduleRefresh(document: vscode.TextDocument) {
    const key = document.uri.toString();
    clearTimeout(pendingRefreshes.get(key));
    pendingRefreshes.set(key, setTimeout(() => {
      pendingRefreshes.delete(key);
      refresh(document);
    }, REFRESH_DELAY_MS));
  }

  function refreshVisibleEditors() {
    new Set(vscode.window.visibleTextEditors.map((e) => e.document)).forEach(refresh);
    if (!vscode.window.activeTextEditor) { statusBarItem.hide(); }
  }

  refreshVisibleEditors();

  // ─── Event Listeners ───────────────────────────────────────────────────────

  context.subscriptions.push(
    gutterDecorationType,
    statusBarItem,
    { dispose: () => pendingRefreshes.forEach((timer) => clearTimeout(timer)) },

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) { refresh(editor.document); } else { statusBarItem.hide(); }
    }),

    vscode.window.onDidChangeVisibleTextEditors(refreshVisibleEditors),

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (vscode.window.visibleTextEditors.some((e) => e.document === event.document)) {
        scheduleRefresh(event.document);
      }
    }),

    // ─── Commands ─────────────────────────────────────────────────────────────

    vscode.commands.registerCommand("intellilog.showQuickActions", () => {
      vscode.commands.executeCommand("workbench.action.quickOpen", ">IntelliLog");
    }),

    vscode.commands.registerCommand("intellilog.smartLog", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }
      const provider = getProviderOrWarn(editor.document);
      if (!provider) { return; }

      const document = editor.document;
      const requests = (await Promise.all(
        editor.selections.filter((s) => !s.isEmpty).map((s) => buildLogRequest(editor, s, provider)),
      )).sort((a, b) => a.afterLine - b.afterLine);

      if (requests.length === 0) {
        vscode.window.showWarningMessage("IntelliLog: Please select a variable first!");
        return;
      }

      const config = fetchIntelliLogConfig();
      const fileName = path.basename(document.fileName);
      const documentText = document.getText();
      const build = (r: LogRequest, lineNumber: number) =>
        provider.buildLogStatement(r.selectedText, r.hoverText, r.indentation, config, fileName, lineNumber, documentText);

      // First pass only decides which imports are needed; the second pass computes each
      // label's final line number, accounting for imports and logs inserted above it.
      const imports = provider.getImportEdits?.(documentText, requests.map((r) => build(r, 0)).join("")) ?? [];
      const inserts: ImportEdit[] = [];
      for (const r of requests) {
        const linesAbove = countLinesInsertedBefore(imports, r.afterLine) + countLinesInsertedBefore(inserts, r.afterLine);
        inserts.push({ line: r.afterLine + 1, text: build(r, r.afterLine + 1 + linesAbove) });
      }

      await applyInserts(editor, [...imports, ...inserts]);
      refresh(document);
    }),

    vscode.commands.registerCommand("intellilog.wrapFunction", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }
      const provider = getProviderOrWarn(editor.document);
      if (!provider) { return; }

      const document = editor.document;
      const lines = documentLines(document);
      const startLine = editor.selection.active.line;
      const signature = collectSignature(lines, startLine, provider.bodyStyle, provider.commentToken, provider.quotes);
      const info = signature.ok ? provider.parseFunction(signature.text) : null;

      if (!signature.ok && signature.reason === "no-block-body") {
        vscode.window.showWarningMessage("IntelliLog: This function has no multi-line body to insert a log into.");
        return;
      }
      if (!signature.ok || !info) {
        vscode.window.showWarningMessage("IntelliLog: No function detected on this line. Place your cursor on the first line of a function definition.");
        return;
      }

      const signatureIndentation = indentationOf(lines[startLine]);
      const { insertLine, bodyIndentation } = findBodyInsertion(lines, signature.endLine, provider.bodyStyle, signatureIndentation);
      const indentation = bodyIndentation ?? signatureIndentation + indentUnit(editor);

      const config = fetchIntelliLogConfig();
      const fileName = path.basename(document.fileName);
      const documentText = document.getText();
      const build = (lineNumber: number) =>
        provider.buildFunctionEntryLog(info, indentation, config, fileName, lineNumber, documentText);

      const imports = provider.getImportEdits?.(documentText, build(0)) ?? [];
      const entryLog = build(startLine + 1 + countLinesInsertedBefore(imports, startLine));

      await applyInserts(editor, [...imports, { line: insertLine, text: entryLog }]);
      refresh(document);
    }),

    vscode.commands.registerCommand("intellilog.commentAllLogs", async () => {
      const editor = vscode.window.activeTextEditor;
      const provider = editor && getProviderOrWarn(editor.document);
      if (!editor || !provider) { return; }

      const blocks = findDocumentLogBlocks(editor.document).filter((b) => !b.commented);
      await replaceBlockLines(editor, blocks, (line) => commentLine(line, provider.commentToken));
      refresh(editor.document);
      vscode.window.showInformationMessage(`IntelliLog: Commented ${countStatements(blocks)} log statement(s).`);
    }),

    vscode.commands.registerCommand("intellilog.uncommentAllLogs", async () => {
      const editor = vscode.window.activeTextEditor;
      const provider = editor && getProviderOrWarn(editor.document);
      if (!editor || !provider) { return; }

      const blocks = findDocumentLogBlocks(editor.document).filter((b) => b.commented);
      await replaceBlockLines(editor, blocks, (line) => uncommentLine(line, provider.commentToken));
      refresh(editor.document);
      vscode.window.showInformationMessage(`IntelliLog: Uncommented ${countStatements(blocks)} log statement(s).`);
    }),

    vscode.commands.registerCommand("intellilog.deleteAllLogs", async () => {
      const editor = vscode.window.activeTextEditor;
      const provider = editor && getProviderOrWarn(editor.document);
      if (!editor || !provider) { return; }

      const document = editor.document;
      const blocks = findDocumentLogBlocks(document);
      await editor.edit((editBuilder) => {
        for (const span of mergeAdjacent(blocks)) { editBuilder.delete(fullLinesRange(document, span.start, span.end)); }
      });
      refresh(document);
      vscode.window.showInformationMessage(`IntelliLog: Deleted ${countStatements(blocks)} log statement(s).`);
    }),
  );
}

export function deactivate() {}

// ─── Config ────────────────────────────────────────────────────────────────────

function fetchIntelliLogConfig(): IntelliLogConfig {
  const cfg = vscode.workspace.getConfiguration("intellilog");
  // `insertColon` replaces the misleadingly named `insertArrow`; honour the old
  // setting until the user sets the new one.
  const colon = cfg.inspect<boolean>("insertColon");
  const explicitColon = colon?.workspaceFolderValue ?? colon?.workspaceValue ?? colon?.globalValue;
  const insertColon = explicitColon ?? cfg.get<boolean>("insertArrow", true);
  return {
    prefix: cfg.get<string>("logPrefix", "🎯"),
    suffix: insertColon ? ":" : "",
    structuredOutput: cfg.get<boolean>("structuredOutput", false),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getProviderOrWarn(document: vscode.TextDocument): LanguageProvider | undefined {
  const provider = providerRegistry.getProviderForLanguage(document.languageId);
  if (!provider) {
    vscode.window.showWarningMessage(`IntelliLog: Language '${document.languageId}' is not supported yet!`);
  }
  return provider;
}

function documentLines(document: vscode.TextDocument): string[] {
  return Array.from({ length: document.lineCount }, (_, i) => document.lineAt(i).text);
}

function findDocumentLogBlocks(document: vscode.TextDocument): LogBlock[] {
  const provider = providerRegistry.getProviderForLanguage(document.languageId);
  return provider ? findLogBlocks(documentLines(document), provider.commentToken, provider.quotes) : [];
}

function countStatements(blocks: LogBlock[]): number {
  return blocks.filter((b) => !b.isImport).length;
}

function indentationOf(line: string): string {
  return line.match(/^\s*/)?.[0] ?? "";
}

function indentUnit(editor: vscode.TextEditor): string {
  return editor.options.insertSpaces === false ? "\t" : " ".repeat(Number(editor.options.tabSize) || 2);
}

function countLinesInsertedBefore(edits: ImportEdit[], line: number): number {
  return edits.filter((e) => e.line <= line).reduce((sum, e) => sum + e.text.split("\n").length - 1, 0);
}

async function fetchHoverDetails(document: vscode.TextDocument, position: vscode.Position): Promise<string> {
  try {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>("vscode.executeHoverProvider", document.uri, position);
    if (!hovers || hovers.length === 0) { return ""; }
    return hovers.map((h) => h.contents.map((c) => typeof c === "string" ? c : (c as vscode.MarkdownString).value).join("")).join("");
  } catch {
    return "";
  }
}

async function buildLogRequest(editor: vscode.TextEditor, selection: vscode.Selection, provider: LanguageProvider): Promise<LogRequest> {
  const document = editor.document;
  // A whole-line selection ends at column 0 of the following line.
  const lastLine = selection.end.character === 0 && selection.end.line > selection.start.line
    ? selection.end.line - 1
    : selection.end.line;

  const startText = document.lineAt(selection.start.line).text;
  let indentation = indentationOf(startText);
  // Selected inside a block header (`if x:` / `for (…) {`) — the log belongs inside the block.
  const lastText = document.lineAt(lastLine).text.trimEnd();
  const opensBlock = provider.bodyStyle === "colon" ? /:\s*(#.*)?$/.test(lastText) : /\{$/.test(lastText);
  if (opensBlock) { indentation += indentUnit(editor); }

  return {
    selectedText: document.getText(selection),
    hoverText: await fetchHoverDetails(document, selection.active),
    indentation,
    afterLine: lastLine,
  };
}

/** Inserts each edit's text before its line, merging edits that target the same line. */
async function applyInserts(editor: vscode.TextEditor, edits: ImportEdit[]) {
  const document = editor.document;
  const byLine = new Map<number, string>();
  for (const e of edits) { byLine.set(e.line, (byLine.get(e.line) ?? "") + e.text); }

  await editor.edit((editBuilder) => {
    for (const [line, text] of byLine) {
      if (line < document.lineCount) {
        editBuilder.insert(new vscode.Position(line, 0), text);
      } else {
        // Past the last line (no trailing newline): start a new line instead of
        // appending to the existing one.
        const end = document.lineAt(document.lineCount - 1).range.end;
        editBuilder.insert(end, "\n" + text.replace(/\n$/, ""));
      }
    }
  });
}

async function replaceBlockLines(editor: vscode.TextEditor, blocks: LogBlock[], transform: (line: string) => string) {
  await editor.edit((editBuilder) => {
    for (const block of blocks) {
      for (let i = block.start; i <= block.end; i++) {
        const line = editor.document.lineAt(i);
        editBuilder.replace(line.range, transform(line.text));
      }
    }
  });
}

/** Merges blocks on consecutive lines so their deletion ranges can't overlap. */
function mergeAdjacent(blocks: LogBlock[]): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  for (const b of blocks) {
    const last = spans[spans.length - 1];
    if (last && b.start <= last.end + 1) { last.end = b.end; } else { spans.push({ start: b.start, end: b.end }); }
  }
  return spans;
}

/** Range covering whole lines `start..end`, including one line break so no blank line is left. */
function fullLinesRange(document: vscode.TextDocument, start: number, end: number): vscode.Range {
  if (end + 1 < document.lineCount) {
    return new vscode.Range(start, 0, end + 1, 0);
  }
  const endPosition = document.lineAt(end).range.end;
  if (start > 0) {
    return new vscode.Range(document.lineAt(start - 1).range.end, endPosition);
  }
  return new vscode.Range(new vscode.Position(start, 0), endPosition);
}
