import kleur from "kleur";
import type { SearchResult } from "./types.js";

export interface FormatOptions {
  showFrontmatter?: boolean;
  color?: boolean;
}

export function formatText(
  results: SearchResult[],
  opts: FormatOptions = {},
): string {
  if (results.length === 0) return "(no matches)\n";
  const out: string[] = [];
  const useColor = opts.color !== false && Boolean(process.stdout.isTTY);
  const c = (fn: (s: string) => string, s: string) => (useColor ? fn(s) : s);

  for (const r of results) {
    const head = `${r.file}:${r.lineStart}  ${"#".repeat(Math.max(1, r.level))} ${r.heading || "(no heading)"}`;
    out.push(c((s) => kleur.cyan().bold(s), head));
    if (opts.showFrontmatter && Object.keys(r.frontmatter).length > 0) {
      const fmText = Object.entries(r.frontmatter)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join("  ");
      out.push(c((s) => kleur.gray(s), `  ${fmText}`));
    }
    for (const m of r.matches) {
      out.push(`  ${c((s) => kleur.yellow(s), String(m.lineNumber))}: ${m.text}`);
    }
    out.push("");
  }
  return out.join("\n");
}

export function formatJson(results: SearchResult[]): string {
  return `${JSON.stringify(results, null, 2)}\n`;
}

export interface HierarchyOptions {
  color?: boolean;
  showFrontmatter?: boolean;
  showSnippet?: boolean;
}

/**
 * Render results grouped by file with heading-level indentation, so the
 * structure of each match within its document is visible at a glance.
 * Indentation is relative to the shallowest heading found in each file —
 * a file whose only hits are at H3 still starts flush left.
 */
export function formatHierarchy(
  results: SearchResult[],
  opts: HierarchyOptions = {},
): string {
  if (results.length === 0) return "(no matches)\n";
  const useColor = opts.color !== false && Boolean(process.stdout.isTTY);
  const c = (fn: (s: string) => string, s: string) => (useColor ? fn(s) : s);

  const byFile = new Map<string, SearchResult[]>();
  for (const r of results) {
    const arr = byFile.get(r.file) ?? [];
    arr.push(r);
    byFile.set(r.file, arr);
  }

  const out: string[] = [];
  for (const [file, group] of byFile) {
    out.push(c((s) => kleur.cyan().bold(s), file));
    const minLevel = group.reduce(
      (m, r) => Math.min(m, r.level || 1),
      Number.POSITIVE_INFINITY,
    );
    const baseLevel = Number.isFinite(minLevel) ? minLevel : 1;
    const sorted = [...group].sort((a, b) => a.lineStart - b.lineStart);
    let first = true;
    for (const r of sorted) {
      const depth = Math.max(0, (r.level || baseLevel) - baseLevel);
      const indent = "  ".repeat(depth);
      const heading = r.heading || "(no heading)";
      const lvl = r.level > 0 ? "#".repeat(r.level) : "·";
      const headLine = `${indent}${lvl} ${heading}  :${r.lineStart}`;
      out.push(c((s) => kleur.magenta(s), headLine));
      if (
        first &&
        opts.showFrontmatter &&
        Object.keys(r.frontmatter).length > 0
      ) {
        const fmText = Object.entries(r.frontmatter)
          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join("  ");
        out.push(c((s) => kleur.gray(s), `${indent}  ${fmText}`));
      }
      for (const m of r.matches) {
        out.push(
          `${indent}  ${c((s) => kleur.yellow(s), String(m.lineNumber))}: ${m.text}`,
        );
      }
      first = false;
    }
    out.push("");
  }
  return out.join("\n");
}
