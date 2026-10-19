// ─── Text scanning helpers shared by all providers ─────────────────────────────

const OPENERS: Record<string, string> = { "(": ")", "[": "]", "{": "}", "<": ">" };
const CLOSERS = new Set([")", "]", "}", ">"]);

/** Default string delimiters. Rust overrides this because `'a` is a lifetime, not a string. */
export const DEFAULT_QUOTES = `"'\``;

interface ScanOptions {
  quotes?: string;
  /** Treat `<` / `>` as brackets (type parameters). Off for plain expressions like `a < b`. */
  angles?: boolean;
}

/**
 * Walks `text` calling `visit(char, index, depth)` for every character outside string
 * literals. `depth` is the bracket nesting level *before* the character is applied.
 * Returning `true` from `visit` stops the scan.
 */
function scan(text: string, opts: ScanOptions, visit: (ch: string, i: number, depth: number) => boolean | void): void {
  const quotes = opts.quotes ?? DEFAULT_QUOTES;
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") { i++; continue; }
      if (ch === quote) { quote = null; }
      continue;
    }
    if (quotes.includes(ch)) { quote = ch; continue; }
    if (visit(ch, i, depth)) { return; }
    const isAngle = ch === "<" || ch === ">";
    if (isAngle && !opts.angles) { continue; }
    // `=>` and `->` are arrows, not closing angle brackets.
    if (ch === ">" && (text[i - 1] === "=" || text[i - 1] === "-")) { continue; }
    if (ch in OPENERS) { depth++; }
    else if (CLOSERS.has(ch)) { depth = Math.max(0, depth - 1); }
  }
}

/** Splits on `separator` only where it appears outside brackets and strings. */
export function splitTopLevel(text: string, separator = ",", opts: ScanOptions = {}): string[] {
  const parts: string[] = [];
  let last = 0;
  scan(text, opts, (ch, i, depth) => {
    if (ch === separator && depth === 0) {
      parts.push(text.slice(last, i));
      last = i + 1;
    }
  });
  parts.push(text.slice(last));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Index of the first top-level occurrence of `char`, or -1. */
export function indexOfTopLevel(text: string, char: string, opts: ScanOptions = {}): number {
  let found = -1;
  scan(text, opts, (ch, i, depth) => {
    if (ch === char && depth === 0) { found = i; return true; }
  });
  return found;
}

/**
 * Given `text[openIndex]` is an opening bracket, returns the content up to its matching
 * closer and the closer's index.
 */
export function extractGroup(text: string, openIndex: number, quotes = DEFAULT_QUOTES): { inner: string; end: number } | null {
  const open = text[openIndex];
  const close = OPENERS[open];
  if (!close) { return null; }
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") { i++; continue; }
      if (ch === quote) { quote = null; }
      continue;
    }
    if (open !== "<" && quotes.includes(ch)) { quote = ch; continue; }
    if (ch === ">" && open === "<" && (text[i - 1] === "=" || text[i - 1] === "-")) { continue; }
    if (ch === open) { depth++; }
    else if (ch === close && --depth === 0) {
      return { inner: text.slice(openIndex + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Starting at `index` (just after a function name), skips whitespace and optional
 * generic parameters (`<T>` or `[T any]`) and returns the content of the `( … )`
 * parameter list, or null if no parameter list follows.
 */
export function paramsAfter(text: string, index: number, quotes = DEFAULT_QUOTES): string | null {
  let i = index;
  const skipSpace = () => { while (i < text.length && /\s/.test(text[i])) { i++; } };
  skipSpace();
  if (text[i] === "<" || text[i] === "[") {
    const generic = extractGroup(text, i, quotes);
    if (!generic) { return null; }
    i = generic.end + 1;
    skipSpace();
  }
  if (text[i] !== "(") { return null; }
  return extractGroup(text, i, quotes)?.inner ?? null;
}

/** Net bracket balance of a line of code, ignoring brackets inside strings. */
export function bracketDelta(code: string, quotes = DEFAULT_QUOTES): number {
  let delta = 0;
  scan(code, { quotes }, (ch) => {
    if (ch === "(" || ch === "[" || ch === "{") { delta++; }
    else if (ch === ")" || ch === "]" || ch === "}") { delta--; }
  });
  return delta;
}

// ─── Variable-name heuristics ──────────────────────────────────────────────────

/**
 * Splits an identifier/expression into lowercase words on camelCase, snake_case and
 * punctuation boundaries: `userDataJSON.stackTrace` → [user, data, json, stack, trace].
 * Matching whole words avoids false hits like `country` → "count" or `referrer` → "err".
 */
export function nameTokens(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function hasToken(tokens: string[], ...words: string[]): boolean {
  return tokens.some((t) => words.includes(t));
}

/**
 * Returns the variables if `selectedText` is a comma-separated list of simple names
 * (e.g. `userId, email, role`), otherwise null. Expressions like `[1, 2]` or
 * `fn(a, b)` contain no top-level comma and are treated as a single value.
 */
export function splitVariables(selectedText: string, namePattern: RegExp): string[] | null {
  const parts = splitTopLevel(selectedText);
  if (parts.length < 2 || !parts.every((p) => namePattern.test(p))) { return null; }
  return parts;
}

export const IDENTIFIER_PATH = /^[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*$/;

// ─── String-literal escaping ───────────────────────────────────────────────────

/** Escapes text for use inside a `quote`-delimited string literal. */
export function escapeString(text: string, quote: string): string {
  return text.replace(/\\/g, "\\\\").split(quote).join(`\\${quote}`).replace(/\n/g, "\\n");
}

/** Collapses a multi-line selection into one line so it can be used as a label. */
export function labelText(selectedText: string): string {
  return selectedText.replace(/\s*\n\s*/g, " ").trim();
}
