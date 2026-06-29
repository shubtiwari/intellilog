import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

const MARKER = "# intellilog";

export class PythonProvider implements LanguageProvider {
  supportedLanguages = ["python"];

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
      if (config.structuredOutput) {
        const dictPairs = variables.map((v) => `'${v}': ${v}`).join(", ");
        return `${indentation}import json; print(json.dumps({'_src': '${location}', ${dictPairs}}, indent=2, default=str)) ${MARKER}\n`;
      }
      // Python 3.8+ f-string {var=} syntax: prints "var=value"
      const fVars = variables.map((v) => `{${v}=}`).join(", ");
      return `${indentation}print(f"${prefix} ${location} ${fVars}") ${MARKER}\n`;
    }

    const cleanedString = this.formatSelectedVariable(selectedText);
    const lowerText = cleanedString.toLowerCase();

    // Structured JSON output mode
    if (config.structuredOutput) {
      return `${indentation}import json; print(json.dumps({'_src': '${location}', '${cleanedString}': ${selectedText}}, indent=2, default=str)) ${MARKER}\n`;
    }

    if (lowerText.includes("type") || lowerText.includes("check")) {
      return `${indentation}print(f"${prefix} ${location} type(${cleanedString})${suffix} {type(${selectedText})}") ${MARKER}\n`;
    }
    if (lowerText.includes("payload") || lowerText.includes("json")) {
      return `${indentation}import json; print(f"${prefix} ${location} ${cleanedString}${suffix}\\n{json.dumps(${selectedText}, indent=2)}") ${MARKER}\n`;
    }
    if (lowerText.includes("err") || lowerText.includes("exception")) {
      return `${indentation}print(f"${prefix} ${location} Exception:") ${MARKER}\n${indentation}import traceback; traceback.print_exc() ${MARKER}\n`;
    }
    if (
      lowerText.includes("users") || lowerText.includes("data") ||
      lowerText.includes("dict") || lowerText.includes("list") ||
      hoverText.includes("dict") || hoverText.includes("list")
    ) {
      return `${indentation}print(f"${prefix} ${location} ${cleanedString}${suffix}") ${MARKER}\n${indentation}import pprint; pprint.pprint(${selectedText}) ${MARKER}\n`;
    }

    return `${indentation}print(f"${prefix} ${location} ${cleanedString}${suffix} {${selectedText}}") ${MARKER}\n`;
  }

  private formatSelectedVariable(selectedText: string): string {
    let s = selectedText;
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      s = s.substring(1, s.length - 1).trim();
    }
    return s;
  }
}
