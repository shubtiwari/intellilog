import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

const MARKER = "// intellilog";

export class DartProvider implements LanguageProvider {
  supportedLanguages = ["dart"];

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
      const parts = variables.map((v) => `${v}: \$${v}`).join(", ");
      return `${indentation}debugPrint('${prefix} ${location} ${parts}'); ${MARKER}\n`;
    }

    const lowerText = selectedText.toLowerCase();

    if (lowerText.includes("stacktrace") || lowerText.includes("stack_trace")) {
      return `${indentation}debugPrint('${prefix} ${location} StackTrace: \$$selectedText'); ${MARKER}\n`;
    }
    if (lowerText.includes("err") || lowerText.includes("exception")) {
      return `${indentation}debugPrint('${prefix} ${location} Error${suffix} \$$selectedText'); ${MARKER}\n${indentation}debugPrint('${prefix} ${location} StackTrace: \${StackTrace.current}'); ${MARKER}\n`;
    }
    if (lowerText.includes("payload") || lowerText.includes("json") || lowerText.includes("map") || hoverText.includes("Map<")) {
      return `${indentation}debugPrint('${prefix} ${location} ${selectedText}${suffix}\\n\${const JsonEncoder.withIndent("  ").convert($selectedText)}'); ${MARKER}\n`;
    }
    if (lowerText.includes("widget") || lowerText.includes("context") || hoverText.includes("Widget") || hoverText.includes("BuildContext")) {
      return `${indentation}debugPrint('${prefix} ${location} ${selectedText}${suffix} \${$selectedText.runtimeType}'); ${MARKER}\n`;
    }
    if (lowerText.includes("list") || lowerText.includes("items") || hoverText.includes("List<")) {
      return `${indentation}debugPrint('${prefix} ${location} ${selectedText}${suffix} [\${$selectedText.join(", ")}]'); ${MARKER}\n`;
    }

    return `${indentation}debugPrint('${prefix} ${location} ${selectedText}${suffix} \$$selectedText'); ${MARKER}\n`;
  }
}
