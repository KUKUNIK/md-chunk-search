import { Command } from "commander";
import kleur from "kleur";
import { formatHierarchy, formatJson, formatText } from "./lib/format.js";
import { search } from "./lib/search.js";
import type { SearchOptions } from "./lib/types.js";

const VERSION = "0.2.0";

function parseFilters(values: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of values) {
    const eq = v.indexOf("=");
    if (eq <= 0) {
      process.stderr.write(`${kleur.red("error")}: bad --filter "${v}" (expected key=value)\n`);
      process.exit(2);
    }
    out[v.slice(0, eq)] = v.slice(eq + 1);
  }
  return out;
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("mdcs-search")
    .description(
      "Search markdown files at the section / chunk level, with frontmatter filtering.",
    )
    .version(VERSION)
    .argument("<pattern>", "search pattern (substring by default, regex with -r)")
    .argument("[paths...]", "files or directories to search (default: .)")
    .option("-r, --regex", "treat pattern as a regular expression")
    .option("-i, --ignore-case", "case-insensitive match")
    .option("-l, --level <n>", "section split heading level (default 2)", "2")
    .option(
      "-f, --filter <key=value>",
      "filter sections by frontmatter (repeatable)",
      (value: string, prev: string[] = []) => [...prev, value],
      [] as string[],
    )
    .option("-n, --limit <n>", "limit total results")
    .option("-c, --context <n>", "extra lines of context around matches", "1")
    .option(
      "-e, --ext <ext>",
      "file extensions to include (repeatable)",
      (value: string, prev: string[] = []) => [...prev, value],
      [] as string[],
    )
    .option(
      "-x, --exclude <name>",
      "directory names to skip (repeatable)",
      (value: string, prev: string[] = []) => [...prev, value],
      [] as string[],
    )
    .option(
      "-v, --invert",
      "invert match: return sections that do NOT contain the pattern",
    )
    .option("--show-frontmatter", "print matched section frontmatter")
    .option(
      "--format <fmt>",
      "output format: text | json | hierarchy",
      "text",
    )
    .option("--no-color", "disable ANSI colors in text output")
    .action(
      async (
        pattern: string,
        paths: string[],
        opts: {
          regex?: boolean;
          ignoreCase?: boolean;
          level: string;
          filter: string[];
          limit?: string;
          context: string;
          ext: string[];
          exclude: string[];
          showFrontmatter?: boolean;
          format: string;
          color: boolean;
          invert?: boolean;
        },
      ) => {
        const searchOpts: SearchOptions = {
          pattern,
          paths,
          regex: opts.regex,
          ignoreCase: opts.ignoreCase,
          level: Number.parseInt(opts.level, 10),
          filters: opts.filter.length > 0 ? parseFilters(opts.filter) : undefined,
          limit: opts.limit ? Number.parseInt(opts.limit, 10) : undefined,
          context: Number.parseInt(opts.context, 10),
          extensions: opts.ext.length > 0 ? opts.ext : undefined,
          exclude: opts.exclude.length > 0 ? opts.exclude : undefined,
          invert: opts.invert,
        };
        const results = await search(searchOpts);
        const fmt = opts.format.toLowerCase();
        let out: string;
        if (fmt === "json") {
          out = formatJson(results);
        } else if (fmt === "hierarchy") {
          out = formatHierarchy(results, {
            showFrontmatter: opts.showFrontmatter,
            color: opts.color,
          });
        } else if (fmt === "text") {
          out = formatText(results, {
            showFrontmatter: opts.showFrontmatter,
            color: opts.color,
          });
        } else {
          process.stderr.write(
            `${kleur.red("error")}: unknown --format "${opts.format}" (expected text | json | hierarchy)\n`,
          );
          process.exitCode = 2;
          return;
        }
        process.stdout.write(out);
        process.exitCode = results.length > 0 ? 0 : 1;
      },
    );

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    process.stderr.write(
      `${kleur.red("error")}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 2;
  }
}

main();
