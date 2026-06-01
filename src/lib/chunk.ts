import matter from "gray-matter";
import type { Chunk } from "./types.js";

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;

export interface SplitOptions {
  level?: number;
  file?: string;
}

export function splitChunks(
  raw: string,
  options: SplitOptions = {},
): { chunks: Chunk[]; frontmatter: Record<string, unknown> } {
  const targetLevel = options.level ?? 2;
  const file = options.file ?? "<inline>";
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const body = parsed.content;
  const lines = body.split("\n");
  const preambleOffset = countFrontmatterLines(raw, body);

  const chunks: Chunk[] = [];
  let current: {
    level: number;
    heading: string;
    lineStart: number;
    bodyLines: string[];
  } | null = null;

  const pushCurrent = (endLine: number) => {
    if (!current) return;
    chunks.push({
      file,
      level: current.level,
      heading: current.heading,
      body: current.bodyLines.join("\n").trim(),
      lineStart: current.lineStart,
      lineEnd: endLine,
      frontmatter: fm,
    });
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(HEADING_RE);
    if (m && m[1] && m[2] && m[1].length <= targetLevel) {
      pushCurrent(preambleOffset + i);
      current = {
        level: m[1].length,
        heading: m[2].trim(),
        lineStart: preambleOffset + i + 1,
        bodyLines: [],
      };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  pushCurrent(preambleOffset + lines.length);

  if (chunks.length === 0) {
    chunks.push({
      file,
      level: 0,
      heading: "",
      body: body.trim(),
      lineStart: preambleOffset + 1,
      lineEnd: preambleOffset + lines.length,
      frontmatter: fm,
    });
  }

  return { chunks, frontmatter: fm };
}

function countFrontmatterLines(raw: string, body: string): number {
  if (!raw.startsWith("---")) return 0;
  const consumed = raw.length - body.length;
  return raw.slice(0, consumed).split("\n").length - 1;
}
