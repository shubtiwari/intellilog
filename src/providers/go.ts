import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

export class GoProvider implements LanguageProvider {
  supportedLanguages = ["go"];

  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
  ): string {
    const cleanedString = this.formatSelectedVariable(selectedText);
    const { suffix } = config;

    const lowerText = cleanedString.toLowerCase();

    // JSON representation
    if (lowerText.includes("body") || lowerText.includes("payload") || lowerText.includes("json")) {
      return `${indentation}b, _ := json.MarshalIndent(${selectedText}, "", "  ")\n${indentation}fmt.Printf("${getPrefix("log", config)} ${cleanedString}${suffix}\\n%s\\n", string(b))\n`;
    }

    // Errors
    if (lowerText.includes("err") || hoverText.includes("error")) {
      return `${indentation}log.Printf("${getPrefix("error", config)} Error in ${cleanedString}: %v\\n", ${selectedText})\n`;
    }

    // Type inspection
    if (lowerText.includes("type")) {
      return `${indentation}fmt.Printf("${getPrefix("debug", config)} Type of ${cleanedString}${suffix} %T\\n", ${selectedText})\n`;
    }

    // Detailed Structs/Maps
    if (
      lowerText.includes("user") ||
      lowerText.includes("data") ||
      lowerText.includes("obj") ||
      hoverText.includes("struct") ||
      hoverText.includes("map[")
    ) {
      return `${indentation}fmt.Printf("${getPrefix("table", config)} ${cleanedString}${suffix} %+v\\n", ${selectedText})\n`;
    }

    // Default
    return `${indentation}fmt.Printf("${getPrefix("log", config)} ${cleanedString}${suffix} %v\\n", ${selectedText})\n`;
  }

  private formatSelectedVariable(selectedText: string): string {
    return selectedText;
  }
}
