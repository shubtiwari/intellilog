import { LanguageProvider, IntelliLogConfig, FunctionInfo, BodyStyle } from "./types";
import { escapeString, extractGroup, hasToken, labelText, nameTokens, splitTopLevel, splitVariables } from "./utils";

const MARKER = "# intellilog";
/** Literal text inside a double-quoted Ruby string: `#` must not start an interpolation. */
const lit = (s: string) => escapeString(s, '"').replace(/#/g, "\\#");
const RUBY_VARIABLE = /^@{0,2}[A-Za-z_]\w*[?!]?(?:\.[A-Za-z_]\w*[?!]?)*$/;

export class RubyProvider implements LanguageProvider {
  supportedLanguages = ["ruby"];
  commentToken = "#" as const;
  bodyStyle: BodyStyle = "line";

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
    const variables = splitVariables(expr, RUBY_VARIABLE);
    if (variables) {
      const parts = variables.map((v) => `${lit(v)}: #{${v}.inspect}`).join(", ");
      return `${indentation}puts "${lit(`${prefix} ${location}`)} ${parts}" ${MARKER}\n`;
    }

    const tokens = nameTokens(expr);
    const label = lit(`${prefix} ${location} ${labelText(expr)}${suffix}`);

    // Errors / exceptions — backtrace is nil until the exception has been raised.
    if (hasToken(tokens, "err", "error", "exception", "exc") || expr === "e") {
      return `${indentation}puts "${label} #{${expr}.inspect}"; puts ${expr}.backtrace.first(5).join("\\n") if ${expr}.respond_to?(:backtrace) && ${expr}.backtrace ${MARKER}\n`;
    }

    // JSON payloads / hashes
    if (hasToken(tokens, "payload", "json", "hash", "params") || hoverText.includes("Hash")) {
      return `${indentation}require 'json'; puts "${label}\\n#{JSON.pretty_generate(${expr})}" ${MARKER}\n`;
    }

    // Object inspection (pp for complex objects)
    if (hasToken(tokens, "obj", "object", "data", "result", "results", "record")) {
      return `${indentation}puts "${label}"; pp ${expr} ${MARKER}\n`;
    }

    // Default — arrays and scalars both read well with #inspect
    return `${indentation}puts "${label} #{${expr}.inspect}" ${MARKER}\n`;
  }

  parseFunction(signature: string): FunctionInfo | null {
    const s = signature.trim();
    const m = s.match(/^def\s+(?:self\.)?([A-Za-z_]\w*[?!=]?)/);
    if (!m) { return null; }
    const rest = s.slice(m[0].length);
    const open = rest.search(/\S/);
    const raw = rest[open] === "("
      ? extractGroup(rest, open)?.inner ?? ""
      : rest.split(";")[0]; // `def greet name, greeting = "hi"`
    const params = splitTopLevel(raw)
      .map((p) => p.replace(/^(?:\*{1,2}|&)/, "").split(/[\s=:]/)[0])
      .filter((p) => /^[A-Za-z_]\w*$/.test(p));
    return { name: m[1], params };
  }

  buildFunctionEntryLog(info: FunctionInfo, indentation: string, config: IntelliLogConfig, fileName: string, lineNumber: number): string {
    const head = lit(`${config.prefix} [${fileName}:${lineNumber}] → ${info.name} called`);
    const params = info.params.length > 0 ? ` | ${info.params.map((p) => `${p}=#{${p}.inspect}`).join(", ")}` : "";
    return `${indentation}puts "${head}${params}" ${MARKER}\n`;
  }
}
