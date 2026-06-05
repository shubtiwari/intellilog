import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

export class PhpProvider implements LanguageProvider {
  supportedLanguages = ["php"];

  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
  ): string {
    const cleanedString = this.formatSelectedVariable(selectedText);
    const { suffix } = config;

    const lowerText = cleanedString.toLowerCase();

    // Die/Exit
    if (lowerText.includes("die") || lowerText.includes("exit")) {
      return `${indentation}die(var_dump(${selectedText}));\n`;
    }

    // Errors
    if (lowerText.includes("err") || lowerText.includes("error")) {
      return `${indentation}error_log("${getPrefix("error", config)} ${cleanedString}${suffix} " . print_r(${selectedText}, true));\n`;
    }

    // Deep Inspect
    if (lowerText.includes("dump") || lowerText.includes("var")) {
      return `${indentation}var_dump(${selectedText});\n`;
    }

    // Array / Objects
    if (
      lowerText.includes("users") ||
      lowerText.includes("data") ||
      lowerText.includes("arr") ||
      hoverText.includes("array")
    ) {
      return `${indentation}print_r(${selectedText});\n`;
    }

    // Default
    return `${indentation}echo "${getPrefix("log", config)} ${cleanedString}${suffix} " . ${selectedText} . "\\n";\n`;
  }

  private formatSelectedVariable(selectedText: string): string {
    let cleanedString = selectedText;
    // Strip leading $ for the print string output so it reads cleaner
    if (cleanedString.startsWith("$")) {
      cleanedString = cleanedString.substring(1);
    }
    return cleanedString;
  }
}
