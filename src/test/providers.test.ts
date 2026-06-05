import * as assert from "assert";
import { JavascriptProvider } from "../providers/javascript";
import { PythonProvider } from "../providers/python";
import { GoProvider } from "../providers/go";
import { PhpProvider } from "../providers/php";
import { IntelliLogConfig } from "../providers/types";

suite("Providers Unit Tests", () => {
  const config: IntelliLogConfig = { prefix: "🎯", suffix: ":", useColorIcons: true };
  const hoverText = "";
  const indentation = "";

  suite("JavascriptProvider", () => {
    const provider = new JavascriptProvider();

    test("Should default to console.log", () => {
      const result = provider.buildLogStatement(
        "myVar",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes("console.log('🟦 myVar:', myVar)"));
    });

    test("Should use console.error for errors", () => {
      const result = provider.buildLogStatement(
        "myError",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes("console.error('🟥 myError:', myError)"));
    });

    test("Should use console.table for arrays/objects", () => {
      const result = provider.buildLogStatement(
        "[1, 2, 3]",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes("console.table('📊 1, 2, 3:', [1, 2, 3])"));
    });
  });

  suite("PythonProvider", () => {
    const provider = new PythonProvider();

    test("Should default to f-string print", () => {
      const result = provider.buildLogStatement(
        "myVar",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes('print(f"🟦 myVar: {myVar}")'));
    });

    test("Should use pprint for dicts/lists", () => {
      const result = provider.buildLogStatement(
        "users",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes("import pprint; pprint.pprint(users)"));
    });

    test("Should print type", () => {
      const result = provider.buildLogStatement(
        "checkType",
        hoverText,
        indentation,
        config,
      );
      assert.ok(
        result.includes('print(f"🟪 type(checkType): {type(checkType)}")'),
      );
    });

    test("Should print traceback for errors", () => {
      const result = provider.buildLogStatement(
        "myException",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes("import traceback; traceback.print_exc()"));
    });
  });

  suite("GoProvider", () => {
    const provider = new GoProvider();

    test("Should default to fmt.Printf", () => {
      const result = provider.buildLogStatement(
        "myVar",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes('fmt.Printf("🟦 myVar: %v\\n", myVar)'));
    });

    test("Should use %+v for structs/maps", () => {
      const result = provider.buildLogStatement(
        "userData",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes('fmt.Printf("📊 userData: %+v\\n", userData)'));
    });

    test("Should print type using %T", () => {
      const result = provider.buildLogStatement(
        "typeOfVar",
        hoverText,
        indentation,
        config,
      );
      assert.ok(
        result.includes('fmt.Printf("🟪 Type of typeOfVar: %T\\n", typeOfVar)'),
      );
    });

    test("Should log error", () => {
      const result = provider.buildLogStatement(
        "myErr",
        hoverText,
        indentation,
        config,
      );
      assert.ok(
        result.includes('log.Printf("🟥 Error in myErr: %v\\n", myErr)'),
      );
    });
  });

  suite("PhpProvider", () => {
    const provider = new PhpProvider();

    test("Should default to echo", () => {
      const result = provider.buildLogStatement("$myValue", hoverText, indentation, config);
      assert.ok(result.includes('echo "🟦 myValue: " . $myValue'));
    });

    test("Should use print_r for arrays", () => {
      const result = provider.buildLogStatement(
        "$usersList",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes("print_r($usersList)"));
    });

    test("Should use error_log for errors", () => {
      const result = provider.buildLogStatement(
        "$dbError",
        hoverText,
        indentation,
        config,
      );
      assert.ok(
        result.includes('error_log("🟥 dbError: " . print_r($dbError, true))'),
      );
    });

    test("Should die and dump", () => {
      const result = provider.buildLogStatement(
        "$exitPoint",
        hoverText,
        indentation,
        config,
      );
      assert.ok(result.includes("die(var_dump($exitPoint))"));
    });
  });
});

