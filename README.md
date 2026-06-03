# md-chunk-search

[![CI](https://github.com/KUKUNIK/md-chunk-search/actions/workflows/ci.yml/badge.svg)](https://github.com/KUKUNIK/md-chunk-search/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/md-chunk-search.svg)](https://www.npmjs.com/package/md-chunk-search)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

A grep for markdown vaults that understands **sections** and **frontmatter**.

If you have a folder of notes (Obsidian, [md-context-store](https://github.com/KUKUNIK/md-context-store), a docs site, an AI agent's memory dump…), plain `grep` shows you matched lines without any structure. `mdcs-search` splits each file into `##` sections and reports which **section** matched, with the section's frontmatter context — so you can filter "find 'auth' inside open issues only" without writing a custom script.

> Status: `0.2.0` — usable, but the output format may change before `1.0`.

## Why not just grep?

`grep -r "JWT" notes/` tells you a line matched. That's it. You still have to open the file, scroll to find the section, and figure out whether the section is something you care about (a draft, an archived doc, an issue with status `resolved`).

`mdcs-search` answers the same query as: "Find every H2 section that mentions `JWT`, in any file where `status: open` is set in the frontmatter." One command, ranked output, sane defaults.

## Install

```bash
npm install -g md-chunk-search
# or
pnpm add -g md-chunk-search
```

Requires Node 18+. The binary is `mdcs-search`.

## Quick start

```bash
# substring search across the current directory
mdcs-search "JWT"

# regex, case-insensitive
mdcs-search -r -i "next.?js" notes/

# only sections inside files where frontmatter status=open
mdcs-search "auth" --filter status=open --filter kind=issue

# JSON output for piping
mdcs-search "redirect" --format json | jq '.[].file' | sort -u

# limit + extra context lines
mdcs-search "TODO" -n 20 -c 2

# hierarchy view for nested H3/H4 vaults (see "Hierarchy view" below)
mdcs-search "JWT" notes/ --format hierarchy -l 4
```

## Options

```
mdcs-search <pattern> [paths...]

  -r, --regex                 treat pattern as a regular expression
  -i, --ignore-case           case-insensitive match
  -l, --level <n>             section split heading level (default: 2)
  -f, --filter <key=value>    frontmatter filter (repeatable; ANDed)
  -n, --limit <n>             stop after N results
  -c, --context <n>           extra lines around each match (default: 1)
  -e, --ext <ext>             file extensions (default: md, markdown)
  -x, --exclude <dir>         directory names to skip (added to defaults)
      --show-frontmatter      print frontmatter for each matched section
      --format <fmt>          output format: text | json | hierarchy (default: text)
      --no-color              disable ANSI colors in text output
```

Default excludes: `node_modules`, `.git`, `dist`, `build`, `.next`, `.turbo`, `coverage`.

## How "sections" work

Given this file:

```markdown
---
project: demo
status: open
---

## stack

Next.js, Tailwind, Drizzle.

## auth

We use JWTs.
```

`mdcs-search "JWT"` returns the `auth` section (with its `lineStart`/`lineEnd`, its frontmatter, and the matched line). The `stack` section is ignored.

If the file has no headings at all, the whole body becomes a single chunk. If you want to split at H3 instead of H2, pass `--level 3`.

## Hierarchy view

For larger vaults the flat text view can be hard to scan. `--format hierarchy`
groups hits by file and indents them by their heading level, relative to the
shallowest hit in that file:

```bash
mdcs-search "JWT" notes/ --format hierarchy -l 4
```

```
notes/architecture.md
## auth  :12
  3: We picked JWTs over sessions for the API.
  ### token-rotation  :18
    2: short-lived access tokens, JWT-based
notes/runbook.md
### outage-2026-04  :40
  5: JWT signing key rotated mid-incident
```

A file whose hits are all at H3 still starts flush-left. Combine with
`-l 4` (or higher) to surface nested headings the splitter would otherwise
swallow.

The frontmatter is read once per file (with `gray-matter`) and inherited by every section in that file — that's why `--filter status=open` works at file granularity even though matches are at section granularity.

## Library usage

```ts
import { search } from "md-chunk-search";

const results = await search({
  pattern: "JWT",
  paths: ["./notes"],
  filters: { status: "open" },
  ignoreCase: true,
});

for (const r of results) {
  console.log(`${r.file}:${r.lineStart}  ${r.heading}`);
  console.log(r.snippet);
}
```

`splitChunks(raw, { level })` is also exported if you want to do something other than search — render a sidebar TOC, build a section index, transform notes file-by-file.

## Pairs well with

- [md-context-store](https://github.com/KUKUNIK/md-context-store) — a CLI for storing AI session context in this exact directory shape.
- Obsidian vaults — frontmatter tagging convention varies, but `kind:`, `status:`, `tags:` are common.
- Hugo / Astro / Next.js MDX content directories — for content audits.

## Exit codes

- `0` — at least one match found.
- `1` — no matches.
- `2` — usage error (bad filter, bad regex, etc.).

This matches `grep`'s convention so you can use it in shell pipelines.

## License

MIT
