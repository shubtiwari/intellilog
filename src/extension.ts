import * as vscode from "vscode";
import { providerRegistry } from "./providers/registry";
import { IntelliLogConfig, LanguageProvider } from "./providers/types";

/**
 * Represents the data needed to insert a log statement for a single cursor selection.
 */
interface LogData {
  selection: vscode.Selection;
  logStatement: string;
}

/**
 * Activates the extension and registers the smartLog command.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
  let smartLog = vscode.commands.registerCommand(
    "intellilog.smartLog",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const documentLanguage = editor.document.languageId;
      const provider = providerRegistry.getProviderForLanguage(documentLanguage);

      if (!provider) {
        vscode.window.showWarningMessage(
          `IntelliLog: Language '${documentLanguage}' is not supported yet!`
        );
        return;
      }

      const config = fetchIntelliLogConfig();

      const logDataPromises = editor.selections.map((selection) =>
        buildLogDataForSelection(editor, selection, config, provider),
      );

      const logDataList = (await Promise.all(logDataPromises)).filter(
        (data): data is NonNullable<typeof data> => data !== null,
      );

      if (logDataList.length === 0) {
        vscode.window.showWarningMessage(
          "IntelliLog: Please select a variable first!",
        );
        return;
      }

      editor.edit((editBuilder) => {
        const sortedLogDataList = logDataList.sort(
          (a, b) => b.selection.end.line - a.selection.end.line,
        );

        for (const data of sortedLogDataList) {
          const currentLine = data.selection.end.line;
          const insertPosition = new vscode.Position(currentLine + 1, 0);
          editBuilder.insert(insertPosition, data.logStatement);
        }
      });
    },
  );

  context.subscriptions.push(smartLog);
}

/**
 * Deactivates the extension. Clean up resources here if necessary.
 */
export function deactivate() {}

// --- Helper Functions ---

/**
 * Fetches the user's IntelliLog settings from the VS Code workspace configuration.
 * @returns {IntelliLogConfig} The user's configuration containing the prefix and suffix.
 */
function fetchIntelliLogConfig(): IntelliLogConfig {
  const workspaceConfig = vscode.workspace.getConfiguration("intellilog");
  const prefix = workspaceConfig.get<string>("logPrefix", "🎯");
  const insertArrow = workspaceConfig.get<boolean>("insertArrow", true);
  const useColorIcons = workspaceConfig.get<boolean>("useColorIcons", true);
  const suffix = insertArrow ? ":" : "";
  return { prefix, suffix, useColorIcons };
}

/**
 * Extracts the leading whitespace from a given line in the document to preserve indentation.
 * @param document The active text document.
 * @param lineNumber The line number to inspect.
 * @returns {string} The leading whitespace string.
 */
function getLineIndentation(
  document: vscode.TextDocument,
  lineNumber: number,
): string {
  const lineText = document.lineAt(lineNumber).text;
  const indentationMatch = lineText.match(/^\s*/);
  return indentationMatch ? indentationMatch[0] : "";
}

/**
 * Asynchronously requests hover tooltip data from VS Code for a specific position.
 * @param document The active text document.
 * @param position The position of the cursor.
 * @returns {Promise<string>} A combined string of all hover contents.
 */
async function fetchHoverDetails(
  document: vscode.TextDocument,
  position: vscode.Position,
): Promise<string> {
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    "vscode.executeHoverProvider",
    document.uri,
    position,
  );

  if (!hovers || hovers.length === 0) {
    return "";
  }

  return hovers
    .map((h) =>
      h.contents
        .map((c) =>
          typeof c === "string" ? c : (c as vscode.MarkdownString).value,
        )
        .join(""),
    )
    .join("");
}

/**
 * Processes a single cursor selection, computing all necessary data to generate a log statement.
 * @param editor The active text editor.
 * @param selection The current selection.
 * @param config The user's extension configuration.
 * @param provider The language provider for the active document.
 * @returns {Promise<LogData | null>} The processed log data, or null if the selection was empty.
 */
async function buildLogDataForSelection(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
  config: IntelliLogConfig,
  provider: LanguageProvider
): Promise<LogData | null> {
  const selectedText = editor.document.getText(selection);

  if (!selectedText) {
    return null;
  }

  const indentation = getLineIndentation(editor.document, selection.start.line);
  const hoverText = await fetchHoverDetails(editor.document, selection.active);

  const logStatement = provider.buildLogStatement(
    selectedText,
    hoverText,
    indentation,
    config
  );

  return {
    selection,
    logStatement,
  };
}
