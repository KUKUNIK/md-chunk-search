import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export interface WalkOptions {
  extensions?: string[];
  exclude?: string[];
}

const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
];

function matchesExclude(name: string, relPath: string, excludes: string[]): boolean {
  for (const ex of excludes) {
    if (ex === name) return true;
    if (relPath === ex) return true;
    if (ex.endsWith("/*") && relPath.startsWith(ex.slice(0, -2))) return true;
  }
  return false;
}

export async function* walk(
  root: string,
  options: WalkOptions = {},
): AsyncGenerator<string> {
  const extensions = options.extensions ?? ["md", "markdown"];
  const excludes = [...DEFAULT_EXCLUDES, ...(options.exclude ?? [])];

  async function* visit(dir: string): AsyncGenerator<string> {
    let entries: { name: string; isDir: boolean; isFile: boolean }[] = [];
    try {
      const list = await readdir(dir, { withFileTypes: true });
      entries = list.map((e) => ({
        name: e.name,
        isDir: e.isDirectory(),
        isFile: e.isFile(),
      }));
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = relative(root, full);
      if (matchesExclude(entry.name, rel, excludes)) continue;
      if (entry.isDir) {
        yield* visit(full);
      } else if (entry.isFile) {
        const ext = entry.name.split(".").pop()?.toLowerCase();
        if (ext && extensions.includes(ext)) yield full;
      }
    }
  }

  let stats;
  try {
    stats = await stat(root);
  } catch {
    return;
  }
  if (stats.isFile()) {
    yield root;
    return;
  }
  yield* visit(root);
}
