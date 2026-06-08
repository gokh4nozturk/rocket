import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    langs: ["tsx"],
    themes: ["github-light", "github-dark"],
  });
  return highlighterPromise;
}

export type ComponentSource = {
  /** Raw file contents — used for the clipboard copy. */
  code: string;
  /** shiki-highlighted HTML with light/dark CSS variables. */
  html: string;
};

/**
 * Reads a craft component's source from disk and returns both the raw code and
 * shiki-highlighted HTML. Server-only — touches the filesystem at build/request
 * time.
 */
export async function getComponentSource(name: string): Promise<ComponentSource> {
  const filePath = path.join(process.cwd(), "components", "craft", `${name}.tsx`);
  const code = await readFile(filePath, "utf8");

  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(code, {
    defaultColor: false,
    lang: "tsx",
    themes: { dark: "github-dark", light: "github-light" },
  });

  return { code, html };
}
