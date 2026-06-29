# Changelog

All notable changes to IntelliLog are documented here.

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
