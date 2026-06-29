import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

const MARKER = "// intellilog";

export class RustProvider implements LanguageProvider {
  supportedLanguages = ["rust"];

  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
    fileName: string,
    lineNumber: number,
  ): string {
    const prefix = getPrefix(config);
    const location = `[${fileName}:${lineNumber}]`;
    const { suffix } = config;

    // Multi-variable: "user_id, email, role"
    const variables = selectedText.split(",").map((v) => v.trim()).filter(Boolean);
    if (variables.length > 1) {
      const fmtStr = variables.map((v) => `${v}={:?}`).join(", ");
      return `${indentation}println!("${prefix} ${location} ${fmtStr}", ${variables.join(", ")}); ${MARKER}\n`;
    }

    const lowerText = selectedText.toLowerCase();

    // Errors — use eprintln! to stderr
    if (lowerText.includes("err") || lowerText.includes("error") || hoverText.includes("Error") || hoverText.includes("Result<")) {
      return `${indentation}eprintln!("${prefix} ${location} Error${suffix} {:?}", ${selectedText}); ${MARKER}\n`;
    }

    // Structs / complex types — pretty debug {:#?}
    if (
      lowerText.includes("struct") || lowerText.includes("config") ||
      lowerText.includes("state") || hoverText.includes("struct") ||
      hoverText.includes("Vec<") || hoverText.includes("HashMap")
    ) {
      return `${indentation}println!("${prefix} ${location} ${selectedText}${suffix}\\n{:#?}", ${selectedText}); ${MARKER}\n`;
    }

    // dbg! for quick inline inspection (also returns the value)
    if (lowerText.includes("dbg") || lowerText.includes("debug")) {
      return `${indentation}dbg!(&${selectedText}); ${MARKER}\n`;
    }

    // Default
    return `${indentation}println!("${prefix} ${location} ${selectedText}${suffix} {:?}", ${selectedText}); ${MARKER}\n`;
  }
}
