# Contributing

Thanks for considering a contribution.

## Setup

```bash
git clone https://github.com/KUKUNIK/md-chunk-search
cd md-chunk-search
npm install
npm test
```

## Development loop

```bash
npm run typecheck
npm test
npm run build
```

CI runs typecheck → test → build on Node 18, 20, and 22.

## What we welcome

- Bug fixes with a failing test.
- New output formats (e.g. tsv, alfred-friendly).
- More frontmatter filter operators (currently only `key=value` exact match — `key!=value`, `key~regex` would be reasonable additions).

## What we are cautious about

- Heavy dependencies. The package is meant to be drop-in and quiet.
- Treating markdown as a parsed AST. Right now `mdcs-search` only understands H2-ish boundaries and YAML frontmatter; full markdown parsing is out of scope.

## Process

1. Open an issue first for non-trivial changes.
2. One change per PR.
3. CI must be green.
