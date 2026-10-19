import { LanguageProvider, IntelliLogConfig, FunctionInfo, BodyStyle } from "./types";
import { escapeString, hasToken, IDENTIFIER_PATH, indexOfTopLevel, labelText, nameTokens, paramsAfter, splitTopLevel, splitVariables } from "./utils";

const MARKER = "// intellilog";
// `'` starts lifetimes (`&'a str`) in Rust, not strings.
const QUOTES = `"`;
/** Literal text for a format string: quotes escaped and braces doubled. */
const fmt = (s: string) => escapeString(s, '"').replace(/\{/g, "{{").replace(/\}/g, "}}");

export class RustProvider implements LanguageProvider {
  supportedLanguages = ["rust"];
  commentToken = "//" as const;
  bodyStyle: BodyStyle = "brace";
  quotes = QUOTES;

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
      const fmtStr = variables.map((v) => `${v}={:?}`).join(", ");
      return `${indentation}println!("${fmt(`${prefix} ${location}`)} ${fmtStr}", ${variables.join(", ")}); ${MARKER}\n`;
    }

    const tokens = nameTokens(expr);
    const head = fmt(`${prefix} ${location} ${labelText(expr)}${suffix}`);

    // Errors — use eprintln! to stderr
    if (hasToken(tokens, "err", "error", "errors") || expr === "e" || hoverText.includes("Error") || hoverText.includes("Result<")) {
      return `${indentation}eprintln!("${head} {:?}", ${expr}); ${MARKER}\n`;
    }

    // Structs / complex types — pretty debug {:#?}
    if (
      hasToken(tokens, "struct", "config", "cfg", "state", "settings") ||
      hoverText.includes("struct") || hoverText.includes("Vec<") || hoverText.includes("HashMap")
    ) {
      return `${indentation}println!("${head}\\n{:#?}", ${expr}); ${MARKER}\n`;
    }

    // dbg! for quick inline inspection (prints file:line and the expression itself)
    if (hasToken(tokens, "dbg", "debug")) {
      return `${indentation}dbg!(&${expr}); ${MARKER}\n`;
    }

    return `${indentation}println!("${head} {:?}", ${expr}); ${MARKER}\n`;
  }

  parseFunction(signature: string): FunctionInfo | null {
    const s = signature.trim();
    const m = s.match(/^(?:pub(?:\([^)]*\))?\s+)?(?:(?:const|async|unsafe|extern(?:\s+"[^"]*")?)\s+)*fn\s+(\w+)/);
    if (!m) { return null; }
    const raw = paramsAfter(s, m[0].length, QUOTES);
    if (raw === null) { return null; }
    const params = splitTopLevel(raw, ",", { angles: true, quotes: QUOTES })
      .map((p) => {
        const colon = indexOfTopLevel(p, ":", { angles: true, quotes: QUOTES });
        return (colon >= 0 ? p.slice(0, colon) : p).trim().replace(/^&?\s*(?:mut\s+)?/, "");
      })
      .filter((p) => /^[A-Za-z_]\w*$/.test(p) && p !== "self" && p !== "_");
    return { name: m[1], params };
  }

  buildFunctionEntryLog(info: FunctionInfo, indentation: string, config: IntelliLogConfig, fileName: string, lineNumber: number): string {
    const head = fmt(`${config.prefix} [${fileName}:${lineNumber}] → ${info.name} called`);
    if (info.params.length > 0) {
      const fmtStr = info.params.map((p) => `${p}={:?}`).join(", ");
      return `${indentation}println!("${head} ${fmtStr}", ${info.params.join(", ")}); ${MARKER}\n`;
    }
    return `${indentation}println!("${head}"); ${MARKER}\n`;
  }
}
