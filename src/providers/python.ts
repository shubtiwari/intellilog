import { LanguageProvider, IntelliLogConfig, FunctionInfo, BodyStyle } from "./types";
import { escapeString, hasToken, IDENTIFIER_PATH, labelText, nameTokens, paramsAfter, splitTopLevel, splitVariables } from "./utils";

const MARKER = "# intellilog";
const str = (s: string) => `"${escapeString(s, '"')}"`;
/** Text for the literal part of an f-string: braces must be doubled. */
const fstr = (s: string) => escapeString(s, '"').replace(/\{/g, "{{").replace(/\}/g, "}}");

export class PythonProvider implements LanguageProvider {
  supportedLanguages = ["python"];
  commentToken = "#" as const;
  bodyStyle: BodyStyle = "colon";

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

    // Multi-variable: "user_id, email, role"
    const variables = splitVariables(expr, IDENTIFIER_PATH);
    if (variables) {
      if (config.structuredOutput) {
        const dictPairs = variables.map((v) => `${str(v)}: ${v}`).join(", ");
        return `${indentation}import json; print(json.dumps({"_src": ${str(location)}, ${dictPairs}}, indent=2, default=str)) ${MARKER}\n`;
      }
      // Python 3.8+ f-string {var=} syntax: prints "var=value"
      const fVars = variables.map((v) => `{${v}=}`).join(", ");
      return `${indentation}print(f"${fstr(`${prefix} ${location}`)} ${fVars}") ${MARKER}\n`;
    }

    const name = labelText(this.formatSelectedVariable(expr));
    const tokens = nameTokens(expr);
    const label = `${prefix} ${location} ${name}${suffix}`;

    // Structured JSON output mode
    if (config.structuredOutput) {
      return `${indentation}import json; print(json.dumps({"_src": ${str(location)}, ${str(name)}: ${expr}}, indent=2, default=str)) ${MARKER}\n`;
    }

    if (hasToken(tokens, "type")) {
      return `${indentation}print(${str(`${prefix} ${location} type(${name})${suffix}`)}, type(${expr})) ${MARKER}\n`;
    }
    if (hasToken(tokens, "payload", "json")) {
      return `${indentation}import json; print(${str(label)}, json.dumps(${expr}, indent=2, default=str), sep="\\n") ${MARKER}\n`;
    }
    if (hasToken(tokens, "err", "error", "exception", "exc")) {
      // Print the value itself, plus its traceback when it actually is an exception.
      return `${indentation}import traceback; print(${str(label)}, repr(${expr})); isinstance(${expr}, BaseException) and traceback.print_exception(type(${expr}), ${expr}, ${expr}.__traceback__) ${MARKER}\n`;
    }
    if (
      hasToken(tokens, "users", "data", "dict", "list", "items", "records", "rows") ||
      /:\s*(?:dict|list|Dict|List)\b/.test(hoverText)
    ) {
      return `${indentation}import pprint; print(${str(label)}); pprint.pprint(${expr}) ${MARKER}\n`;
    }

    // f-strings can't contain the quote char or backslashes in the expression (< 3.12).
    if (!/["\\{}\n]/.test(expr)) {
      return `${indentation}print(f"${fstr(label)} {${expr}}") ${MARKER}\n`;
    }
    return `${indentation}print(${str(label)}, ${expr}) ${MARKER}\n`;
  }

  parseFunction(signature: string): FunctionInfo | null {
    const m = signature.trim().match(/^(?:async\s+)?def\s+(\w+)/);
    if (!m) { return null; }
    const raw = paramsAfter(signature.trim(), m[0].length);
    if (raw === null) { return null; }
    const params = splitTopLevel(raw)
      .map((p) => p.replace(/^\*{1,2}/, "").split(/[:=]/)[0].trim())
      .filter((p) => /^[A-Za-z_]\w*$/.test(p) && p !== "self" && p !== "cls");
    return { name: m[1], params };
  }

  buildFunctionEntryLog(info: FunctionInfo, indentation: string, config: IntelliLogConfig, fileName: string, lineNumber: number): string {
    const label = fstr(`${config.prefix} [${fileName}:${lineNumber}] → ${info.name} called`);
    const params = info.params.length > 0 ? ` | ${info.params.map((p) => `${p}={${p}!r}`).join(", ")}` : "";
    return `${indentation}print(f"${label}${params}") ${MARKER}\n`;
  }

  private formatSelectedVariable(selectedText: string): string {
    let s = selectedText;
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      s = s.substring(1, s.length - 1).trim();
    }
    return s;
  }
}
