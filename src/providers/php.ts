import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

const MARKER = "// intellilog";

export class PhpProvider implements LanguageProvider {
  supportedLanguages = ["php"];

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

    // Multi-variable: "$userId, $email, $role"
    const variables = selectedText.split(",").map((v) => v.trim()).filter(Boolean);
    if (variables.length > 1) {
      const labelParts = variables.map((v) => `${v.replace("$", "")}: ${v}`).join(", ");
      return `${indentation}echo "${prefix} ${location} ${labelParts}\\n"; ${MARKER}\n`;
    }

    const cleanedString = this.formatSelectedVariable(selectedText);
    const lowerText = cleanedString.toLowerCase();

    if (lowerText.includes("die") || lowerText.includes("exit")) {
      return `${indentation}die(var_dump(${selectedText})); ${MARKER}\n`;
    }
    if (lowerText.includes("err") || lowerText.includes("error")) {
      return `${indentation}error_log("${prefix} ${location} ${cleanedString}${suffix} " . print_r(${selectedText}, true)); ${MARKER}\n`;
    }
    if (lowerText.includes("dump") || lowerText.includes("var")) {
      return `${indentation}var_dump(${selectedText}); ${MARKER}\n`;
    }
    if (lowerText.includes("users") || lowerText.includes("data") || lowerText.includes("arr") || hoverText.includes("array")) {
      return `${indentation}print_r(${selectedText}); ${MARKER}\n`;
    }

    return `${indentation}echo "${prefix} ${location} ${cleanedString}${suffix} " . ${selectedText} . "\\n"; ${MARKER}\n`;
  }

  private formatSelectedVariable(selectedText: string): string {
    return selectedText.startsWith("$") ? selectedText.substring(1) : selectedText;
  }
}
