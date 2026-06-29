export interface IntelliLogConfig {
  prefix: string;
  suffix: string;
  structuredOutput: boolean;
}

export interface LanguageProvider {
  supportedLanguages: string[];
  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
    fileName: string,
    lineNumber: number
  ): string;
}
