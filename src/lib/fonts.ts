import localFont from "next/font/local";

/*
 * The site typefaces, self-hosted. The family names follow the const names
 * (`main`, `heading`, `nippo`, `mono`); styles reach them through the
 * `--font-*` variables set on <body>.
 */

/** Satoshi: body copy. */
const main = localFont({
  src: "../fonts/Satoshi_Variable.woff2",
  variable: "--font-main",
  weight: "300 900",
  style: "normal",
  display: "swap",
  fallback: ["system-ui", "Arial"],
});

/** Druk Text Wide Medium Italic: display titles. Shipped as the foundry's trial cut; production needs a licence. */
const heading = localFont({
  src: "../fonts/DrukTextWide_MediumItalic_Trial.woff2",
  variable: "--font-heading",
  weight: "500",
  style: "italic",
  display: "swap",
  fallback: ["system-ui", "Arial"],
});

/** Nippo: labels, navigation and eyebrows, set in wide-tracked capitals. */
const nippo = localFont({
  src: "../fonts/Nippo_Variable.woff2",
  variable: "--font-nippo",
  weight: "200 700",
  style: "normal",
  display: "swap",
  fallback: ["system-ui", "Arial"],
});

/** JetBrains Mono: code. */
const mono = localFont({
  src: [
    { path: "../fonts/JetBrainsMono_VariableFont_wght.ttf", weight: "100 800", style: "normal" },
    { path: "../fonts/JetBrainsMono_Italic_VariableFont_wght.ttf", weight: "100 800", style: "italic" },
  ],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const fontVariables = `${main.variable} ${heading.variable} ${nippo.variable} ${mono.variable}`;
