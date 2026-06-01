import { readFile } from "node:fs/promises";
import { splitChunks } from "./chunk.js";
import type { MatchLine, SearchOptions, SearchResult } from "./types.js";
import { walk } from "./walk.js";

function buildPattern(opts: SearchOptions): RegExp {
  const flags = opts.ignoreCase ? "gi" : "g";
  if (opts.regex) return new RegExp(opts.pattern, flags);
  return new RegExp(escapeRegex(opts.pattern), flags);
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesFilters(
  frontmatter: Record<string, unknown>,
  filters?: Record<string, string>,
): boolean {
  if (!filters) return true;
  for (const [key, value] of Object.entries(filters)) {
    const actual = frontmatter[key];
    if (actual === undefined) return false;
    if (String(actual) !== value) return false;
  }
  return true;
}

function makeSnippet(
  bodyLines: string[],
  matches: MatchLine[],
  contextLines: number,
): string {
  if (matches.length === 0) return bodyLines.slice(0, 3).join("\n");
  const first = matches[0];
  if (!first) return "";
  const localIndex = bodyLines.findIndex(
    (line) => line === first.text,
  );
  const start = Math.max(0, localIndex - contextLines);
  const end = Math.min(bodyLines.length, localIndex + contextLines + 1);
  return bodyLines.slice(start, end).join("\n");
}

export async function searchFile(
  file: string,
  opts: SearchOptions,
): Promise<SearchResult[]> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return [];
  }
  const { chunks } = splitChunks(raw, { level: opts.level ?? 2, file });
  const pattern = buildPattern(opts);
  const contextLines = opts.context ?? 1;
  const results: SearchResult[] = [];

  for (const chunk of chunks) {
    if (!matchesFilters(chunk.frontmatter, opts.filters)) continue;
    const bodyLines = chunk.body.split("\n");
    const matches: MatchLine[] = [];
    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i] ?? "";
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        matches.push({
          lineNumber: chunk.lineStart + i,
          text: line,
        });
      }
    }
    if (matches.length === 0) {
      pattern.lastIndex = 0;
      if (pattern.test(chunk.heading)) {
        matches.push({
          lineNumber: chunk.lineStart - 1,
          text: chunk.heading,
        });
      }
    }
    if (matches.length === 0) continue;
    results.push({
      file,
      heading: chunk.heading,
      level: chunk.level,
      lineStart: chunk.lineStart,
      lineEnd: chunk.lineEnd,
      matches,
      snippet: makeSnippet(bodyLines, matches, contextLines),
      frontmatter: chunk.frontmatter,
    });
  }
  return results;
}

export async function search(opts: SearchOptions): Promise<SearchResult[]> {
  const paths = opts.paths.length > 0 ? opts.paths : ["."];
  const results: SearchResult[] = [];
  const limit = opts.limit ?? Number.POSITIVE_INFINITY;

  for (const path of paths) {
    for await (const file of walk(path, {
      extensions: opts.extensions,
      exclude: opts.exclude,
    })) {
      const found = await searchFile(file, opts);
      for (const r of found) {
        results.push(r);
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}
