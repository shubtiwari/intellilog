import * as assert from "assert";
import { JavascriptProvider } from "../providers/javascript";
import { PythonProvider } from "../providers/python";
import { GoProvider } from "../providers/go";
import { PhpProvider } from "../providers/php";
import { DartProvider } from "../providers/dart";
import { RubyProvider } from "../providers/ruby";
import { RustProvider } from "../providers/rust";
import { IntelliLogConfig } from "../providers/types";

suite("Providers Unit Tests", () => {
  const config: IntelliLogConfig = { prefix: "🎯", suffix: ":", structuredOutput: false };
  const structuredConfig: IntelliLogConfig = { prefix: "🎯", suffix: ":", structuredOutput: true };
  const hover = "";
  const ind = "";
  const file = "test.ts";
  const line = 42;

  suite("JavascriptProvider", () => {
    const p = new JavascriptProvider();
    const log = (text: string, cfg = config, hoverText = hover) => p.buildLogStatement(text, hoverText, ind, cfg, file, line);

    test("default console.log", () => {
      const r = log("myVar");
      assert.ok(r.includes("console.log('🎯 [test.ts:42] myVar:', myVar)"));
      assert.ok(r.includes("// intellilog"));
    });

    test("console.error for errors", () => {
      assert.ok(log("myError").includes("console.error('🎯 [test.ts:42] myError:', myError)"));
    });

    test("console.table prints the label separately (table only prints its first argument)", () => {
      const r = log("[1, 2, 3]");
      assert.ok(r.includes("console.log('🎯 [test.ts:42] 1, 2, 3:'); console.table([1, 2, 3]);"), r);
    });

    test("console.dir prints the label separately (dir only prints its first argument)", () => {
      const r = log("myObj");
      assert.ok(r.includes("console.log('🎯 [test.ts:42] myObj:'); console.dir(myObj, { depth: null });"), r);
    });

    test("table from hover type", () => {
      assert.ok(log("users", config, "const users: User[]").includes("console.table(users)"));
    });

    test("names are matched by whole words, not substrings", () => {
      for (const name of ["country", "accountId", "createdTime", "timestamp", "groupId", "referrer", "deferred", "objective"]) {
        assert.ok(log(name).includes(`console.log('🎯 [test.ts:42] ${name}:', ${name})`), `${name} → ${log(name)}`);
      }
    });

    test("never emits methods that drop the value", () => {
      for (const name of ["retryCount", "perfTime", "userGroup", "renderTimeLog", "groupEnd"]) {
        const r = log(name);
        assert.ok(!/console\.(count|time|timeEnd|timeLog|group|groupEnd)\(/.test(r), `${name} → ${r}`);
        assert.ok(r.includes(`, ${name})`), `${name} → ${r}`);
      }
    });

    test("quotes in the selection are escaped in the label", () => {
      const r = log("row['a']");
      assert.ok(r.includes(String.raw`console.log('🎯 [test.ts:42] row[\'a\']:', row['a'])`), r);
    });

    test("multi-variable log", () => {
      assert.ok(log("userId, email, role").includes("console.log('🎯 [test.ts:42] userId, email, role:', { userId, email, role })"));
    });

    test("multi-variable log with member paths uses explicit keys", () => {
      assert.ok(log("user.id, email").includes("{ 'user.id': user.id, email }"));
    });

    test("commas inside calls/literals are not multi-variable", () => {
      assert.ok(log("fn(a, b)").includes("console.log('🎯 [test.ts:42] fn(a, b):', fn(a, b))"));
      assert.ok(log("{ a: 1, b: 2 }").includes("console.table({ a: 1, b: 2 })") === false);
    });

    test("structured JSON output", () => {
      const r = log("userData", structuredConfig);
      assert.ok(r.includes("console.log(JSON.stringify({ _src: '[test.ts:42]', 'userData': userData }, null, 2))"), r);
    });

    test("structured output never uses non-printing methods", () => {
      for (const name of ["createdTime", "myObj", "users", "stackTrace"]) {
        assert.ok(log(name, structuredConfig).startsWith("console.log(JSON.stringify("), name);
      }
      assert.ok(log("myError", structuredConfig).includes("console.error(JSON.stringify({ _src: '[test.ts:42]', _level: 'error'"));
    });

    test("parseFunction handles declarations, arrows, methods and generics", () => {
      assert.deepStrictEqual(p.parseFunction("export async function load<T extends Array<U>>(id: string, opts = {}) "), { name: "load", params: ["id", "opts"] });
      assert.deepStrictEqual(p.parseFunction("const handler = async (req, res) =>"), { name: "handler", params: ["req", "res"] });
      assert.deepStrictEqual(p.parseFunction("const double = x =>"), { name: "double", params: ["x"] });
      assert.deepStrictEqual(p.parseFunction("async fetchUser(id: number): Promise<User> "), { name: "fetchUser", params: ["id"] });
      assert.deepStrictEqual(p.parseFunction("private handleClick = (e: MouseEvent) =>"), { name: "handleClick", params: ["e"] });
      assert.deepStrictEqual(p.parseFunction("function Card({ title, user: { name }, ...rest }: Props) "), { name: "Card", params: ["title", "name", "rest"] });
      assert.strictEqual(p.parseFunction("if (ready) "), null);
    });

    test("function entry log", () => {
      const r = p.buildFunctionEntryLog({ name: "pay", params: ["userId", "amount"] }, "  ", config, file, 10);
      assert.strictEqual(r, "  console.log('🎯 [test.ts:10] → pay called', { userId, amount }); // intellilog\n");
    });
  });

  suite("PythonProvider", () => {
    const p = new PythonProvider();
    const log = (text: string, cfg = config) => p.buildLogStatement(text, hover, ind, cfg, "test.py", line);

    test("default f-string print", () => {
      const r = log("myVar");
      assert.ok(r.includes('print(f"🎯 [test.py:42] myVar: {myVar}")'));
      assert.ok(r.includes("# intellilog"));
    });

    test("expressions with quotes avoid f-strings", () => {
      assert.ok(log('cfg["key"]').includes(String.raw`print("🎯 [test.py:42] cfg[\"key\"]:", cfg["key"])`));
    });

    test("pprint for lists/dicts", () => {
      assert.ok(log("users").includes("pprint.pprint(users)"));
    });

    test("type inspection", () => {
      assert.ok(log("checkType").includes("type(checkType)"));
      assert.ok(!log("prototype_check").includes("type("), "substring 'type' must not trigger");
    });

    test("exceptions print the value and its own traceback", () => {
      const r = log("myException");
      assert.ok(r.includes("repr(myException)"));
      assert.ok(r.includes("isinstance(myException, BaseException) and traceback.print_exception(type(myException), myException, myException.__traceback__)"));
    });

    test("multi-variable log", () => {
      const r = log("user_id, email, role");
      assert.ok(r.includes("{user_id=}"));
      assert.ok(r.includes("{email=}"));
    });

    test("parseFunction", () => {
      assert.deepStrictEqual(
        p.parseFunction("async def fetch(self, url: str, *args, timeout: Dict[str, int] = None, **kwargs) -> Response"),
        { name: "fetch", params: ["url", "args", "timeout", "kwargs"] },
      );
    });

    test("function entry log", () => {
      const r = p.buildFunctionEntryLog({ name: "fetch", params: ["url"] }, "    ", config, "test.py", 3);
      assert.strictEqual(r, '    print(f"🎯 [test.py:3] → fetch called | url={url!r}") # intellilog\n');
    });
  });

  suite("GoProvider", () => {
    const p = new GoProvider();
    const log = (text: string, hoverText = hover) => p.buildLogStatement(text, hoverText, ind, config, "main.go", line);

    test("default fmt.Printf", () => {
      assert.ok(log("myVar").includes('fmt.Printf("🎯 [main.go:42] myVar: %v\\n", myVar)'));
    });

    test("%+v for structs", () => {
      assert.ok(log("userData").includes("%+v"));
    });

    test("error logging", () => {
      assert.ok(log("myErr").includes("log.Printf"));
      assert.ok(!log("referrer").includes("log.Printf"));
    });

    test("JSON logging can be repeated in one scope", () => {
      const r = log("payload");
      assert.ok(r.includes('func() string { b, _ := json.MarshalIndent(payload, "", "  "); return string(b) }()'), r);
      assert.ok(!r.trimStart().startsWith("b, _ :="));
    });

    test("percent signs in the label are escaped", () => {
      const r = p.buildLogStatement("rate", hover, ind, { ...config, prefix: "100%" }, "main.go", line);
      assert.ok(r.includes('fmt.Printf("100%% [main.go:42] rate: %v\\n", rate)'), r);
    });

    test("multi-variable log", () => {
      const r = log("userId, email");
      assert.ok(r.includes("userId=%v"));
      assert.ok(r.includes("email=%v"));
    });

    test("adds missing imports after the package clause", () => {
      const doc = 'package main\n\nimport (\n\t"os"\n)\n';
      assert.deepStrictEqual(p.getImportEdits(doc, 'log.Printf("x") fmt.Printf("y") json.MarshalIndent(z)'), [
        { line: 1, text: 'import "fmt" // intellilog\n' },
        { line: 1, text: 'import "log" // intellilog\n' },
        { line: 1, text: 'import "encoding/json" // intellilog\n' },
      ]);
      assert.deepStrictEqual(p.getImportEdits('package main\nimport (\n\t"fmt"\n)\n', 'fmt.Printf("y")'), []);
    });

    test("parseFunction", () => {
      assert.deepStrictEqual(p.parseFunction("func (s *Server) Handle(ctx context.Context, a, b int, opts ...Option) error"), { name: "Handle", params: ["ctx", "a", "b", "opts"] });
      assert.deepStrictEqual(p.parseFunction("func Map[T any](xs []T, f func(T) T) []T"), { name: "Map", params: ["xs", "f"] });
      assert.deepStrictEqual(p.parseFunction("func handler(int, string)"), { name: "handler", params: [] });
    });
  });

  suite("PhpProvider", () => {
    const p = new PhpProvider();
    const log = (text: string) => p.buildLogStatement(text, hover, ind, config, "index.php", line);

    test("default echo with var_export", () => {
      assert.ok(log("$myValue").includes(`echo '🎯 [index.php:42] myValue: ' . var_export($myValue, true) . "\\n";`));
    });

    test("print_r for arrays", () => {
      assert.ok(log("$usersList").includes("print_r($usersList, true)"));
    });

    test("error_log for errors", () => {
      assert.ok(log("$dbError").includes("error_log("));
      assert.ok(log("$e").includes("error_log("));
    });

    test("never inserts die()/exit", () => {
      for (const name of ["$audience", "$exitCode", "$diet", "$dieRoll"]) {
        assert.ok(!/\b(die|exit)\(/.test(log(name)), name);
      }
    });

    test("labels are single-quoted so $ is not interpolated", () => {
      assert.ok(log("$a, $b").includes(`echo '🎯 [index.php:42] a, b: ' . print_r(['a' => $a, 'b' => $b], true) . "\\n";`));
    });

    test("parseFunction strips types and $ from params", () => {
      assert.deepStrictEqual(
        p.parseFunction("public function save(int $id, ?User &$user = null, string ...$tags): bool"),
        { name: "save", params: ["id", "user", "tags"] },
      );
    });

    test("function entry log uses plain variables", () => {
      const r = p.buildFunctionEntryLog({ name: "save", params: ["id", "user"] }, "    ", config, "index.php", 5);
      assert.strictEqual(r, `    echo '🎯 [index.php:5] → save called ' . json_encode(['id' => $id, 'user' => $user]) . "\\n"; // intellilog\n`);
    });
  });

  suite("DartProvider", () => {
    const p = new DartProvider();
    const flutterDoc = "import 'package:flutter/material.dart';\n";
    const log = (text: string, doc = flutterDoc) => p.buildLogStatement(text, hover, ind, config, "main.dart", line, doc);

    test("default debugPrint in Flutter files", () => {
      const r = log("myVar");
      assert.ok(r.includes("debugPrint('🎯 [main.dart:42] myVar: ${myVar}');"), r);
      assert.ok(r.includes("// intellilog"));
    });

    test("print in plain Dart files", () => {
      assert.ok(log("myVar", "void main() {}\n").startsWith("print("));
    });

    test("member expressions are fully interpolated", () => {
      assert.ok(log("user.name").includes("${user.name}"));
    });

    test("multi-variable log", () => {
      const r = log("userId, email");
      assert.ok(r.includes("userId: ${userId}"));
      assert.ok(r.includes("email: ${email}"));
    });

    test("adds dart:convert for JSON logs", () => {
      const doc = "library app;\nimport 'package:flutter/material.dart';\nimport 'a.dart'\n    show A;\n\nvoid main() {}\n";
      assert.deepStrictEqual(p.getImportEdits(doc, log("payload", doc)), [{ line: 4, text: "import 'dart:convert'; // intellilog\n" }]);
      assert.deepStrictEqual(p.getImportEdits("import 'dart:convert';\n", log("payload")), []);
    });

    test("parseFunction handles any return type and named params", () => {
      assert.deepStrictEqual(p.parseFunction("@override Widget build(BuildContext context)"), { name: "build", params: ["context"] });
      assert.deepStrictEqual(
        p.parseFunction("Future<Map<String, int>> load(String id, {required this.client, int retries = 3}) async"),
        { name: "load", params: ["id", "client", "retries"] },
      );
    });
  });

  suite("RubyProvider", () => {
    const p = new RubyProvider();
    const log = (text: string) => p.buildLogStatement(text, hover, ind, config, "main.rb", line);

    test("default puts with inspect", () => {
      const r = log("my_var");
      assert.ok(r.includes('puts "🎯 [main.rb:42] my_var: #{my_var.inspect}"'));
      assert.ok(r.includes("# intellilog"));
    });

    test("error logging with guarded backtrace", () => {
      assert.ok(log("myError").includes("if myError.respond_to?(:backtrace) && myError.backtrace"));
    });

    test("multi-variable log", () => {
      assert.ok(log("user_id, email").includes("user_id: #{user_id.inspect}"));
    });

    test("parseFunction", () => {
      assert.deepStrictEqual(p.parseFunction("def self.create(name, age = 1, *rest, key:, **opts, &blk)"), { name: "create", params: ["name", "age", "rest", "key", "opts", "blk"] });
      assert.deepStrictEqual(p.parseFunction("def greet name, greeting"), { name: "greet", params: ["name", "greeting"] });
    });

    test("function entry log is valid Ruby", () => {
      const r = p.buildFunctionEntryLog({ name: "create", params: ["a", "b"] }, "  ", config, "main.rb", 1);
      assert.strictEqual(r, '  puts "🎯 [main.rb:1] → create called | a=#{a.inspect}, b=#{b.inspect}" # intellilog\n');
    });
  });

  suite("RustProvider", () => {
    const p = new RustProvider();
    const log = (text: string) => p.buildLogStatement(text, hover, ind, config, "main.rs", line);

    test("default println! with {:?}", () => {
      const r = log("my_var");
      assert.ok(r.includes('println!("🎯 [main.rs:42] my_var: {:?}", my_var)'));
      assert.ok(r.includes("// intellilog"));
    });

    test("eprintln! for errors", () => {
      assert.ok(log("myError").includes("eprintln!"));
    });

    test("braces in the label are escaped", () => {
      assert.ok(log("map[&key]").includes('println!("🎯 [main.rs:42] map[&key]: {:?}", map[&key])'));
      const r = p.buildLogStatement("x", hover, ind, { ...config, prefix: "{dbg}" }, "main.rs", line);
      assert.ok(r.includes('println!("{{dbg}} [main.rs:42] x: {:?}", x)'), r);
    });

    test("multi-variable log", () => {
      const r = log("user_id, email");
      assert.ok(r.includes("user_id={:?}"));
      assert.ok(r.includes("email={:?}"));
    });

    test("parseFunction handles lifetimes, generics and self", () => {
      assert.deepStrictEqual(
        p.parseFunction("pub async fn parse<'a, T: Debug>(&'a mut self, input: &'a str, mut count: usize) -> Result<T, Error>"),
        { name: "parse", params: ["input", "count"] },
      );
    });
  });
});
