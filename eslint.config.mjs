import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      // Modules talk to each other only through their public index.ts (brief A3).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/*"],
              message:
                "Import another module through its public API (@/modules/<name>), not its internals.",
            },
          ],
        },
      ],
    },
  },
  {
    // Domain code is pure TypeScript: no framework, ORM or IO (brief A3).
    files: ["src/modules/*/domain/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react-dom"],
              message: "Domain code must not depend on React/Next.",
            },
            {
              group: ["drizzle-orm", "drizzle-orm/*", "@/db", "@/db/*"],
              message: "Domain code must not touch the database.",
            },
            { group: ["@/modules/*/*"], message: "Import another module through its public API." },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/**"]),
]);

export default eslintConfig;
