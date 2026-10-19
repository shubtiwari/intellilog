import { bracketDelta } from "./providers/utils";

const TRAILING_MARKER = /\s*(?:\/\/|#)\s*intellilog\s*$/;
/** How far up a formatter-split statement may extend from its marker line. */
const MAX_BLOCK_LINES = 50;

/** One IntelliLog statement, possibly split across lines by a formatter. Lines are 0-based, inclusive. */
export interface LogBlock {
  start: number;
  end: number;
  commented: boolean;
  /** An import IntelliLog added for its logs (e.g. Go's `import "fmt"`). */
  isImport: boolean;
}

export function hasMarker(line: string, commentToken: string): boolean {
  return line.trimEnd().endsWith(`${commentToken} intellilog`);
}

function stripComment(line: string, commentToken: string): string {
  const t = line.trimStart();
  return t.startsWith(commentToken) ? t.slice(commentToken.length) : t;
}

/**
 * Finds IntelliLog statements. The marker sits on the statement's last line; when a
 * formatter (Prettier, Black, …) has wrapped the statement, the marker line has more
 * closing than opening brackets, so we walk upwards until they balance.
 */
export function findLogBlocks(lines: string[], commentToken: string, quotes?: string): LogBlock[] {
  const blocks: LogBlock[] = [];
  let floor = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!hasMarker(lines[i], commentToken)) { continue; }

    const code = (line: string) => stripComment(line, commentToken).replace(TRAILING_MARKER, "");
    let balance = bracketDelta(code(lines[i]), quotes);
    let start = i;
    while (balance < 0 && start > floor && i - start < MAX_BLOCK_LINES) {
      start--;
      balance += bracketDelta(code(lines[start]), quotes);
    }
    if (balance !== 0) { start = i; }

    const blockLines = lines.slice(start, i + 1);
    blocks.push({
      start,
      end: i,
      commented: blockLines.every((l) => l.trimStart().startsWith(commentToken)),
      isImport: start === i && /^\s*import\s+["'(]/.test(code(lines[i])),
    });
    floor = i + 1;
  }
  return blocks;
}

export function commentLine(line: string, commentToken: string): string {
  const indentation = line.match(/^\s*/)?.[0] ?? "";
  return `${indentation}${commentToken} ${line.slice(indentation.length)}`;
}

export function uncommentLine(line: string, commentToken: string): string {
  const indentation = line.match(/^\s*/)?.[0] ?? "";
  const rest = line.slice(indentation.length);
  if (!rest.startsWith(commentToken)) { return line; }
  const body = rest.slice(commentToken.length);
  return `${indentation}${body.startsWith(" ") ? body.slice(1) : body}`;
}
