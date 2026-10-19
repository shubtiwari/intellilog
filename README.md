# IntelliLog 🥷

> Smarter debug logs — in one keystroke.

IntelliLog looks at the variable you highlight — its name and, where a language server is available, its type — and inserts the most useful log statement for it, tagged with the file and line it came from. Supports **JavaScript / TypeScript**, **Python**, **Go**, **PHP**, **Ruby**, **Rust**, and **Flutter / Dart**.

---

## How It Works

1. **Highlight** a variable or expression (use multiple cursors to log several places at once).
2. Press `Cmd+Alt+L` (Mac) or `Ctrl+Alt+L` (Windows / Linux).
3. IntelliLog inserts the log on the line below, matching its indentation — or one level deeper if that line opens a block (`if (x) {`, `for item in items:`):

```javascript
const user = await fetchUser(id);
console.log("🎯 [auth.ts:12] user:", user); // intellilog
```

The trailing `// intellilog` (or `# intellilog`) marker is how IntelliLog finds its own logs again — for the gutter icons, the status-bar count, and the cleanup commands.

---

## ✨ Features

- **Smart method selection** — errors, arrays, objects, payloads, and structs each get the logging call that shows them best.
- **File + line context** — every log is prefixed with `[file:line]`.
- **Multi-variable logs** — highlight `userId, email, role` to log them together (see [Multi-Variable Logs](#multi-variable-logs)).
- **Safe output** — quotes, `%`, braces, `$` and `#{` in the selection or your prefix are escaped for each language, so the inserted line always parses.
- **Function entry logs** — put the cursor on a function definition and press `Cmd+Alt+W` / `Ctrl+Alt+W` to log the call and all its parameters.
- **Structured JSON output** — optional machine-parseable logs for Datadog, Splunk, CloudWatch or Elastic (JS/TS and Python).
- **Gutter icons & status bar count** — see every IntelliLog statement at a glance.
- **One-command cleanup** — comment, uncomment, or delete every IntelliLog statement in the file, even after Prettier / Black have wrapped them over several lines.
- **Automatic imports** — Go logs add `import "fmt"` (etc.) and Dart JSON logs add `dart:convert` when missing; these lines carry the marker too, so **Delete All Logs** removes them again.

---

## ⌨️ Commands & Shortcuts

| Command                                  | Mac         | Windows / Linux |
| :--------------------------------------- | :---------- | :-------------- |
| IntelliLog: Smart Insert Log             | `Cmd+Alt+L` | `Ctrl+Alt+L`    |
| IntelliLog: Wrap Function with Entry Log | `Cmd+Alt+W` | `Ctrl+Alt+W`    |
| IntelliLog: Comment All Logs             | `Cmd+Alt+/` | `Ctrl+Alt+/`    |
| IntelliLog: Uncomment All Logs           | —           | —               |
| IntelliLog: Delete All Logs              | `Cmd+Alt+D` | `Ctrl+Alt+D`    |

Click the `🎯 3 logs` status-bar item to see all IntelliLog commands. (Imports that IntelliLog added are not counted as logs.)

---

## Supported Languages & Methods

Names are matched by whole words (`userError`, `stack_trace`, `JSONPayload`), so `referrer` is not an error and `country` is not a counter.

### 💛 JavaScript / TypeScript

| You highlight                                             | IntelliLog inserts                                                            |
| :-------------------------------------------------------- | :---------------------------------------------------------------------------- |
| anything else                                             | `console.log('🎯 [app.ts:5] message:', message);`                             |
| `*Error`, `err`, `exception`, `catch`, or an `Error` type | `console.error('🎯 [app.ts:5] myError:', myError);`                           |
| `*Trace`, `stack`                                         | `console.trace('🎯 [app.ts:5] stackTrace:', stackTrace);`                     |
| `*Obj`, `object`                                          | `console.log('🎯 [app.ts:5] myObj:'); console.dir(myObj, { depth: null });`   |
| array literal, or an array / `Record` type                | `console.log('🎯 [app.ts:5] users:'); console.table(users);`                  |
| a `Promise<…>` type                                       | `console.warn('🎯 [app.ts:5] fetchData:', fetchData);`                        |
| `userId, email, role`                                     | `console.log('🎯 [app.ts:5] userId, email, role:', { userId, email, role });` |

`console.table` and `console.dir` only print their first argument, so the label is printed by its own `console.log` first.

### 🐍 Python

| You highlight                                                                    | IntelliLog inserts                                                                   |
| :------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| anything else                                                                    | `print(f"🎯 [app.py:5] total: {total}")`                                             |
| an expression with quotes or braces (`cfg["key"]`)                               | `print("🎯 [app.py:5] cfg[\"key\"]:", cfg["key"])` — works on every Python 3 version |
| names containing the word `type`                                                 | `print("🎯 [app.py:5] type(value_type):", type(value_type))`                         |
| `payload`, `json`                                                                | `print("…", json.dumps(payload, indent=2, default=str), sep="\n")`                   |
| `err`, `error`, `exc`, `exception`                                               | the value's `repr`, plus its traceback if it is an exception                         |
| `users`, `data`, `dict`, `list`, `items`, `records`, `rows`, or a dict/list type | a label line, then `pprint.pprint(users)`                                            |

### 🐹 Go

| You highlight                                                          | IntelliLog inserts                                                       |
| :--------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| anything else                                                          | `fmt.Printf("🎯 [main.go:5] count: %v\n", count)`                        |
| `user`, `data`, `obj`, `config`, `state`, `req`, `resp`, structs, maps | `fmt.Printf("🎯 [main.go:5] userData: %+v\n", userData)`                 |
| `err`, `errs`, or an `error` type                                      | `log.Printf("🎯 [main.go:5] err: %v\n", err)`                            |
| `*Type`, `kind`                                                        | `%T` (prints the type)                                                   |
| `body`, `payload`, `json`                                              | pretty-printed `json.MarshalIndent` output (safe to repeat in one scope) |

Missing `fmt`, `log` or `encoding/json` imports are added below the `package` line.

### 🐘 PHP

| You highlight                        | IntelliLog inserts                                                   |
| :----------------------------------- | :------------------------------------------------------------------- |
| anything else                        | `echo '🎯 [index.php:5] total: ' . var_export($total, true) . "\n";` |
| `$err`, `$e`, `*Error`, `*Exception` | `error_log('🎯 [index.php:5] dbError: ' . print_r($dbError, true));` |
| `$users`, `$data`, `*List`, arrays   | label + `print_r($users, true)`                                      |
| `$dump`, `$var`                      | label + `var_dump($var)`                                             |

### 💎 Ruby

| You highlight                                    | IntelliLog inserts                                                              |
| :----------------------------------------------- | :------------------------------------------------------------------------------ |
| anything else (including arrays)                 | `puts "🎯 [app.rb:5] user: #{user.inspect}"`                                    |
| `obj`, `object`, `data`, `result(s)`, `record`   | label line, then `pp result`                                                    |
| `payload`, `json`, `hash`, `params`, or a `Hash` | `JSON.pretty_generate(payload)`                                                 |
| `err`, `error`, `exc`, `exception`, `e`          | the error's `inspect`, plus its first 5 backtrace lines once it has been raised |

### 🦀 Rust

| You highlight                                            | IntelliLog inserts                                   |
| :------------------------------------------------------- | :--------------------------------------------------- |
| anything else                                            | `println!("🎯 [main.rs:5] value: {:?}", value);`     |
| `config`, `state`, `settings`, structs, `Vec`, `HashMap` | `println!("🎯 [main.rs:5] config:\n{:#?}", config);` |
| `err`, `error`, `e`, or an `Error` / `Result` type       | `eprintln!("🎯 [main.rs:5] err: {:?}", err);`        |
| `debug`, `dbg`                                           | `dbg!(&debug_info);`                                 |

### 🎯 Flutter / Dart

| You highlight                                            | IntelliLog inserts                                                                         |
| :------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| anything else                                            | `debugPrint('🎯 [main.dart:5] user.name: ${user.name}');`                                  |
| `payload`, `json`, `map`, or a `Map<…>` type             | `JsonEncoder.withIndent("  ").convert(payload)` (adds `import 'dart:convert';` if missing) |
| `widget`, `context`, or a `Widget` / `BuildContext` type | `${widget.runtimeType}`                                                                    |
| `err`, `error`, `exc`, `exception`, `e`                  | the error, then `StackTrace.current`                                                       |
| `stackTrace`                                             | the stack trace on its own lines                                                           |

Flutter files (those importing `package:flutter/…`) use `debugPrint`; pure-Dart files use `print`.

---

## Multi-Variable Logs

Highlight a comma-separated list of names to log them in one statement. Commas inside calls or literals (`fn(a, b)`, `[1, 2]`) don't count — those are logged as a single value.

| Language | `userId, email` becomes                                                                                     |
| :------- | :---------------------------------------------------------------------------------------------------------- |
| JS / TS  | `console.log('🎯 [app.ts:5] userId, email:', { userId, email });`                                           |
| Python   | `print(f"🎯 [app.py:5] {user_id=}, {email=}")`                                                              |
| Go       | `fmt.Printf("🎯 [main.go:5] userId=%v email=%v\n", userId, email)`                                          |
| PHP      | `echo '🎯 [index.php:5] userId, email: ' . print_r(['userId' => $userId, 'email' => $email], true) . "\n";` |
| Ruby     | `puts "🎯 [app.rb:5] user_id: #{user_id.inspect}, email: #{email.inspect}"`                                 |
| Rust     | `println!("🎯 [main.rs:5] user_id={:?}, email={:?}", user_id, email);`                                      |
| Dart     | `debugPrint('🎯 [main.dart:5] userId: ${userId}, email: ${email}');`                                        |

---

## Function Entry Logs

Put the cursor on the first line of a function definition and press `Cmd+Alt+W` / `Ctrl+Alt+W`:

```typescript
async function processPayment(userId: string, { amount, currency }: Payment) {
  console.log("🎯 [pay.ts:1] → processPayment called", {
    userId,
    amount,
    currency,
  }); // intellilog
  // …
}
```

Signatures spanning several lines, generics, default values, and destructured parameters are supported. In Python, the log goes after the docstring. Functions with no multi-line body to insert into (`const f = x => x * 2`, `def f(): pass`) are reported instead of being edited.

---

## Structured JSON Output

Set `"intellilog.structuredOutput": true` to emit JSON (JS/TS and Python):

```javascript
console.log(
  JSON.stringify({ _src: "[auth.ts:42]", userData: userData }, null, 2),
); // intellilog
```

```python
import json; print(json.dumps({"_src": "[auth.py:42]", "user_data": user_data}, indent=2, default=str)) # intellilog
```

---

## Settings

| Setting                       | Default | Description                                                                            |
| :---------------------------- | :------ | :------------------------------------------------------------------------------------- |
| `intellilog.logPrefix`        | `🎯`    | Prefix at the start of every log label.                                                |
| `intellilog.insertColon`      | `true`  | Insert a colon after the variable name (`user:`).                                      |
| `intellilog.structuredOutput` | `false` | Emit JSON logs (JS/TS and Python).                                                     |
| `intellilog.insertArrow`      | `true`  | **Deprecated** — old name of `insertColon`, still honoured until `insertColon` is set. |

---

## Known Limitations

- Line numbers in labels are a snapshot from when the log was inserted; they don't update if you add lines above later.
- Go logs on values whose types don't implement useful formatting, and Rust logs on types that don't implement `Debug`, won't compile — the same as writing the log by hand.
- Logs are recognised by their trailing marker; if you remove the `// intellilog` comment, IntelliLog treats the line as your own code.

---

## Requirements

- VS Code **1.90.0** or higher

---

## Development

```bash
npm install
npm run compile   # type-check, lint, bundle to dist/
npm test          # unit tests + integration tests in a downloaded VS Code
```

Press `F5` in VS Code to launch an Extension Development Host. Each language lives in `src/providers/<language>.ts` (log statements, function-entry logs, imports); `src/logBlocks.ts` finds IntelliLog statements for cleanup, and `src/functionWrap.ts` locates function signatures and bodies.

---

## Author

Made with ❤️ by [Shubham Tiwari](https://github.com/shubtiwari)
