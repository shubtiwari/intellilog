import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

const MARKER = "# intellilog";

export class RubyProvider implements LanguageProvider {
  supportedLanguages = ["ruby"];

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
      const parts = variables.map((v) => `${v}: \#{${v}}`).join(", ");
      return `${indentation}puts "${prefix} ${location} ${parts}" ${MARKER}\n`;
    }

    const lowerText = selectedText.toLowerCase();

    // Errors / exceptions
    if (lowerText.includes("err") || lowerText.includes("exception")) {
      return `${indentation}puts "${prefix} ${location} Error${suffix} \#{${selectedText}.message}" ${MARKER}\n${indentation}puts ${selectedText}.backtrace.first(5).join("\\n") ${MARKER}\n`;
    }

    // JSON payloads / hashes
    if (lowerText.includes("payload") || lowerText.includes("json") || lowerText.includes("hash") || hoverText.includes("Hash")) {
      return `${indentation}require 'json'; puts "${prefix} ${location} ${selectedText}${suffix}\\n\#{JSON.pretty_generate(${selectedText})}" ${MARKER}\n`;
    }

    // Arrays / collections
    if (lowerText.includes("arr") || lowerText.includes("list") || lowerText.includes("items") || hoverText.includes("Array")) {
      return `${indentation}puts "${prefix} ${location} ${selectedText}${suffix} \#{${selectedText}.inspect}" ${MARKER}\n`;
    }

    // Object inspection (pp for complex objects)
    if (lowerText.includes("obj") || lowerText.includes("data") || lowerText.includes("result")) {
      return `${indentation}puts "${prefix} ${location} ${selectedText}${suffix}"; pp ${selectedText} ${MARKER}\n`;
    }

    // Default
    return `${indentation}puts "${prefix} ${location} ${selectedText}${suffix} \#{${selectedText}.inspect}" ${MARKER}\n`;
  }
}
