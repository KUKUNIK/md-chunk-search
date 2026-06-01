export interface Chunk {
  file: string;
  level: number;
  heading: string;
  body: string;
  lineStart: number;
  lineEnd: number;
  frontmatter: Record<string, unknown>;
}

export interface SearchOptions {
  pattern: string;
  paths: string[];
  regex?: boolean;
  ignoreCase?: boolean;
  level?: number;
  filters?: Record<string, string>;
  limit?: number;
  context?: number;
  extensions?: string[];
  exclude?: string[];
}

export interface MatchLine {
  lineNumber: number;
  text: string;
}

export interface SearchResult {
  file: string;
  heading: string;
  level: number;
  lineStart: number;
  lineEnd: number;
  matches: MatchLine[];
  snippet: string;
  frontmatter: Record<string, unknown>;
}
