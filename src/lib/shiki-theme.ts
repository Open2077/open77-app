import type { ThemeRegistration } from "shiki";

/**
 * Syntax theme for documentation code blocks.
 *
 * The colours are lifted from the hand-written `.code-body` palette in the
 * design system (`07-content.css`) so a highlighted Lua block in the docs and
 * the API design preview on the platform page read as the same surface. Only
 * these six hues exist in the palette; anything unscoped falls back to body
 * text rather than introducing a seventh colour.
 */
export const openSignalSyntaxTheme: ThemeRegistration = {
  name: "open-signal",
  type: "dark",
  colors: {
    "editor.background": "#0d1624",
    "editor.foreground": "#f2f6f8",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: { foreground: "#8d99a8b8", fontStyle: "italic" },
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
      settings: { foreground: "#22d8e2" },
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
      settings: { foreground: "#ffd9a0" },
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
      settings: { foreground: "#ffc27d" },
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
      settings: { foreground: "#9db8ff" },
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
      settings: { foreground: "#c9a7ff" },
    },
    {
      scope: ["punctuation", "meta.brace", "keyword.operator"],
      settings: { foreground: "#f2f6f8" },
    },
    {
      scope: ["invalid", "invalid.illegal"],
      settings: { foreground: "#ff5964" },
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
  "typescript",
  "diff",
] as const;
