import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * ESLint configuration.
 *
 * `next lint` was removed in Next 16, so ESLint runs directly. `eslint-config-next`
 * 16 ships flat config arrays, which are spread in as-is — routing them through
 * `@eslint/eslintrc`'s `FlatCompat` instead makes it try to JSON-serialise a
 * plugin object that references itself, and ESLint dies before linting anything.
 */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "content/**"],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // The content pipeline is the one place tempted to reach for `any`: JSON
      // parses and unified's plugin types. Both have declared shapes instead.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // The build and verification scripts are Node programs whose whole job is
    // to report to a terminal.
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
];

export default config;
