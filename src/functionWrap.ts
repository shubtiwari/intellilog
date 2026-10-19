import { BodyStyle } from "./providers/types";
import { DEFAULT_QUOTES } from "./providers/utils";

/** How many lines a multi-line signature may span. */
const MAX_SIGNATURE_LINES = 30;

export type SignatureResult =
  | { ok: true; text: string; endLine: number }
  | { ok: false; reason: "not-found" | "no-block-body" };

/**
 * Collects a (possibly multi-line) function signature starting at `startLine`, up to the
 * token that opens its body: `{` for brace languages, `:` for Python, end of the
 * balanced `def` line for Ruby. Returns the signature with whitespace collapsed.
 *
 * Fails with `no-block-body` for functions whose body can't hold an inserted line:
 * expression bodies (`=> x`), single-line bodies (`{ return x; }`, `def f(): pass`),
 * and declarations without a body (`foo(): void;`).
 */
export function collectSignature(
  lines: string[],
  startLine: number,
  style: BodyStyle,
  commentToken: string,
  quotes = DEFAULT_QUOTES,
): SignatureResult {
  let depth = 0;
  let sawParams = false;
  const parts: string[] = [];
  const lastLine = Math.min(lines.length, startLine + MAX_SIGNATURE_LINES);

  for (let lineIndex = startLine; lineIndex < lastLine; lineIndex++) {
    const line = lines[lineIndex];
    let quote: string | null = null;
    let codeEnd = line.length;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quote) {
        if (ch === "\\") { i++; }
        else if (ch === quote) { quote = null; }
        continue;
      }
      if (quotes.includes(ch)) { quote = ch; continue; }
      if (line.startsWith(commentToken, i) && !(commentToken === "#" && line[i + 1] === "[")) { codeEnd = i; break; }

      if (depth === 0 && sawParams) {
        const rest = stripTrailingComment(line.slice(i + 1), commentToken).trim();
        if (style === "brace" && ch === "{") {
          parts.push(line.slice(0, i));
          return rest === "" ? done(parts, lineIndex) : { ok: false, reason: "no-block-body" };
        }
        if (style === "brace" && ch === ";") { return { ok: false, reason: "no-block-body" }; }
        if (style === "brace" && ch === "=" && line[i + 1] === ">") {
          const after = stripTrailingComment(line.slice(i + 2), commentToken).trim();
          if (after !== "" && !after.startsWith("{")) { return { ok: false, reason: "no-block-body" }; }
        }
        if (style === "colon" && ch === ":") {
          parts.push(line.slice(0, i));
          return rest === "" ? done(parts, lineIndex) : { ok: false, reason: "no-block-body" };
        }
      }

      if (ch === "(" || ch === "[" || ch === "{") { depth++; }
      else if (ch === ")" || ch === "]" || ch === "}") {
        depth = Math.max(0, depth - 1);
        if (depth === 0 && ch === ")") { sawParams = true; }
      }
    }

    parts.push(line.slice(0, codeEnd));
    if (style === "line" && depth === 0) {
      const text = collapse(parts);
      // Endless (`def f(x) = x`) and one-line (`def f; end`) methods have no body line.
      if (/\)\s*=[^=~]|;|\bend\s*$/.test(text)) { return { ok: false, reason: "no-block-body" }; }
      return { ok: true, text, endLine: lineIndex };
    }
  }
  return { ok: false, reason: "not-found" };
}

/**
 * Where the entry log goes: the first line of the body, after a Python docstring if
 * there is one. `bodyIndentation` is null when the body has no indented line to copy
 * (empty body, or the next line is the closing `}` / `end`).
 */
export function findBodyInsertion(
  lines: string[],
  signatureEndLine: number,
  style: BodyStyle,
  signatureIndentation: string,
): { insertLine: number; bodyIndentation: string | null } {
  let insertLine = signatureEndLine + 1;
  let firstBody = insertLine;
  while (firstBody < lines.length && lines[firstBody].trim() === "") { firstBody++; }
  if (firstBody >= lines.length) { return { insertLine, bodyIndentation: null }; }

  const indentation = lines[firstBody].match(/^\s*/)?.[0] ?? "";
  const bodyIndentation = indentation.length > signatureIndentation.length ? indentation : null;

  if (style === "colon" && bodyIndentation !== null) {
    const docstring = lines[firstBody].trim().match(/^[rRuUbBfF]{0,2}("""|''')/);
    if (docstring) {
      const delimiter = docstring[1];
      const afterOpen = lines[firstBody].indexOf(delimiter) + 3;
      let end = lines[firstBody].indexOf(delimiter, afterOpen) >= 0 ? firstBody : -1;
      for (let i = firstBody + 1; end < 0 && i < lines.length; i++) {
        if (lines[i].includes(delimiter)) { end = i; }
      }
      if (end >= 0) { insertLine = end + 1; }
    }
  }
  return { insertLine, bodyIndentation };
}

function stripTrailingComment(text: string, commentToken: string): string {
  const index = text.indexOf(commentToken);
  return index >= 0 ? text.slice(0, index) : text;
}

function collapse(parts: string[]): string {
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function done(parts: string[], endLine: number): SignatureResult {
  return { ok: true, text: collapse(parts), endLine };
}
