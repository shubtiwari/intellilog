import { LanguageProvider, IntelliLogConfig, FunctionInfo, BodyStyle } from "./types";
import {
  escapeString, extractGroup, hasToken, IDENTIFIER_PATH, indexOfTopLevel, labelText,
  nameTokens, paramsAfter, splitTopLevel, splitVariables,
} from "./utils";

const MARKER = "// intellilog";
const str = (s: string) => `'${escapeString(s, "'")}'`;

type ConsoleMethod = "log" | "error" | "warn" | "trace" | "table" | "dir";

const NOT_FUNCTION_NAMES = new Set([
  "if", "for", "while", "switch", "catch", "with", "return", "function", "else", "do",
  "new", "typeof", "await", "yield", "const", "let", "var", "import", "export",
]);

const FUNCTION_PATTERNS: RegExp[] = [
  // function foo(…) / export default async function* foo<T>(…)
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?/,
  // const foo = (…) => / const foo: Fn = async function (…)
  /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(?:async\s+)?(?:function\b\s*\*?\s*(?:[A-Za-z_$][\w$]*)?)?/,
  // class property: handleClick = (…) =>
  /^(?:(?:public|private|protected|static|readonly|override|declare)\s+)*(#?[A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(?:async\s+)?/,
  // method: async foo(…) { / static get bar() {
  /^(?:(?:public|private|protected|static|async|override|abstract|get|set)\s+)*\*?\s*(#?[A-Za-z_$][\w$]*)\s*\??/,
];

export class JavascriptProvider implements LanguageProvider {
  supportedLanguages = ["javascript", "typescript", "javascriptreact", "typescriptreact"];
  commentToken = "//" as const;
  bodyStyle: BodyStyle = "brace";

  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
    fileName: string,
    lineNumber: number,
  ): string {
    const { prefix, suffix } = config;
    const location = `[${fileName}:${lineNumber}]`;
    const expr = selectedText.trim();

    // Multi-variable: "userId, email, role"
    const variables = splitVariables(expr, IDENTIFIER_PATH);
    if (variables) {
      // Shorthand `{ a }` only works for plain identifiers; member paths need a key.
      const fields = variables.map((v) => (/^[\w$]+$/.test(v) ? v : `${str(v)}: ${v}`)).join(", ");
      if (config.structuredOutput) {
        return `${indentation}console.log(JSON.stringify({ _src: ${str(location)}, ${fields} }, null, 2)); ${MARKER}\n`;
      }
      return `${indentation}console.log(${str(`${prefix} ${location} ${variables.join(", ")}${suffix}`)}, { ${fields} }); ${MARKER}\n`;
    }

    const method = this.inferConsoleMethod(hoverText, expr);
    const name = labelText(this.formatSelectedVariable(expr));

    // Structured JSON output mode — only methods that print their argument.
    if (config.structuredOutput) {
      const level = method === "error" || method === "warn" ? method : "log";
      const levelField = level === "log" ? "" : `_level: '${level}', `;
      // Error's fields are non-enumerable, so JSON.stringify would emit `{}`.
      const replacer = level === "error" ? "(k, v) => v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v" : "null";
      return `${indentation}console.${level}(JSON.stringify({ _src: ${str(location)}, ${levelField}${str(name)}: ${expr} }, ${replacer}, 2)); ${MARKER}\n`;
    }

    const label = str(`${prefix} ${location} ${name}${suffix}`);

    // console.table(data, columns) and console.dir(obj, options) only print their
    // first argument, so the label goes on its own console.log.
    if (method === "table") {
      return `${indentation}console.log(${label}); console.table(${expr}); ${MARKER}\n`;
    }
    if (method === "dir") {
      return `${indentation}console.log(${label}); console.dir(${expr}, { depth: null }); ${MARKER}\n`;
    }
    return `${indentation}console.${method}(${label}, ${expr}); ${MARKER}\n`;
  }

  parseFunction(signature: string): FunctionInfo | null {
    const s = signature.trim();
    for (const pattern of FUNCTION_PATTERNS) {
      const m = s.match(pattern);
      if (!m) { continue; }
      const name = m[1] ?? "anonymous";
      if (NOT_FUNCTION_NAMES.has(name)) { continue; }

      // Single bare parameter: `const f = async x => {`
      const bare = s.slice(m[0].length).match(/^\s*([A-Za-z_$][\w$]*)\s*=>/);
      if (bare) { return { name, params: [bare[1]] }; }

      const raw = paramsAfter(s, m[0].length);
      if (raw === null) { continue; }
      return { name, params: splitTopLevel(raw, ",", { angles: true }).flatMap(jsBindings) };
    }
    return null;
  }

  buildFunctionEntryLog(info: FunctionInfo, indentation: string, config: IntelliLogConfig, fileName: string, lineNumber: number): string {
    const label = str(`${config.prefix} [${fileName}:${lineNumber}] → ${info.name} called`);
    const params = info.params.length > 0 ? `, { ${info.params.join(", ")} }` : "";
    return `${indentation}console.log(${label}${params}); ${MARKER}\n`;
  }

  private inferConsoleMethod(hoverText: string, expr: string): ConsoleMethod {
    // Match whole words of the name so `referrer`, `country` or `timestamp` don't misfire.
    const tokens = nameTokens(expr);
    if (hasToken(tokens, "err", "error", "errors", "exception", "exc", "catch")) { return "error"; }
    if (hasToken(tokens, "trace", "stack", "stacktrace", "backtrace")) { return "trace"; }
    if (hasToken(tokens, "obj", "object")) { return "dir"; }
    if (expr.startsWith("[")) { return "table"; }

    if (/:\s*\w*Error\b/.test(hoverText)) { return "error"; }
    if (/\[\]|\b(?:Readonly)?Array<|\bRecord</.test(hoverText)) { return "table"; }
    if (/\bPromise</.test(hoverText)) { return "warn"; }
    return "log";
  }

  private formatSelectedVariable(selectedText: string): string {
    let s = selectedText;
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      s = s.substring(1, s.length - 1).trim();
    }
    return s;
  }
}

/** Names bound by one parameter, including destructured ones: `{ a, b: c = 1 }: Props` → [a, c]. */
function jsBindings(param: string): string[] {
  let p = param.trim()
    .replace(/^@[\w.]+(?:\([^)]*\))?\s*/, "")
    .replace(/^(?:(?:public|private|protected|readonly|override)\s+)+/, "")
    .replace(/^\.\.\./, "");

  if (p.startsWith("{") || p.startsWith("[")) {
    const group = extractGroup(p, 0);
    if (!group) { return []; }
    return splitTopLevel(group.inner).flatMap((element) => {
      let e = element.replace(/^\.\.\./, "");
      const eq = indexOfTopLevel(e, "=");
      if (eq >= 0) { e = e.slice(0, eq); }
      const colon = p.startsWith("{") ? indexOfTopLevel(e, ":") : -1;
      return jsBindings(colon >= 0 ? e.slice(colon + 1) : e);
    });
  }

  const eq = indexOfTopLevel(p, "=", { angles: true });
  if (eq >= 0) { p = p.slice(0, eq); }
  const colon = indexOfTopLevel(p, ":", { angles: true });
  if (colon >= 0) { p = p.slice(0, colon); }
  p = p.replace(/\?$/, "").trim();
  return /^[A-Za-z_$][\w$]*$/.test(p) && p !== "this" ? [p] : [];
}
