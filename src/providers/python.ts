import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

export class PythonProvider implements LanguageProvider {
  supportedLanguages = ["python"];

  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
  ): string {
    const cleanedString = this.formatSelectedVariable(selectedText);
    const { suffix } = config;

    const lowerText = cleanedString.toLowerCase();

    // Type inspection
    if (lowerText.includes("type") || lowerText.includes("check")) {
      return `${indentation}print(f"${getPrefix("debug", config)} type(${cleanedString})${suffix} {type(${selectedText})}")\n`;
    }

    // JSON dump
    if (lowerText.includes("payload") || lowerText.includes("json")) {
      return `${indentation}import json; print(f"${getPrefix("log", config)} ${cleanedString}${suffix}\\n{json.dumps(${selectedText}, indent=2)}")\n`;
    }

    // Errors
    if (lowerText.includes("err") || lowerText.includes("exception")) {
      return `${indentation}import traceback; traceback.print_exc()\n`;
    }

    // Pretty Print (Dicts/Lists)
    if (
      lowerText.includes("users") ||
      lowerText.includes("data") ||
      lowerText.includes("dict") ||
      lowerText.includes("list") ||
      hoverText.includes("dict") ||
      hoverText.includes("list")
    ) {
      return `${indentation}import pprint; pprint.pprint(${selectedText})\n`;
    }

    // Default
    return `${indentation}print(f"${getPrefix("log", config)} ${cleanedString}${suffix} {${selectedText}}")\n`;
  }

  private formatSelectedVariable(selectedText: string): string {
    let cleanedString = selectedText;
    if (
      (cleanedString.startsWith("{") && cleanedString.endsWith("}")) ||
      (cleanedString.startsWith("[") && cleanedString.endsWith("]"))
    ) {
      cleanedString = cleanedString
        .substring(1, cleanedString.length - 1)
        .trim();
    }
    return cleanedString;
  }
}
