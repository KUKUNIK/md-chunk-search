import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { search, searchFile } from "../src/lib/search.js";
import { splitChunks } from "../src/lib/chunk.js";

describe("splitChunks", () => {
  it("splits at H2 by default", () => {
    const raw = `---
kind: note
---

intro

## alpha

alpha body

## beta

beta body
`;
    const { chunks, frontmatter } = splitChunks(raw, { file: "x.md" });
    expect(frontmatter.kind).toBe("note");
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.heading).toBe("alpha");
    expect(chunks[0]?.body).toBe("alpha body");
    expect(chunks[1]?.heading).toBe("beta");
  });

  it("respects custom level", () => {
    const raw = `# top\n\n## sub\n\n### deep\n\ndeep body\n`;
    const { chunks } = splitChunks(raw, { level: 3, file: "x.md" });
    const headings = chunks.map((c) => c.heading);
    expect(headings).toEqual(["top", "sub", "deep"]);
  });

  it("returns whole body as a single chunk when no headings", () => {
    const raw = `just some text\nwith two lines`;
    const { chunks } = splitChunks(raw, { file: "x.md" });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.heading).toBe("");
    expect(chunks[0]?.body).toContain("just some text");
  });

  it("preserves frontmatter on every chunk", () => {
    const raw = `---
project: demo
status: open
---

## a

aa

## b

bb
`;
    const { chunks } = splitChunks(raw, { file: "x.md" });
    for (const c of chunks) {
      expect(c.frontmatter.project).toBe("demo");
      expect(c.frontmatter.status).toBe("open");
    }
  });
});

describe("search", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "mcs-test-"));
    await mkdir(join(root, "sub"), { recursive: true });
    await writeFile(
      join(root, "a.md"),
      `---
kind: chunk
status: open
---

## stack

We use Next.js and Tailwind.

## decision

Picked SQLite.
`,
    );
    await writeFile(
      join(root, "sub", "b.md"),
      `---
kind: decision
status: resolved
---

## auth

We chose JWTs over sessions for the API.

## perf

Cache the response.
`,
    );
    await writeFile(
      join(root, "sub", "ignore.txt"),
      `not a markdown file but mentions JWTs`,
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("finds a substring across files", async () => {
    const results = await search({
      pattern: "JWT",
      paths: [root],
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.heading).toBe("auth");
    expect(results[0]?.matches[0]?.text).toContain("JWT");
  });

  it("supports regex with ignore-case", async () => {
    const results = await search({
      pattern: "next.?js",
      paths: [root],
      regex: true,
      ignoreCase: true,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.heading).toBe("stack");
  });

  it("filters by frontmatter", async () => {
    const results = await search({
      pattern: "Cache|SQLite",
      paths: [root],
      regex: true,
      filters: { status: "resolved" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.heading).toBe("perf");
  });

  it("respects --limit", async () => {
    const results = await search({
      pattern: ".",
      paths: [root],
      regex: true,
      limit: 1,
    });
    expect(results).toHaveLength(1);
  });

  it("does not search non-markdown files", async () => {
    const results = await search({
      pattern: "not a markdown",
      paths: [root],
    });
    expect(results).toHaveLength(0);
  });

  it("inverts the match: returns sections without the pattern", async () => {
    const results = await search({
      pattern: "JWT",
      paths: [root],
      invert: true,
    });
    const headings = results.map((r) => r.heading).sort();
    // All sections across both files EXCEPT "auth" (which contains JWT).
    expect(headings).toEqual(["decision", "perf", "stack"]);
    for (const r of results) {
      expect(r.matches).toEqual([]);
      expect(r.snippet).not.toContain("JWT");
    }
  });

  it("invert composes with filters: invert AFTER filtering", async () => {
    const results = await search({
      pattern: "Cache",
      paths: [root],
      filters: { status: "resolved" },
      invert: true,
    });
    // status=resolved limits to sub/b.md's two sections; invert drops "perf".
    expect(results.map((r) => r.heading)).toEqual(["auth"]);
  });

  it("returns empty results for nonexistent paths without throwing", async () => {
    const results = await search({
      pattern: "anything",
      paths: [join(root, "does-not-exist")],
    });
    expect(results).toEqual([]);
  });

  it("searchFile reports correct line numbers", async () => {
    const file = join(root, "a.md");
    const results = await searchFile(file, {
      pattern: "SQLite",
      paths: [file],
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.matches[0]?.lineNumber).toBeGreaterThan(0);
  });
});
