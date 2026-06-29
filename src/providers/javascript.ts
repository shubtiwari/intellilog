import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix } from "./colors";

const MARKER = "// intellilog";

export class JavascriptProvider implements LanguageProvider {
  supportedLanguages = ["javascript", "typescript", "javascriptreact", "typescriptreact"];

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

    // Multi-variable: "userId, email, role"
    const variables = selectedText.split(",").map((v) => v.trim()).filter(Boolean);
    if (variables.length > 1) {
      const label = variables.join(", ");
      const objSpread = variables.join(", ");
      if (config.structuredOutput) {
        return `${indentation}console.log(JSON.stringify({ _src: '${location}', ${objSpread} }, null, 2)); ${MARKER}\n`;
      }
      return `${indentation}console.log('${prefix} ${location} ${label}:', { ${objSpread} }); ${MARKER}\n`;
    }

    // Structured JSON output mode
    if (config.structuredOutput) {
      const varName = this.formatSelectedVariable(selectedText);
      const consoleMethod = this.inferConsoleMethod(hoverText, selectedText);
      const methodStr = consoleMethod === "log" ? "" : `"_level": "${consoleMethod}", `;
      return `${indentation}console.${consoleMethod}(JSON.stringify({ _src: '${location}', ${methodStr}"${varName}": ${selectedText} }, null, 2)); ${MARKER}\n`;
    }

    // Standard single-variable
    const consoleMethod = this.inferConsoleMethod(hoverText, selectedText);
    const cleanedString = this.formatSelectedVariable(selectedText);
    const { suffix } = config;

    if (consoleMethod === "time") {
      return `${indentation}console.time('${prefix} ${location} ${cleanedString}'); ${MARKER}\n${indentation}console.timeEnd('${prefix} ${location} ${cleanedString}'); ${MARKER}\n`;
    }
    if (consoleMethod === "group") {
      return `${indentation}console.group('${prefix} ${location} ${cleanedString}'); ${MARKER}\n`;
    }
    if (consoleMethod === "groupEnd") {
      return `${indentation}console.groupEnd(); ${MARKER}\n`;
    }
    if (consoleMethod === "count") {
      return `${indentation}console.count('${prefix} ${location} ${cleanedString}'); ${MARKER}\n`;
    }
    if (consoleMethod === "timeLog") {
      return `${indentation}console.timeLog('${prefix} ${location} ${cleanedString}', ${selectedText}); ${MARKER}\n`;
    }

    return `${indentation}console.${consoleMethod}('${prefix} ${location} ${cleanedString}${suffix}', ${selectedText}); ${MARKER}\n`;
  }

  private inferConsoleMethod(hoverText: string, selectedText: string): string {
    let method = "log";
    if (hoverText.includes("[]") || hoverText.includes("Array<") || hoverText.includes("Record<")) { method = "table"; }
    else if (hoverText.includes("Error")) { method = "error"; }
    else if (hoverText.includes("Promise<")) { method = "warn"; }

    const lower = selectedText.toLowerCase();
    if (lower.includes("err") || lower.includes("catch")) { return "error"; }
    if (lower.includes("trace") || lower.includes("stack")) { return "trace"; }
    if (lower.includes("timelog")) { return "timeLog"; }
    if (lower.includes("time") || lower.includes("perf") || lower.includes("duration")) { return "time"; }
    if (lower.includes("groupend")) { return "groupEnd"; }
    if (lower.includes("group")) { return "group"; }
    if (lower.includes("count")) { return "count"; }
    if (lower.includes("obj") || lower.includes("dir")) { return "dir"; }
    if (selectedText.startsWith("[") || selectedText.startsWith("{")) { return "table"; }

    return method;
  }

  private formatSelectedVariable(selectedText: string): string {
    let s = selectedText;
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      s = s.substring(1, s.length - 1).trim();
    }
    return s;
  }
}
