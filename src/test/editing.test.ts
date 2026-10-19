import * as assert from "assert";
import { commentLine, findLogBlocks, uncommentLine } from "../logBlocks";
import { collectSignature, findBodyInsertion } from "../functionWrap";
import { nameTokens, splitTopLevel, splitVariables, IDENTIFIER_PATH } from "../providers/utils";

suite("Utils Unit Tests", () => {
  test("nameTokens splits camelCase, snake_case and acronyms", () => {
    assert.deepStrictEqual(nameTokens("userDataJSON.stack_trace"), ["user", "data", "json", "stack", "trace"]);
    assert.deepStrictEqual(nameTokens("country"), ["country"]);
  });

  test("splitTopLevel ignores nested and quoted commas", () => {
    assert.deepStrictEqual(splitTopLevel(`a, fn(b, c), "d,e", [f, g]`), ["a", "fn(b, c)", `"d,e"`, "[f, g]"]);
    assert.deepStrictEqual(splitTopLevel("Map<String, int> m, int n", ",", { angles: true }), ["Map<String, int> m", "int n"]);
  });

  test("splitVariables only accepts simple names", () => {
    assert.deepStrictEqual(splitVariables("a, b.c", IDENTIFIER_PATH), ["a", "b.c"]);
    assert.strictEqual(splitVariables("[1, 2]", IDENTIFIER_PATH), null);
    assert.strictEqual(splitVariables("a, b + 1", IDENTIFIER_PATH), null);
  });
});

suite("Log Blocks Unit Tests", () => {
  test("single-line logs", () => {
    const lines = ["const a = 1;", "console.log('x', a); // intellilog", "foo();"];
    assert.deepStrictEqual(findLogBlocks(lines, "//"), [{ start: 1, end: 1, commented: false, isImport: false }]);
  });

  test("formatter-wrapped logs are found as one block", () => {
    const lines = [
      "function f() {",
      "  console.log(",
      "    '🎯 [a.ts:2] user (x):',",
      "    { user, items },",
      "  ); // intellilog",
      "}",
    ];
    assert.deepStrictEqual(findLogBlocks(lines, "//"), [{ start: 1, end: 4, commented: false, isImport: false }]);
  });

  test("black-wrapped python logs", () => {
    const lines = ["print(", '    f"🎯 [a.py:1] value: {value}"', ")  # intellilog"];
    assert.deepStrictEqual(findLogBlocks(lines, "#"), [{ start: 0, end: 2, commented: false, isImport: false }]);
  });

  test("commented multi-line blocks", () => {
    const lines = ["// console.log(", "//   'x', a", "// ); // intellilog"];
    assert.deepStrictEqual(findLogBlocks(lines, "//"), [{ start: 0, end: 2, commented: true, isImport: false }]);
  });

  test("import lines are flagged", () => {
    const lines = ["package main", 'import "fmt" // intellilog'];
    assert.strictEqual(findLogBlocks(lines, "//")[0].isImport, true);
  });

  test("blocks never extend into a previous block", () => {
    const lines = ["console.log('(', a); // intellilog", "console.log(')', b); // intellilog"];
    assert.strictEqual(findLogBlocks(lines, "//").length, 2);
    assert.deepStrictEqual(findLogBlocks(lines, "//").map((b) => b.start), [0, 1]);
  });

  test("comment / uncomment round-trip", () => {
    const line = "    console.log('x', x); // intellilog";
    const commented = commentLine(line, "//");
    assert.strictEqual(commented, "    // console.log('x', x); // intellilog");
    assert.strictEqual(uncommentLine(commented, "//"), line);
  });
});

suite("Function Wrap Unit Tests", () => {
  test("single-line JS signature", () => {
    const r = collectSignature(["function add(a, b) {", "  return a + b;", "}"], 0, "brace", "//");
    assert.deepStrictEqual(r, { ok: true, text: "function add(a, b)", endLine: 0 });
  });

  test("multi-line signature with brace on its own line", () => {
    const lines = ["public function save(", "    int $id,", "    string $name", "): bool", "{", "    return true;", "}"];
    const r = collectSignature(lines, 0, "brace", "//");
    assert.deepStrictEqual(r, { ok: true, text: "public function save( int $id, string $name ): bool", endLine: 4 });
  });

  test("expression-bodied and single-line bodies are rejected", () => {
    assert.deepStrictEqual(collectSignature(["const f = (a) => a + 1;"], 0, "brace", "//"), { ok: false, reason: "no-block-body" });
    assert.deepStrictEqual(collectSignature(["function f(a) { return a; }"], 0, "brace", "//"), { ok: false, reason: "no-block-body" });
    assert.deepStrictEqual(collectSignature(["def f(x): return x"], 0, "colon", "#"), { ok: false, reason: "no-block-body" });
    assert.deepStrictEqual(collectSignature(["def f(x) = x + 1"], 0, "line", "#"), { ok: false, reason: "no-block-body" });
  });

  test("calls are not mistaken for functions", () => {
    assert.strictEqual(collectSignature(["doThing(a, b);"], 0, "brace", "//").ok, false);
    assert.strictEqual(collectSignature(["useEffect(() => {", "  run();", "}, []);"], 0, "brace", "//").ok, false);
  });

  test("python signature with type hints and trailing comment", () => {
    const r = collectSignature(["def f(a: Dict[str, int],", "      b=1) -> None:  # entry", "    pass"], 0, "colon", "#");
    assert.deepStrictEqual(r, { ok: true, text: "def f(a: Dict[str, int], b=1) -> None", endLine: 1 });
  });

  test("ruby signature ignores trailing comments", () => {
    const r = collectSignature(["def greet(name) # say hi; politely", "  name", "end"], 0, "line", "#");
    assert.deepStrictEqual(r, { ok: true, text: "def greet(name)", endLine: 0 });
  });

  test("body indentation falls back when the next line is blank or closing", () => {
    assert.deepStrictEqual(findBodyInsertion(["def f(x):", "", "    return x"], 0, "colon", ""), { insertLine: 1, bodyIndentation: "    " });
    assert.deepStrictEqual(findBodyInsertion(["function f() {", "}"], 0, "brace", ""), { insertLine: 1, bodyIndentation: null });
  });

  test("python entry log goes after the docstring", () => {
    const lines = ["def f(x):", '    """Doc', '    more."""', "    return x"];
    assert.deepStrictEqual(findBodyInsertion(lines, 0, "colon", ""), { insertLine: 3, bodyIndentation: "    " });
    assert.deepStrictEqual(findBodyInsertion(["def f(x):", '    """One line."""', "    return x"], 0, "colon", ""), { insertLine: 2, bodyIndentation: "    " });
  });
});
