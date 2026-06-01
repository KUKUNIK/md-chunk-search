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
