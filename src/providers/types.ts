export interface IntelliLogConfig {
  prefix: string;
  suffix: string;
  structuredOutput: boolean;
}

export interface FunctionInfo {
  name: string;
  params: string[];
}

/** A line of code to insert *before* the 0-based `line`, e.g. a missing import. */
export interface ImportEdit {
  line: number;
  text: string;
}

/**
 * How a function body is introduced:
 * - `brace`: `{` (JS/TS, Go, PHP, Dart, Rust)
 * - `colon`: trailing `:` (Python)
 * - `line`: the signature line itself (Ruby `def … end`)
 */
export type BodyStyle = "brace" | "colon" | "line";

export interface LanguageProvider {
  supportedLanguages: string[];
  /** Line-comment token used for the `intellilog` marker and for comment/uncomment. */
  commentToken: "//" | "#";
  bodyStyle: BodyStyle;
  /** String delimiters, used when scanning code for brackets. */
  quotes?: string;

  buildLogStatement(
    selectedText: string,
    hoverText: string,
    indentation: string,
    config: IntelliLogConfig,
    fileName: string,
    lineNumber: number,
    documentText?: string,
  ): string;

  /** Parses a (whitespace-collapsed) function signature. */
  parseFunction(signature: string): FunctionInfo | null;

  buildFunctionEntryLog(
    info: FunctionInfo,
    indentation: string,
    config: IntelliLogConfig,
    fileName: string,
    lineNumber: number,
    documentText?: string,
  ): string;

  /** Imports the inserted code needs that the document does not have yet. */
  getImportEdits?(documentText: string, insertedCode: string): ImportEdit[];
}
