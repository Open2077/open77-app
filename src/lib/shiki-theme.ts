import type { ThemeRegistration } from "shiki";

/**
 * Syntax theme for documentation code blocks.
 *
 * The palette of the home page code panels: keywords in red, strings in
 * yellow, numbers and literals in blue, everything else in body text with
 * functions brighter than variables. Comments sit back in the muted slate of
 * the design. The id stays `open-signal` so the docs pipeline is untouched.
 */
export const openSignalSyntaxTheme: ThemeRegistration = {
  name: "open-signal",
  type: "dark",
  colors: {
    "editor.background": "#050c16",
    "editor.foreground": "#e3e8ef",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: { foreground: "#6b82a3", fontStyle: "italic" },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.operator.expression",
        "keyword.operator.logical",
        "storage",
        "storage.type",
        "storage.modifier",
        "entity.name.tag",
      ],
      settings: { foreground: "#ff005f" },
    },
    {
      scope: [
        "string",
        "string.quoted",
        "string.template",
        "constant.character",
        "constant.other.symbol",
        "meta.jsx.children",
      ],
      settings: { foreground: "#fcee0a" },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.language.boolean",
        "constant.language.nil",
        "constant.language.null",
        "support.constant",
      ],
      settings: { foreground: "#08dfec" },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call.generic",
        "variable.function",
        "entity.name.class",
        "entity.name.type",
        "support.class",
      ],
      settings: { foreground: "#ffffff" },
    },
    {
      scope: [
        "variable",
        "variable.other",
        "variable.parameter",
        "variable.language",
        "meta.object-literal.key",
        "support.type.property-name",
      ],
      settings: { foreground: "#c4cfdd" },
    },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: "#8fa0b8" },
    },
    {
      scope: ["invalid", "invalid.illegal"],
      settings: { foreground: "#ff005f" },
    },
  ],
};

/**
 * Grammars loaded into the highlighter.
 *
 * The first four are the only languages the wiki currently fences (`lua`,
 * `text`, `json`, `powershell`); the rest are the ones a guide is realistically
 * about to add. The list is kept short on purpose — every grammar is parsed at
 * build time — and an unlisted language degrades to unhighlighted plain text
 * rather than failing the build, so widening it is never urgent.
 */
export const syntaxLanguages = [
  "lua",
  "text",
  "json",
  "powershell",
  "jsonc",
  "bash",
  "yaml",
  "typescript",
  "xml",
  "diff",
] as const;
