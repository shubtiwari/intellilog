import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

const MARKER = "// intellilog";

export class GoProvider implements LanguageProvider {
  supportedLanguages = ["go"];

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

    // Multi-variable: "userId, email, role"
    const variables = selectedText.split(",").map((v) => v.trim()).filter(Boolean);
    if (variables.length > 1) {
      const fmtStr = variables.map((v) => `${v}=%v`).join(" ");
      return `${indentation}fmt.Printf("${prefix} ${location} ${fmtStr}\\n", ${variables.join(", ")}) ${MARKER}\n`;
    }

    const cleanedString = selectedText;
    const lowerText = cleanedString.toLowerCase();

    if (lowerText.includes("body") || lowerText.includes("payload") || lowerText.includes("json")) {
      return `${indentation}b, _ := json.MarshalIndent(${selectedText}, "", "  ") ${MARKER}\n${indentation}fmt.Printf("${prefix} ${location} ${cleanedString}${suffix}\\n%s\\n", string(b)) ${MARKER}\n`;
    }
    if (lowerText.includes("err") || hoverText.includes("error")) {
      return `${indentation}log.Printf("${prefix} ${location} Error in ${cleanedString}: %v\\n", ${selectedText}) ${MARKER}\n`;
    }
    if (lowerText.includes("type")) {
      return `${indentation}fmt.Printf("${prefix} ${location} Type of ${cleanedString}${suffix} %T\\n", ${selectedText}) ${MARKER}\n`;
    }
    if (lowerText.includes("user") || lowerText.includes("data") || lowerText.includes("obj") || hoverText.includes("struct") || hoverText.includes("map[")) {
      return `${indentation}fmt.Printf("${prefix} ${location} ${cleanedString}${suffix} %+v\\n", ${selectedText}) ${MARKER}\n`;
    }

    return `${indentation}fmt.Printf("${prefix} ${location} ${cleanedString}${suffix} %v\\n", ${selectedText}) ${MARKER}\n`;
  }
}
