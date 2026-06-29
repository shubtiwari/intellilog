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

    test("default console.log", () => {
      const r = p.buildLogStatement("myVar", hover, ind, config, file, line);
      assert.ok(r.includes("console.log('🎯 [test.ts:42] myVar:', myVar)"));
      assert.ok(r.includes("// intellilog"));
    });

    test("console.error for errors", () => {
      const r = p.buildLogStatement("myError", hover, ind, config, file, line);
      assert.ok(r.includes("console.error('🎯 [test.ts:42] myError:', myError)"));
    });

    test("console.table for arrays", () => {
      const r = p.buildLogStatement("[1, 2, 3]", hover, ind, config, file, line);
      assert.ok(r.includes("console.table('🎯 [test.ts:42] 1, 2, 3:', [1, 2, 3])"));
    });

    test("multi-variable log", () => {
      const r = p.buildLogStatement("userId, email, role", hover, ind, config, file, line);
      assert.ok(r.includes("console.log('🎯 [test.ts:42] userId, email, role:', { userId, email, role })"));
    });

    test("structured JSON output", () => {
      const r = p.buildLogStatement("userData", hover, ind, structuredConfig, file, line);
      assert.ok(r.includes("JSON.stringify("));
      assert.ok(r.includes("_src"));
    });
  });

  suite("PythonProvider", () => {
    const p = new PythonProvider();

    test("default f-string print", () => {
      const r = p.buildLogStatement("myVar", hover, ind, config, "test.py", line);
      assert.ok(r.includes('print(f"🎯 [test.py:42] myVar: {myVar}")'));
      assert.ok(r.includes("# intellilog"));
    });

    test("pprint for lists/dicts", () => {
      const r = p.buildLogStatement("users", hover, ind, config, "test.py", line);
      assert.ok(r.includes("pprint.pprint(users)"));
    });

    test("type inspection", () => {
      const r = p.buildLogStatement("checkType", hover, ind, config, "test.py", line);
      assert.ok(r.includes("type(checkType)"));
    });

    test("traceback for exceptions", () => {
      const r = p.buildLogStatement("myException", hover, ind, config, "test.py", line);
      assert.ok(r.includes("traceback.print_exc()"));
    });

    test("multi-variable log", () => {
      const r = p.buildLogStatement("user_id, email, role", hover, ind, config, "test.py", line);
      assert.ok(r.includes("{user_id=}"));
      assert.ok(r.includes("{email=}"));
    });
  });

  suite("GoProvider", () => {
    const p = new GoProvider();

    test("default fmt.Printf", () => {
      const r = p.buildLogStatement("myVar", hover, ind, config, "main.go", line);
      assert.ok(r.includes('fmt.Printf("🎯 [main.go:42] myVar: %v\\n", myVar)'));
    });

    test("%+v for structs", () => {
      const r = p.buildLogStatement("userData", hover, ind, config, "main.go", line);
      assert.ok(r.includes("%+v"));
    });

    test("error logging", () => {
      const r = p.buildLogStatement("myErr", hover, ind, config, "main.go", line);
      assert.ok(r.includes("log.Printf"));
    });

    test("multi-variable log", () => {
      const r = p.buildLogStatement("userId, email", hover, ind, config, "main.go", line);
      assert.ok(r.includes("userId=%v"));
      assert.ok(r.includes("email=%v"));
    });
  });

  suite("PhpProvider", () => {
    const p = new PhpProvider();

    test("default echo", () => {
      const r = p.buildLogStatement("$myValue", hover, ind, config, "index.php", line);
      assert.ok(r.includes('echo "🎯 [index.php:42] myValue: " . $myValue'));
    });

    test("print_r for arrays", () => {
      const r = p.buildLogStatement("$usersList", hover, ind, config, "index.php", line);
      assert.ok(r.includes("print_r($usersList)"));
    });

    test("error_log for errors", () => {
      const r = p.buildLogStatement("$dbError", hover, ind, config, "index.php", line);
      assert.ok(r.includes("error_log("));
    });
  });

  suite("DartProvider", () => {
    const p = new DartProvider();

    test("default debugPrint", () => {
      const r = p.buildLogStatement("myVar", hover, ind, config, "main.dart", line);
      assert.ok(r.includes("debugPrint("));
      assert.ok(r.includes("[main.dart:42]"));
      assert.ok(r.includes("// intellilog"));
    });

    test("multi-variable log", () => {
      const r = p.buildLogStatement("userId, email", hover, ind, config, "main.dart", line);
      assert.ok(r.includes("userId: $userId"));
      assert.ok(r.includes("email: $email"));
    });
  });

  suite("RubyProvider", () => {
    const p = new RubyProvider();

    test("default puts with inspect", () => {
      const r = p.buildLogStatement("my_var", hover, ind, config, "main.rb", line);
      assert.ok(r.includes("puts"));
      assert.ok(r.includes("[main.rb:42]"));
      assert.ok(r.includes("# intellilog"));
    });

    test("error logging with backtrace", () => {
      const r = p.buildLogStatement("myError", hover, ind, config, "main.rb", line);
      assert.ok(r.includes("backtrace"));
    });

    test("multi-variable log", () => {
      const r = p.buildLogStatement("user_id, email", hover, ind, config, "main.rb", line);
      assert.ok(r.includes("user_id: #{user_id}"));
    });
  });

  suite("RustProvider", () => {
    const p = new RustProvider();

    test("default println! with {:?}", () => {
      const r = p.buildLogStatement("my_var", hover, ind, config, "main.rs", line);
      assert.ok(r.includes('println!("🎯 [main.rs:42] my_var: {:?}", my_var)'));
      assert.ok(r.includes("// intellilog"));
    });

    test("eprintln! for errors", () => {
      const r = p.buildLogStatement("myError", hover, ind, config, "main.rs", line);
      assert.ok(r.includes("eprintln!"));
    });

    test("multi-variable log", () => {
      const r = p.buildLogStatement("user_id, email", hover, ind, config, "main.rs", line);
      assert.ok(r.includes("user_id={:?}"));
      assert.ok(r.includes("email={:?}"));
    });
  });
});
