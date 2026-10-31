import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "prisma/generated/**",
    ],
  },
  {
    files: [
      "src/modules/schedules/schedules.service.js",
      "src/modules/schedules/schedules.controller.js",
      "src/modules/schedules/schedules.schema.js",
      "tests/schedules.service.test.js",
      "tests/schedules.api.test.js",
      "tests/api.test.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
