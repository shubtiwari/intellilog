# Changelog

All notable changes to IntelliLog are documented here.

## [Unreleased]

### Fixed

- **JS/TS `console.table` / `console.dir` printed only the label** — both take a single value, so the label is now printed by a separate `console.log` first.
- **Name heuristics matched substrings** — `country`/`accountId` became `console.count`, `createdTime` became `console.time` (value never printed), `groupId` opened an unclosed `console.group`, `referrer` became `console.error`. Names are now matched by whole words, and methods that don't print the value (`count`, `time`, `timeLog`, `group`, `groupEnd`) are no longer chosen automatically.
- **PHP could insert `die(var_dump(…))`** for names like `$audience` or `$exitCode` — removed.
- **Function entry logs**: PHP produced `$$a` / type names instead of parameters; Ruby produced invalid syntax; Python could be inserted at column 0 when the next line was blank.
- **Selections containing commas** (`[1, 2]`, `fn(a, b)`) were treated as multiple variables.
- **Quotes, `%`, braces, `$` and `#{`** in the selection or prefix are escaped for each language's string syntax.
- **Structured output** no longer uses `console.time` & co., and serialises `Error` objects instead of `{}`.
- **Python** error logs print the value and that exception's own traceback (instead of `traceback.print_exc()`).
- **Ruby** error logs no longer crash on exceptions that were never raised (`backtrace` is `nil`).
- **Dart** interpolates member expressions correctly (`${user.name}`), uses `print` in non-Flutter files, and adds `dart:convert` when needed.
- **Go** JSON logs no longer redeclare `b` when used twice in a scope; missing `fmt` / `log` / `encoding/json` imports are added (and removed by Delete All Logs).
- **Delete / comment / uncomment** handle logs that Prettier or Black wrapped over several lines.
- **Inserting on the last line** of a file without a trailing newline no longer appends to that line.
- **Function detection** supports multi-line signatures, TS generics, `async` methods, destructured parameters, and any Dart return type (e.g. `Widget build(BuildContext context)`); expression-bodied functions are reported instead of getting a log outside the function.
- **Keybindings** on Linux used the Meta key (`cmd+…`); they now use `Ctrl+Alt+…`.
- **Gutter icons and the status bar** appear on startup (`onStartupFinished`), refresh all visible editors, and are debounced instead of rescanning the file twice per keystroke.

### Changed

- `intellilog.insertArrow` is renamed to `intellilog.insertColon` (the old setting still works until the new one is set).
- Function-wrap logic moved into the language providers; removed the unused `colors.ts`.
- README rewritten to match the actual output of every language.
- Added `license` and `keywords` to the manifest; removed the "Programming Languages" category.
- Upgraded `@vscode/test-electron` to 3.x so `npm test` works with VS Code ≥ 1.110.

## [0.2.0] - 2026-06-29

### Added

- **Gutter decorations** — a 🎯 target icon appears in the editor gutter next to every IntelliLog line, making logs instantly scannable in large files without reading every line.

- **Function wrap** (`Cmd+Alt+W` / `Ctrl+Alt+W`) — place cursor on any function definition and IntelliLog inserts an entry log at the top of the function body, including all parameters. Works across JS/TS, Python, Go, PHP, Dart, Ruby, and Rust:
  ```js
  console.log('🎯 [auth.ts:10] → processPayment called', { userId, amount }); // intellilog
  ```

- **Structured JSON output mode** (`intellilog.structuredOutput: true`) — logs as machine-parseable JSON for Datadog, Splunk, CloudWatch, and Elastic. Supported in JS/TS and Python:
  ```js
  console.log(JSON.stringify({ _src: 'auth.ts:42', userData }, null, 2)); // intellilog
  ```

- **Ruby support** — `puts` with `.inspect`, `pp` for objects, `JSON.pretty_generate` for payloads, backtrace for errors.

- **Rust support** — `println!` with `{:?}`, `eprintln!` to stderr for errors, `{:#?}` for structs, `dbg!` for inline inspection.

- **Status bar log count** — `🎯 3 logs` appears in the status bar when IntelliLog statements are present in the active file. Click to open the command palette filtered to IntelliLog commands.

- **Multi-variable log** — select `userId, email, role` and IntelliLog generates a single grouped log across all supported languages:
  ```js
  console.log('🎯 [auth.ts:42] userId, email, role:', { userId, email, role }); // intellilog
  ```

### Changed

- Bumped version to `0.2.0`.
- Extension description updated to reflect full language support (JS, TS, Python, Go, PHP, Ruby, Rust, Flutter/Dart).

---

## [0.1.1] - 2026-06-29

### Added

- **Flutter / Dart support** — smart `debugPrint` insertion with type-aware heuristics:
  - Maps/JSON payloads → pretty-printed via `JsonEncoder`
  - Widgets/BuildContext → logs `runtimeType`
  - Errors/exceptions → logs error + current `StackTrace`
  - Lists → joined output
  - Default → `debugPrint('🎯 [file.dart:42] myVar: $myVar')`

---

## [0.1.0] - 2026-06-29

### Added

- **File & line context in every log** — each generated statement now includes the source file and line number so you always know where a log fired:
  ```js
  console.log('🎯 [auth.ts:42] userData:', userData); // intellilog
  ```
  Works across all supported languages (JS, TS, Python, Go, PHP).

- **Log cleanup commands** — three new commands to manage IntelliLog-generated logs (identifiable by the `// intellilog` / `# intellilog` marker):
  - **IntelliLog: Comment All Logs** (`Cmd+Alt+/` / `Ctrl+Alt+/`) — comment out all logs in the active file
  - **IntelliLog: Uncomment All Logs** — restore commented logs
  - **IntelliLog: Delete All Logs** (`Cmd+Alt+D` / `Ctrl+Alt+D`) — permanently remove all IntelliLog logs

- **`Programming Languages` marketplace category** — the extension now surfaces in language-tooling searches.

### Changed

- Removed color-coded emoji prefixes (🟥 🟦 🟨 🟪 📊) — all log types now consistently use your configured `logPrefix` (default `🎯`).
- Removed `intellilog.useColorIcons` configuration setting.
- Python error/pprint logs now include the prefix and file context on a header line before the multi-line output.
- Bumped version to `0.1.0`.

---

## [0.0.1] - 2026-06-04

### Added

- Initial release.
- Smart log insertion via `Cmd+Alt+L` / `Ctrl+Alt+L`.
- Automatic console method selection based on variable type and name (JS/TS: `console.log`, `console.error`, `console.table`, `console.time`, and more).
- Multi-language support: JavaScript, TypeScript, Python, Go, PHP.
- Configurable log prefix (`intellilog.logPrefix`) and colon style (`intellilog.insertArrow`).
