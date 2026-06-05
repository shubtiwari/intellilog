export interface IntelliLogConfig {
  prefix: string;
  suffix: string;
  useColorIcons: boolean;
}

export interface LanguageProvider {
  /**
   * The VS Code language identifiers this provider supports.
   * E.g., ['javascript', 'typescript', 'javascriptreact', 'typescriptreact']
   */
  supportedLanguages: string[];

  /**
   * Constructs the final log string for the specific language.
   * @param selectedText The raw text selected by the user.
   * @param hoverText The type signature or hover information.
   * @param indentation The leading whitespace of the current line.
   * @param config The user's extension configuration.
   * @returns The fully formatted log statement string to insert.
   */
  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig
  ): string;
}
