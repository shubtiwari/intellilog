import { LanguageProvider, IntelliLogConfig, FunctionInfo, ImportEdit, BodyStyle } from "./types";
import { escapeString, hasToken, IDENTIFIER_PATH, labelText, nameTokens, paramsAfter, splitTopLevel, splitVariables } from "./utils";

const MARKER = "// intellilog";
/** Text for a Printf format string: quotes escaped and `%` doubled. */
const fmt = (s: string) => escapeString(s, '"').replace(/%/g, "%%");

const PACKAGES: [RegExp, string][] = [
  [/\bfmt\./, "fmt"],
  [/\blog\./, "log"],
  [/\bjson\./, "encoding/json"],
];

export class GoProvider implements LanguageProvider {
  supportedLanguages = ["go"];
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
      const fmtStr = variables.map((v) => `${v}=%v`).join(" ");
      return `${indentation}fmt.Printf("${fmt(`${prefix} ${location}`)} ${fmtStr}\\n", ${variables.join(", ")}) ${MARKER}\n`;
    }

    const name = fmt(labelText(expr));
    const tokens = nameTokens(expr);
    const head = `${fmt(`${prefix} ${location}`)} ${name}${fmt(suffix)}`;

    if (hasToken(tokens, "body", "payload", "json")) {
      // Inline closure so `b` never collides with a variable from an earlier log in the same scope.
      return `${indentation}fmt.Printf("${head}\\n%s\\n", func() string { b, _ := json.MarshalIndent(${expr}, "", "  "); return string(b) }()) ${MARKER}\n`;
    }
    if (hasToken(tokens, "err", "error", "errs", "errors") || /\berror\b/.test(hoverText)) {
      return `${indentation}log.Printf("${head} %v\\n", ${expr}) ${MARKER}\n`;
    }
    if (hasToken(tokens, "type", "kind")) {
      return `${indentation}fmt.Printf("${fmt(`${prefix} ${location}`)} type of ${name}${fmt(suffix)} %T\\n", ${expr}) ${MARKER}\n`;
    }
    if (
      hasToken(tokens, "user", "users", "data", "obj", "object", "struct", "config", "cfg", "state", "req", "resp") ||
      hoverText.includes("struct") || hoverText.includes("map[")
    ) {
      return `${indentation}fmt.Printf("${head} %+v\\n", ${expr}) ${MARKER}\n`;
    }

    return `${indentation}fmt.Printf("${head} %v\\n", ${expr}) ${MARKER}\n`;
  }

  parseFunction(signature: string): FunctionInfo | null {
    const s = signature.trim();
    const m = s.match(/^func\s+(?:\([^)]*\)\s*)?(\w+)/) ?? s.match(/^(?:var\s+)?(\w+)\s*:?=\s*func\b/);
    if (!m) { return null; }
    const raw = paramsAfter(s, m[0].length);
    if (raw === null) { return null; }

    // Go params are either all named (`a, b int, c string`) or all unnamed (`int, string`).
    const parts = splitTopLevel(raw).map((p) => p.split(/\s+/));
    const named = parts.some((tokens) => tokens.length > 1);
    const params = named ? parts.map((tokens) => tokens[0]).filter((p) => /^[A-Za-z_]\w*$/.test(p) && p !== "_") : [];
    return { name: m[1], params };
  }

  buildFunctionEntryLog(info: FunctionInfo, indentation: string, config: IntelliLogConfig, fileName: string, lineNumber: number): string {
    const head = fmt(`${config.prefix} [${fileName}:${lineNumber}] → ${info.name} called`);
    if (info.params.length > 0) {
      const fmtStr = info.params.map((p) => `${p}=%v`).join(" ");
      return `${indentation}fmt.Printf("${head} ${fmtStr}\\n", ${info.params.join(", ")}) ${MARKER}\n`;
    }
    return `${indentation}fmt.Println("${head}") ${MARKER}\n`;
  }

  /** Adds `import "fmt" // intellilog` lines so Delete All Logs removes them again. */
  getImportEdits(documentText: string, insertedCode: string): ImportEdit[] {
    const lines = documentText.split(/\r?\n/);
    const packageLine = lines.findIndex((l) => /^package\s+\w+/.test(l));
    if (packageLine < 0) { return []; }
    return PACKAGES
      .filter(([usage, pkg]) => usage.test(insertedCode) && !isImported(documentText, pkg))
      .map(([, pkg]) => ({ line: packageLine + 1, text: `import "${pkg}" ${MARKER}\n` }));
  }
}

function isImported(documentText: string, pkg: string): boolean {
  const escaped = pkg.replace(/[/.]/g, "\\$&");
  return new RegExp(`^\\s*(?:import\\s+)?(?:[\\w.]+\\s+)?"${escaped}"`, "m").test(documentText);
}
