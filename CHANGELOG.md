# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `-v` / `--invert` CLI flag (and `SearchOptions.invert` library option)
  returns sections that do NOT contain the pattern. Composes with
  `--filter`: invert runs over the post-filter set.
- README "Troubleshooting" section covering the most common surprises:
  pattern lives inside a fenced block, no heading at `--level`, string
  vs boolean frontmatter comparison, extension gating, and how
  `--invert` interacts with `--filter`.

## [0.2.0] - 2026-06-03

### Added

- `--format hierarchy` CLI output that groups hits by file and indents
  each match by heading depth, so the structure of a document is visible
  in a single command.
- `formatHierarchy(results, options)` library export and `HierarchyOptions`
  type. `FormatOptions` is now publicly exported too.
- `--format` flag validates its input and prints a usage error for unknown
  values instead of silently falling back to text.

### Changed

- CLI version bumped to `0.2.0`. No breaking library changes — existing
  `formatText` / `formatJson` calls are untouched.

## [0.1.0] - 2026-06-01

### Added

- Initial release.
- `mdcs-search` CLI for searching markdown files at the section (H-level) granularity.
- Frontmatter filtering with repeatable `--filter key=value` (ANDed).
- Substring (default) and regex (`-r`) modes with `-i` for case-insensitive matching.
- JSON output format for piping into `jq`, scripts, dashboards.
- Library exports: `search`, `searchFile`, `splitChunks`, `walk`, `formatText`, `formatJson`.
- Exit codes follow `grep`: `0` match found, `1` no match, `2` usage error.

### Defaults

- File extensions: `md`, `markdown`.
- Excluded directories: `node_modules`, `.git`, `dist`, `build`, `.next`, `.turbo`, `coverage`.
- Section split level: `2` (H2).
