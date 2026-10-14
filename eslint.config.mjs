import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptConfig from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "public/**",
    ],
  },
  ...coreWebVitals,
  ...typescriptConfig,
  {
    rules: {
      // The editor legitimately reaches for the DOM outside React (canvas, OPFS,
      // pointer capture) so these stay warnings rather than errors.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    // Tooling under `scripts/` is run by a human in a terminal: its stdout *is*
    // the interface, so reporting progress with console.log is correct there.
    files: ["scripts/**/*.mjs", "scripts/**/*.mts"],
    rules: { "no-console": "off" },
  },
];

export default config;
