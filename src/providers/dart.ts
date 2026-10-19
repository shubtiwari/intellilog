import { LanguageProvider, IntelliLogConfig, FunctionInfo, ImportEdit, BodyStyle } from "./types";
import {
  escapeString, extractGroup, hasToken, IDENTIFIER_PATH, indexOfTopLevel, labelText,
  nameTokens, splitTopLevel, splitVariables,
} from "./utils";

const MARKER = "// intellilog";
/** Literal text inside a single-quoted Dart string: `$` must not start an interpolation. */
const lit = (s: string) => escapeString(s, "'").replace(/\$/g, "\\$");

const NOT_FUNCTION_NAMES = new Set(["if", "for", "while", "switch", "catch", "return", "assert", "super", "this", "await"]);

export class DartProvider implements LanguageProvider {
  supportedLanguages = ["dart"];
  commentToken = "//" as const;
  bodyStyle: BodyStyle = "brace";

  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
    fileName: string,
    lineNumber: number,
    documentText = "",
  ): string {
    const { prefix, suffix } = config;
    const location = `[${fileName}:${lineNumber}]`;
    const expr = selectedText.trim();
    const print = printFunction(documentText);
    // Always `${…}`: `$user.name` would only interpolate `user`.
    const emit = (text: string) => `${indentation}${print}('${text}'); ${MARKER}\n`;

    // Multi-variable: "userId, email, role"
    const variables = splitVariables(expr, IDENTIFIER_PATH);
    if (variables) {
      const parts = variables.map((v) => `${lit(v)}: \${${v}}`).join(", ");
      return emit(`${lit(`${prefix} ${location}`)} ${parts}`);
    }

    const tokens = nameTokens(expr);
    const head = lit(`${prefix} ${location}`);
    const name = lit(labelText(expr));
    const suf = lit(suffix);

    if (hasToken(tokens, "stacktrace") || (hasToken(tokens, "stack") && hasToken(tokens, "trace"))) {
      return emit(`${head} ${name}${suf}\\n\${${expr}}`);
    }
    if (hasToken(tokens, "err", "error", "exception", "exc") || expr === "e") {
      return emit(`${head} ${name}${suf} \${${expr}}`) + emit(`${head} StackTrace: \${StackTrace.current}`);
    }
    if (hasToken(tokens, "payload", "json", "map") || hoverText.includes("Map<")) {
      return emit(`${head} ${name}${suf}\\n\${const JsonEncoder.withIndent("  ").convert(${expr})}`);
    }
    if (hasToken(tokens, "widget", "context") || hoverText.includes("Widget") || hoverText.includes("BuildContext")) {
      return emit(`${head} ${name}${suf} \${${expr}.runtimeType}`);
    }
    return emit(`${head} ${name}${suf} \${${expr}}`);
  }

  parseFunction(signature: string): FunctionInfo | null {
    const s = signature.trim();
    // The name is the identifier right before the first top-level `(` (generics allowed):
    // `Future<void> load<T>(…)`, `Widget build(BuildContext context)`, `Foo.named(…)`.
    const open = indexOfTopLevel(s, "(", { angles: true });
    if (open < 0) { return null; }
    const m = s.slice(0, open).match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*(?:<[^()]*>)?\s*$/);
    if (!m || NOT_FUNCTION_NAMES.has(m[1])) { return null; }
    const group = extractGroup(s, open);
    if (!group) { return null; }

    // Flatten optional `[…]` and named `{…}` parameter groups.
    const params = splitTopLevel(group.inner, ",", { angles: true })
      .flatMap((p) => (p.startsWith("{") || p.startsWith("[") ? splitTopLevel(extractGroup(p, 0)?.inner ?? "", ",", { angles: true }) : [p]))
      .map(dartParamName)
      .filter(Boolean);
    return { name: m[1], params };
  }

  buildFunctionEntryLog(info: FunctionInfo, indentation: string, config: IntelliLogConfig, fileName: string, lineNumber: number, documentText = ""): string {
    const head = lit(`${config.prefix} [${fileName}:${lineNumber}] → ${info.name} called`);
    const params = info.params.length > 0 ? ` ${info.params.map((p) => `${p}=\${${p}}`).join(", ")}` : "";
    return `${indentation}${printFunction(documentText)}('${head}${params}'); ${MARKER}\n`;
  }

  getImportEdits(documentText: string, insertedCode: string): ImportEdit[] {
    if (!insertedCode.includes("JsonEncoder") || /import\s+['"]dart:convert['"]/.test(documentText)) { return []; }
    const lines = documentText.split(/\r?\n/);

    // After the last import (which may span lines until its `;`), else after `library`.
    let line = 0;
    const lastImport = lines.map((l) => /^\s*import\s/.test(l)).lastIndexOf(true);
    if (lastImport >= 0) {
      let end = lastImport;
      while (end < lines.length - 1 && !lines[end].includes(";")) { end++; }
      line = end + 1;
    } else {
      const library = lines.findIndex((l) => /^\s*library\b/.test(l));
      line = library >= 0 ? library + 1 : 0;
    }
    return [{ line, text: `import 'dart:convert'; ${MARKER}\n` }];
  }
}

/** `debugPrint` needs Flutter; plain Dart projects only have `print`. */
function printFunction(documentText: string): string {
  return /package:flutter\//.test(documentText) ? "debugPrint" : "print";
}

/** `required this.name`, `int count = 0`, `void Function(int) onTap` → name, count, onTap */
function dartParamName(param: string): string {
  let p = param.replace(/@\w+\s*/g, "").replace(/^required\s+/, "");
  const eq = indexOfTopLevel(p, "=", { angles: true });
  if (eq >= 0) { p = p.slice(0, eq); }
  const colon = indexOfTopLevel(p, ":", { angles: true }); // legacy `{int a: 1}` defaults
  if (colon >= 0) { p = p.slice(0, colon); }
  const last = p.trim().split(/\s+/).pop() ?? "";
  const name = last.replace(/^(?:this|super)\./, "");
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : "";
}
