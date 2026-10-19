# IntelliLog 🥷

> Smarter debug logs — in one keystroke.

IntelliLog looks at the variable you highlight — its name and, where a language server is available, its type — and inserts the most useful log statement for it, tagged with the file and line it came from. Supports **JavaScript / TypeScript**, **Python**, **Go**, **PHP**, **Ruby**, **Rust**, and **Flutter / Dart**.

---

## How It Works

1. **Highlight** a variable (or several, with multiple cursors).
2. Press `Cmd+Alt+L` (Mac) or `Ctrl+Alt+L` (Windows / Linux).
3. IntelliLog inserts the log on the line below:

```javascript
const user = await fetchUser(id);
console.log('🎯 [auth.ts:12] user:', user); // intellilog
```

The trailing `// intellilog` (or `# intellilog`) marker is how IntelliLog finds its own logs again — for the gutter icons, the status-bar count, and the cleanup commands.

---

## ✨ Features

- **Smart method selection** — errors, arrays, objects, payloads, and structs each get the logging call that shows them best.
- **File + line context** — every log is prefixed with `[file:line]`.
- **Multi-variable logs** — highlight `userId, email, role` to log them together.
- **Function entry logs** — put the cursor on a function definition and press `Cmd+Alt+W` / `Ctrl+Alt+W` to log the call and all its parameters.
- **Structured JSON output** — optional machine-parseable logs for Datadog, Splunk, CloudWatch or Elastic (JS/TS and Python).
- **Gutter icons & status bar count** — see every IntelliLog statement at a glance.
- **One-command cleanup** — comment, uncomment, or delete every IntelliLog statement in the file, even after Prettier / Black have wrapped them over several lines.
- **Automatic imports** — Go logs add `import "fmt"` (etc.) and Dart JSON logs add `dart:convert` when missing; these lines carry the marker too, so **Delete All Logs** removes them again.

---

## ⌨️ Commands & Shortcuts

| Command                                 | Mac           | Windows / Linux |
| :-------------------------------------- | :------------ | :-------------- |
| IntelliLog: Smart Insert Log            | `Cmd+Alt+L`   | `Ctrl+Alt+L`    |
| IntelliLog: Wrap Function with Entry Log| `Cmd+Alt+W`   | `Ctrl+Alt+W`    |
| IntelliLog: Comment All Logs            | `Cmd+Alt+/`   | `Ctrl+Alt+/`    |
| IntelliLog: Uncomment All Logs          | —             | —               |
| IntelliLog: Delete All Logs             | `Cmd+Alt+D`   | `Ctrl+Alt+D`    |

Click the `🎯 3 logs` status-bar item to see all IntelliLog commands.

---

## Supported Languages & Methods

Names are matched by whole words (`userError`, `stack_trace`, `JSONPayload`), so `referrer` is not an error and `country` is not a counter.

### 💛 JavaScript / TypeScript

| You highlight                                  | IntelliLog inserts                                                     |
| :--------------------------------------------- | :--------------------------------------------------------------------- |
| anything else                                  | `console.log('🎯 [app.ts:5] message:', message);`                       |
| `*Error`, `err`, `exception`, `catch`, or an `Error` type | `console.error('🎯 [app.ts:5] myError:', myError);`           |
| `*Trace`, `stack`                              | `console.trace('🎯 [app.ts:5] stackTrace:', stackTrace);`               |
| `*Obj`, `object`                               | `console.log('🎯 [app.ts:5] myObj:'); console.dir(myObj, { depth: null });` |
| array literal, or an array / `Record` type     | `console.log('🎯 [app.ts:5] users:'); console.table(users);`             |
| a `Promise<…>` type                            | `console.warn('🎯 [app.ts:5] fetchData:', fetchData);`                  |
| `userId, email, role`                          | `console.log('🎯 [app.ts:5] userId, email, role:', { userId, email, role });` |

`console.table` and `console.dir` only print their first argument, so the label is printed by its own `console.log` first.

### 🐍 Python

| You highlight             | IntelliLog inserts                                                        |
| :------------------------ | :------------------------------------------------------------------------ |
| anything else             | `print(f"🎯 [app.py:5] total: {total}")`                                   |
| `*_type`                  | `print("🎯 [app.py:5] type(value_type):", type(value_type))`               |
| `payload`, `json`         | `print("…", json.dumps(payload, indent=2, default=str), sep="\n")`        |
| `err`, `error`, `exception` | the value's `repr`, plus its traceback if it is an exception            |
| `users`, `data`, `dict`, `list`, `items`, or a dict/list type | a label line, then `pprint.pprint(users)` |
| `user_id, email`          | `print(f"🎯 [app.py:5] {user_id=}, {email=}")`                             |

### 🐹 Go

| You highlight                      | IntelliLog inserts                                                   |
| :--------------------------------- | :------------------------------------------------------------------- |
| anything else                      | `fmt.Printf("🎯 [main.go:5] count: %v\n", count)`                     |
| `user`, `data`, `config`, structs, maps | `fmt.Printf("🎯 [main.go:5] userData: %+v\n", userData)`         |
| `err`, or an `error` type          | `log.Printf("🎯 [main.go:5] err: %v\n", err)`                         |
| `*Type`, `kind`                    | `%T` (prints the type)                                               |
| `body`, `payload`, `json`          | pretty-printed `json.MarshalIndent` output                           |

### 🐘 PHP

| You highlight                     | IntelliLog inserts                                                     |
| :-------------------------------- | :--------------------------------------------------------------------- |
| anything else                     | `echo '🎯 [index.php:5] total: ' . var_export($total, true) . "\n";`    |
| `$err`, `$e`, `*Error`, `*Exception` | `error_log('🎯 [index.php:5] dbError: ' . print_r($dbError, true));` |
| `$users`, `$data`, `*List`, arrays | label + `print_r($users, true)`                                       |
| `$dump`, `$var`                   | label + `var_dump($var)`                                               |

### 💎 Ruby

`puts "🎯 [app.rb:5] user: #{user.inspect}"` by default; `pp` for objects and results; `JSON.pretty_generate` for payloads and hashes; message plus the first 5 backtrace lines for errors.

### 🦀 Rust

`println!("🎯 [main.rs:5] value: {:?}", value)` by default; `{:#?}` for structs, `Vec`, and `HashMap`; `eprintln!` for errors and `Result`s; `dbg!` for names containing `debug` / `dbg`.

### 🎯 Flutter / Dart

`debugPrint('🎯 [main.dart:5] value: ${value}')` in Flutter files (plain `print` in pure-Dart files); `JsonEncoder.withIndent` for maps and payloads; `runtimeType` for widgets and `BuildContext`; error plus `StackTrace.current` for errors.

---

## Function Entry Logs

Put the cursor on the first line of a function definition and press `Cmd+Alt+W` / `Ctrl+Alt+W`:

```typescript
async function processPayment(userId: string, { amount, currency }: Payment) {
  console.log('🎯 [pay.ts:1] → processPayment called', { userId, amount, currency }); // intellilog
  // …
}
```

Signatures spanning several lines, generics, default values, and destructured parameters are supported. In Python, the log goes after the docstring. Functions with no multi-line body to insert into (`const f = x => x * 2`, `def f(): pass`) are reported instead of being edited.

---

## Structured JSON Output

Set `"intellilog.structuredOutput": true` to emit JSON (JS/TS and Python):

```javascript
console.log(JSON.stringify({ _src: '[auth.ts:42]', 'userData': userData }, null, 2)); // intellilog
```

```python
import json; print(json.dumps({"_src": "[auth.py:42]", "user_data": user_data}, indent=2, default=str)) # intellilog
```

---

## Settings

| Setting                       | Default | Description                                                        |
| :---------------------------- | :------ | :----------------------------------------------------------------- |
| `intellilog.logPrefix`        | `🎯`    | Prefix at the start of every log label.                            |
| `intellilog.insertColon`      | `true`  | Insert a colon after the variable name (`user:`).                  |
| `intellilog.structuredOutput` | `false` | Emit JSON logs (JS/TS and Python).                                 |
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

## Author

Made with ❤️ by [Shubham Tiwari](https://github.com/shubtiwari)
