import { LanguageProvider, IntelliLogConfig, FunctionInfo, BodyStyle } from "./types";
import { escapeString, hasToken, labelText, nameTokens, paramsAfter, splitTopLevel, splitVariables } from "./utils";

const MARKER = "// intellilog";
// Single-quoted PHP strings don't interpolate `$`, so labels are always literal.
const str = (s: string) => `'${escapeString(s, "'")}'`;
const PHP_VARIABLE = /^\$[A-Za-z_]\w*(?:->\w+)*$/;

export class PhpProvider implements LanguageProvider {
  supportedLanguages = ["php"];
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

    // Multi-variable: "$userId, $email, $role"
    const variables = splitVariables(expr, PHP_VARIABLE);
    if (variables) {
      const label = str(`${prefix} ${location} ${variables.map((v) => v.replace(/^\$/, "")).join(", ")}${suffix} `);
      const pairs = variables.map((v) => `${str(v.replace(/^\$/, ""))} => ${v}`).join(", ");
      return `${indentation}echo ${label} . print_r([${pairs}], true) . "\\n"; ${MARKER}\n`;
    }

    const name = labelText(this.formatSelectedVariable(expr));
    const tokens = nameTokens(name);
    const label = `${prefix} ${location} ${name}${suffix}`;

    if (hasToken(tokens, "err", "error", "errors", "exception", "exc") || name === "e") {
      return `${indentation}error_log(${str(`${label} `)} . print_r(${expr}, true)); ${MARKER}\n`;
    }
    if (hasToken(tokens, "dump", "var")) {
      return `${indentation}echo ${str(label)} . "\\n"; var_dump(${expr}); ${MARKER}\n`;
    }
    if (hasToken(tokens, "users", "data", "arr", "array", "list", "items", "rows") || /\barray\b/.test(hoverText)) {
      return `${indentation}echo ${str(label)} . "\\n" . print_r(${expr}, true) . "\\n"; ${MARKER}\n`;
    }

    // var_export shows scalars faithfully (false, null, '') unlike echo / print_r.
    return `${indentation}echo ${str(`${label} `)} . var_export(${expr}, true) . "\\n"; ${MARKER}\n`;
  }

  parseFunction(signature: string): FunctionInfo | null {
    const s = signature.trim();
    const m = s.match(/\bfunction\s*&?\s*(\w*)/);
    if (!m || m.index === undefined) { return null; }
    const raw = paramsAfter(s, m.index + m[0].length);
    if (raw === null) { return null; }
    // `int $a = 1`, `?Foo &$b`, `string ...$rest`, `private readonly int $c` → a, b, rest, c
    const params = splitTopLevel(raw)
      .map((p) => p.match(/\$(\w+)/)?.[1] ?? "")
      .filter(Boolean);
    return { name: m[1] || "closure", params };
  }

  buildFunctionEntryLog(info: FunctionInfo, indentation: string, config: IntelliLogConfig, fileName: string, lineNumber: number): string {
    const label = `${config.prefix} [${fileName}:${lineNumber}] → ${info.name} called`;
    if (info.params.length > 0) {
      const pairs = info.params.map((p) => `'${p}' => $${p}`).join(", ");
      return `${indentation}echo ${str(`${label} `)} . json_encode([${pairs}]) . "\\n"; ${MARKER}\n`;
    }
    return `${indentation}echo ${str(label)} . "\\n"; ${MARKER}\n`;
  }

  private formatSelectedVariable(selectedText: string): string {
    return selectedText.startsWith("$") ? selectedText.substring(1) : selectedText;
  }
}
