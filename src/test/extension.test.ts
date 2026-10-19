import * as assert from "assert";
import * as vscode from "vscode";

async function openEditor(content: string, language: string): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  return vscode.window.showTextDocument(doc);
}

async function select(editor: vscode.TextEditor, line: number, startChar: number, endChar: number) {
  editor.selection = new vscode.Selection(line, startChar, line, endChar);
}

suite("IntelliLog Integration Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Smart Log Heuristics Test", async () => {
    const editor = await openEditor(`const myError = new Error();\nconst stackTrace = [];\nconst myObj = {};\n`, "javascript");

    const testLog = async (line: number, startChar: number, endChar: number) => {
      await select(editor, line, startChar, endChar);
      await vscode.commands.executeCommand("intellilog.smartLog");
      return editor.document.lineAt(line + 1).text;
    };

    // Each inserted log shifts the following declarations down by one line.
    assert.ok((await testLog(0, 6, 13)).includes("console.error("), "variables named *Error use console.error");
    assert.ok((await testLog(2, 6, 16)).includes("console.trace("), "variables named *Trace use console.trace");
    const dirLine = await testLog(4, 6, 11);
    assert.ok(dirLine.includes("console.dir(myObj"), "variables named *Obj use console.dir");
    assert.ok(dirLine.startsWith("console.log("), "console.dir gets its label from a separate console.log");
  });

  test("inserting after the last line without a trailing newline starts a new line", async () => {
    const editor = await openEditor("const value = 1;", "javascript");
    await select(editor, 0, 6, 11);
    await vscode.commands.executeCommand("intellilog.smartLog");
    assert.strictEqual(editor.document.lineCount, 2);
    assert.strictEqual(editor.document.lineAt(0).text, "const value = 1;");
    assert.ok(editor.document.lineAt(1).text.startsWith("console.log("));
  });

  test("wrap function inserts an entry log inside a multi-line signature's body", async () => {
    const editor = await openEditor("function pay(\n  userId,\n  amount,\n) {\n  return amount;\n}\n", "javascript");
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    await vscode.commands.executeCommand("intellilog.wrapFunction");
    const entry = editor.document.lineAt(4).text;
    assert.ok(entry.startsWith("  console.log('🎯 ["), entry);
    assert.ok(entry.endsWith(":1] → pay called', { userId, amount }); // intellilog"), entry);
    assert.strictEqual(editor.document.lineAt(5).text, "  return amount;");
  });

  test("wrap function in Python indents correctly when the next line is blank", async () => {
    const editor = await openEditor("def f(x):\n\n    return x\n", "python");
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    await vscode.commands.executeCommand("intellilog.wrapFunction");
    assert.ok(editor.document.lineAt(1).text.startsWith("    print(f\""), editor.document.lineAt(1).text);
  });

  test("delete all logs removes formatter-wrapped statements entirely", async () => {
    const editor = await openEditor("a();\nconsole.log(\n  'label',\n  value,\n); // intellilog\nb();\n", "javascript");
    await vscode.commands.executeCommand("intellilog.deleteAllLogs");
    assert.strictEqual(editor.document.getText(), "a();\nb();\n");
  });

  test("comment then uncomment restores the original text", async () => {
    const original = "if (x) {\n  console.log('x', x); // intellilog\n}\n";
    const editor = await openEditor(original, "javascript");
    await vscode.commands.executeCommand("intellilog.commentAllLogs");
    assert.strictEqual(editor.document.lineAt(1).text, "  // console.log('x', x); // intellilog");
    await vscode.commands.executeCommand("intellilog.uncommentAllLogs");
    assert.strictEqual(editor.document.getText(), original);
  });

  test("Go logs add their import, and delete all removes it again", async () => {
    const original = "package main\n\nfunc main() {\n\tcount := 1\n}\n";
    const editor = await openEditor(original, "go");
    await select(editor, 3, 1, 6);
    await vscode.commands.executeCommand("intellilog.smartLog");
    assert.strictEqual(editor.document.lineAt(1).text, 'import "fmt" // intellilog');
    await vscode.commands.executeCommand("intellilog.deleteAllLogs");
    assert.strictEqual(editor.document.getText(), original);
  });
});
