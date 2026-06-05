import { LanguageProvider, IntelliLogConfig } from "./types";
import { getPrefix, LogType } from "./colors";

const CONSOLE_LOG = "log";
const CONSOLE_TABLE = "table";
const CONSOLE_ERROR = "error";
const CONSOLE_WARN = "warn";
const CONSOLE_TRACE = "trace";
const CONSOLE_TIME = "time";
const CONSOLE_DIR = "dir";
const CONSOLE_GROUP = "group";
const CONSOLE_GROUP_END = "groupEnd";
const CONSOLE_COUNT = "count";
const CONSOLE_TIME_LOG = "timeLog";

export class JavascriptProvider implements LanguageProvider {
  supportedLanguages = [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact",
  ];

  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
  ): string {
    const consoleMethod = this.inferConsoleMethod(hoverText, selectedText);
    const cleanedString = this.formatSelectedVariable(selectedText);

    const { suffix } = config;
    
    // Map internal JS console methods to our LogType enum
    let logType: LogType = "log";
    if (consoleMethod === CONSOLE_ERROR) logType = "error";
    else if (consoleMethod === CONSOLE_WARN) logType = "warn";
    else if (consoleMethod === CONSOLE_TABLE) logType = "table";
    else if (consoleMethod === CONSOLE_DIR || consoleMethod === CONSOLE_TRACE) logType = "debug";
    else if (consoleMethod === CONSOLE_TIME || consoleMethod === CONSOLE_TIME_LOG) logType = "time";
    else if (consoleMethod === CONSOLE_COUNT) logType = "info";

    const prefix = getPrefix(logType, config);

    let logStatement = `${indentation}console.${consoleMethod}('${prefix} ${cleanedString}${suffix}', ${selectedText});\n`;

    if (consoleMethod === CONSOLE_TIME) {
      logStatement = `${indentation}console.time('${prefix} ${cleanedString}');\n${indentation}console.timeEnd('${prefix} ${cleanedString}');\n`;
    } else if (consoleMethod === CONSOLE_GROUP) {
      logStatement = `${indentation}console.group('${prefix} ${cleanedString}');\n`;
    } else if (consoleMethod === CONSOLE_GROUP_END) {
      logStatement = `${indentation}console.groupEnd();\n`;
    } else if (consoleMethod === CONSOLE_COUNT) {
      logStatement = `${indentation}console.count('${prefix} ${cleanedString}');\n`;
    } else if (consoleMethod === CONSOLE_TIME_LOG) {
      logStatement = `${indentation}console.timeLog('${prefix} ${cleanedString}', ${selectedText});\n`;
    }

    return logStatement;
  }

  private inferConsoleMethod(hoverText: string, selectedText: string): string {
    let consoleMethod = CONSOLE_LOG;

    // Analyze the type signature from hover
    if (
      hoverText.includes("[]") ||
      hoverText.includes("Array<") ||
      hoverText.includes("Record<")
    ) {
      consoleMethod = CONSOLE_TABLE;
    } else if (hoverText.includes("Error")) {
      consoleMethod = CONSOLE_ERROR;
    } else if (hoverText.includes("Promise<")) {
      consoleMethod = CONSOLE_WARN;
    }

    // Fallback heuristics on variable name override type signatures
    const lowerText = selectedText.toLowerCase();
    if (lowerText.includes("err") || lowerText.includes("catch")) {
      consoleMethod = CONSOLE_ERROR;
    } else if (lowerText.includes("trace") || lowerText.includes("stack")) {
      consoleMethod = CONSOLE_TRACE;
    } else if (lowerText.includes("timelog")) {
      consoleMethod = CONSOLE_TIME_LOG;
    } else if (
      lowerText.includes("time") ||
      lowerText.includes("perf") ||
      lowerText.includes("duration")
    ) {
      consoleMethod = CONSOLE_TIME;
    } else if (lowerText.includes("groupend")) {
      consoleMethod = CONSOLE_GROUP_END;
    } else if (lowerText.includes("group")) {
      consoleMethod = CONSOLE_GROUP;
    } else if (lowerText.includes("count")) {
      consoleMethod = CONSOLE_COUNT;
    } else if (lowerText.includes("obj") || lowerText.includes("dir")) {
      consoleMethod = CONSOLE_DIR;
    } else if (selectedText.startsWith("[") || selectedText.startsWith("{")) {
      consoleMethod = CONSOLE_TABLE;
    }

    return consoleMethod;
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
