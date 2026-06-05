import * as assert from "assert";
import * as vscode from "vscode";

suite("IntelliLog Smart Log Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Smart Log Heuristics Test", async () => {
    // 1. Create a new document with some dummy text
    const doc = await vscode.workspace.openTextDocument({
      content: `const myError = new Error();\nconst stackTrace = [];\nconst myObj = {};\n`,
      language: "javascript",
    });
    const editor = await vscode.window.showTextDocument(doc);

    // Helper to select a line and execute command
    const testLog = async (line: number, startChar: number, endChar: number) => {
      editor.selection = new vscode.Selection(line, startChar, line, endChar);
      await vscode.commands.executeCommand("intellilog.smartLog");
      // Wait for extension to insert text
      await new Promise((resolve) => setTimeout(resolve, 200));
      return editor.document.lineAt(line + 1).text;
    };

    // Test 1: error -> console.error
    // Select "myError"
    let inserted = await testLog(0, 6, 13);
    assert.ok(inserted.includes("console.error("), "Should use console.error for variables with 'error'");

    // Test 2: stack/trace -> console.trace
    // Select "stackTrace"
    inserted = await testLog(2, 6, 16); // wait, line 2 because line 1 is the new console.error inserted
    assert.ok(inserted.includes("console.trace("), "Should use console.trace for variables with 'stack'");

    // Test 3: obj -> console.dir
    // Select "myObj" (now on line 4)
    inserted = await testLog(4, 6, 11);
    assert.ok(inserted.includes("console.dir("), "Should use console.dir for variables with 'obj'");
  });
});
