# IntelliLog 🥷

> Smarter console logs — in one keystroke.

IntelliLog detects your variable's type and language, automatically picking the right debugging method for you. Supports **JavaScript/TypeScript**, **Python**, **Go**, and **PHP** out of the box! No more manually typing `console.table`, `pprint`, or `fmt.Printf`.

---

## How It Works

1. **Highlight** a variable name in your editor.
2. Press the shortcut `Cmd+Option+L` (Mac) or `Ctrl+Alt+L` (Windows).
3. IntelliLog inserts the best console statement right below it — automatically.

---

## ✨ Features

- **Smart Heuristics** – Automatically detects what kind of variable you highlighted (arrays, errors, promises, structs) and inserts the best possible logging method.
- **Color-Coded Icons** – Logs are instantly recognizable with dynamic emoji prefixes (🟥 for errors, 📊 for arrays/tables, ⏱️ for performance).
- **Multi-Language Support** – Works seamlessly across JavaScript, TypeScript, Python, Go, and PHP without needing separate extensions.
- **Zero Configuration** – No complex setup required. Just highlight and press the shortcut.

---

## ⌨️ Keyboard Shortcuts

- **`Cmd+Option+L`** (Mac)
- **`Ctrl+Alt+L`** (Windows/Linux)
- **`intellilog.smartLog`** (Command Palette)

---

## Supported Languages & Methods

### 💛 JavaScript / TypeScript

### `console.log` — General values

**Your code:**

```javascript
const message = "Hello World";
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
const message = "Hello World";
console.log("🎯 message:", message);
```

**Console output:**

```
🎯 message: Hello World
```

---

### `console.table` — Arrays & objects

**Your code:**

```javascript
const users = await fetchUsers();
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
const users = await fetchUsers();
console.table("🎯 users:", users);
```

**Console output:**

```
┌─────────┬───────────┬─────────────────────┐
│ (index) │   name    │        email        │
├─────────┼───────────┼─────────────────────┤
│    0    │  'Alice'  │ 'alice@example.com' │
│    1    │   'Bob'   │  'bob@example.com'  │
└─────────┴───────────┴─────────────────────┘
```

---

### `console.error` — Errors & catch blocks

**Your code:**

```javascript
try {
  riskyOperation();
} catch (myError) {
  // cursor here
}
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
try {
  riskyOperation();
} catch (myError) {
  console.error("🎯 myError:", myError);
}
```

**Console output:**

```
🎯 myError: TypeError: Cannot read properties of undefined (reading 'id')
    at riskyOperation (app.js:12)
    at catch (app.js:15)
```

---

### `console.warn` — Promises & async calls

**Your code:**

```javascript
const fetchData = fetch("/api/data");
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
const fetchData = fetch("/api/data");
console.warn("🎯 fetchData:", fetchData);
```

**Console output:**

```
⚠ 🎯 fetchData: Promise { <pending> }
```

---

### `console.trace` — Call stack tracing

**Your code:**

```javascript
function handleClick() {
  const stackTrace = new Error().stack;
}
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
function handleClick() {
  const stackTrace = new Error().stack;
  console.trace("🎯 stackTrace:", stackTrace);
}
```

**Console output:**

```
🎯 stackTrace:
  handleClick      @ app.js:5
  onClick          @ button.js:12
  dispatchEvent    @ react-dom.js:3728
```

---

### `console.dir` — Object inspection

**Your code:**

```javascript
const myObj = document.querySelector("#app");
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
const myObj = document.querySelector("#app");
console.dir("🎯 myObj:", myObj);
```

**Console output:**

```
🎯 myObj: HTMLDivElement
  ├─ id: "app"
  ├─ className: "container"
  ├─ childElementCount: 3
  └─ ...
```

---

### `console.time` / `console.timeEnd` — Performance timing

**Your code:**

```javascript
const perfTime = runHeavyTask();
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
console.time("🎯 perfTime");
const perfTime = runHeavyTask();
console.timeEnd("🎯 perfTime");
```

**Console output:**

```
🎯 perfTime: 142.35 ms
```

---

### `console.timeLog` — Intermediate timing checkpoints

**Your code:**

```javascript
const renderTimeLog = performance.now();
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
const renderTimeLog = performance.now();
console.timeLog("🎯 renderTimeLog", renderTimeLog);
```

**Console output:**

```
🎯 renderTimeLog: 523.10 ms  →  1847.23
```

---

### `console.group` — Grouped log output

**Your code:**

```javascript
const userGroup = getUsers();
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
const userGroup = getUsers();
console.group("🎯 userGroup");
console.log(userGroup[0]);
console.log(userGroup[1]);
console.groupEnd();
```

**Console output:**

```
▼ 🎯 userGroup
    { name: 'Alice', role: 'admin' }
    { name: 'Bob',   role: 'user'  }
```

---

### `console.groupEnd` — Close a log group

**Your code:**

```javascript
const userGroupEnd = true;
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
const userGroupEnd = true;
console.groupEnd();
```

**Console output:**

```
▲ (group collapsed)
```

---

### `console.count` — Count occurrences

**Your code:**

```javascript
const retryCount = 0;
```

**After pressing the shortcut (IntelliLog inserts):**

```javascript
const retryCount = 0;
console.count("🎯 retryCount");
```

**Console output (called 3 times):**

```
🎯 retryCount: 1
🎯 retryCount: 2
🎯 retryCount: 3
```

---

### 🐍 Python

IntelliLog detects Python dictionaries, lists, and errors to use the right debugging module.

**Your code:**

```python
# Highlight "users" → press shortcut
users = {"name": "Alice", "role": "admin"}
```

**After pressing the shortcut (IntelliLog inserts):**

```python
users = {"name": "Alice", "role": "admin"}
import pprint; pprint.pprint(users)
```

**Console output:**

```text
{'name': 'Alice', 'role': 'admin'}
```

---

### 🐹 Go (Golang)

IntelliLog handles Go structs beautifully by automatically using the `%+v` formatting verb.

**Your code:**

```go
// Highlight "userData" → press shortcut
userData := User{Name: "Alice", Role: "Admin"}
```

**After pressing the shortcut (IntelliLog inserts):**

```go
userData := User{Name: "Alice", Role: "Admin"}
fmt.Printf("🎯 userData: %+v\n", userData)
```

**Console output:**

```text
🎯 userData: {Name:Alice Role:Admin}
```

---

### 🐘 PHP

IntelliLog knows when to use `echo`, `print_r`, `var_dump`, or even `error_log` in PHP.

**Your code:**

```php
// Highlight "$dbError" → press shortcut
$dbError = ["code" => 500, "msg" => "Connection failed"];
```

**After pressing the shortcut (IntelliLog inserts):**

```php
$dbError = ["code" => 500, "msg" => "Connection failed"];
error_log("🎯 dbError: " . print_r($dbError, true));
```

**Console output (in php error log):**

```text
🎯 dbError: Array
(
    [code] => 500
    [msg] => Connection failed
)
```

---

## Settings

Customize IntelliLog's output via VS Code settings (`Cmd+,` → search `intellilog`):

| Setting                | Default | Description                                    |
| :--------------------- | :------ | :--------------------------------------------- |
| `intellilog.logPrefix`   | `🎯`    | Prefix inserted before the variable name       |
| `intellilog.insertArrow` | `true`  | Whether to insert `=>` after the variable name |

---

## Requirements

- VS Code **1.90.0** or higher

---

## Author

Made with ❤️ by [Shubham Tiwari](https://github.com/shubtiwari)
