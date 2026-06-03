import { describe, expect, it } from "vitest";
import { formatHierarchy, formatJson, formatText } from "../src/lib/format.js";
import type { SearchResult } from "../src/lib/types.js";

function r(
  partial: Partial<SearchResult> & {
    file: string;
    heading: string;
    level: number;
    lineStart: number;
  },
): SearchResult {
  return {
    file: partial.file,
    heading: partial.heading,
    level: partial.level,
    lineStart: partial.lineStart,
    lineEnd: partial.lineEnd ?? partial.lineStart + 1,
    matches: partial.matches ?? [
      { lineNumber: partial.lineStart + 1, text: "match line" },
    ],
    snippet: partial.snippet ?? "",
    frontmatter: partial.frontmatter ?? {},
  };
}

describe("formatHierarchy", () => {
  it("returns (no matches) when empty", () => {
    expect(formatHierarchy([])).toBe("(no matches)\n");
  });

  it("groups results by file and indents by relative heading depth", () => {
    const results = [
      r({ file: "spec.md", heading: "architecture", level: 2, lineStart: 4 }),
      r({ file: "spec.md", heading: "auth", level: 3, lineStart: 12 }),
      r({ file: "spec.md", heading: "tokens", level: 4, lineStart: 18 }),
      r({ file: "notes.md", heading: "ideas", level: 3, lineStart: 5 }),
    ];
    const out = formatHierarchy(results, { color: false });
    const lines = out.split("\n");

    expect(lines[0]).toBe("spec.md");
    expect(lines[1]).toBe("## architecture  :4");
    expect(lines[3]).toBe("  ### auth  :12");
    expect(lines[5]).toBe("    #### tokens  :18");

    // Second file starts a fresh tree, flush-left at its shallowest level.
    const notesIdx = lines.findIndex((l) => l === "notes.md");
    expect(notesIdx).toBeGreaterThan(0);
    expect(lines[notesIdx + 1]).toBe("### ideas  :5");
  });

  it("sorts a file's hits by lineStart", () => {
    const results = [
      r({ file: "a.md", heading: "later", level: 2, lineStart: 40 }),
      r({ file: "a.md", heading: "earlier", level: 2, lineStart: 10 }),
    ];
    const out = formatHierarchy(results, { color: false });
    expect(out.indexOf("earlier")).toBeLessThan(out.indexOf("later"));
  });

  it("prints match lines under each heading", () => {
    const results = [
      r({
        file: "a.md",
        heading: "h",
        level: 2,
        lineStart: 1,
        matches: [
          { lineNumber: 3, text: "first hit" },
          { lineNumber: 7, text: "second hit" },
        ],
      }),
    ];
    const out = formatHierarchy(results, { color: false });
    expect(out).toContain("  3: first hit");
    expect(out).toContain("  7: second hit");
  });

  it("only prints frontmatter on the first chunk of a file when requested", () => {
    const results = [
      r({
        file: "a.md",
        heading: "x",
        level: 2,
        lineStart: 5,
        frontmatter: { kind: "note", status: "open" },
      }),
      r({
        file: "a.md",
        heading: "y",
        level: 2,
        lineStart: 20,
        frontmatter: { kind: "note", status: "open" },
      }),
    ];
    const out = formatHierarchy(results, { color: false, showFrontmatter: true });
    // Frontmatter appears once, not duplicated per heading.
    expect(out.match(/kind: note/g)?.length).toBe(1);
  });
});

describe("formatText / formatJson regression", () => {
  it("formatText still works", () => {
    const out = formatText(
      [r({ file: "a.md", heading: "h", level: 2, lineStart: 1 })],
      { color: false },
    );
    expect(out).toContain("a.md:1");
  });

  it("formatJson is valid JSON", () => {
    const out = formatJson([
      r({ file: "a.md", heading: "h", level: 2, lineStart: 1 }),
    ]);
    expect(() => JSON.parse(out)).not.toThrow();
  });
});
