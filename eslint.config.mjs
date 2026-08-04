// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Root ESLint config. Covers `packages/*` — the pure TypeScript half of the
 * monorepo. `apps/mobile` has its own config because it needs the Expo/React
 * Native plugin set, which must never be applied to `packages/domain`.
 *
 * The purity rule for `packages/domain` (BUILD.md §2, §4) lives here and is the
 * reason this file exists at all.
 */

/**
 * `packages/domain` may import exactly two things:
 *   - other files inside `packages/domain` (relative paths)
 *   - `zod`
 *
 * Everything else — React, React Native, the DOM, node builtins, `fetch`
 * wrappers, sibling workspace packages — is a purity violation.
 *
 * This is an allowlist expressed as a deny-regex, not a `group` of
 * gitignore-style globs. The glob form (`['**', '!zod', '!./**']`) looks right
 * and does not work: the negations never match a relative specifier, so `./index`
 * gets reported as a purity violation. Deny "anything that does not start with a
 * dot and is not zod" instead — it says what it means and it is testable.
 *
 * @param {string[]} alsoAllowed extra bare specifiers to permit
 * @returns {string} a regex matching every *forbidden* import specifier
 */
const forbiddenImportRegex = (alsoAllowed = []) => {
  const allowed = ['zod', ...alsoAllowed];
  const exemptions = allowed.map((name) => `(?!${name}$)(?!${name}/)`).join('');
  // `(?!\.)` — relative imports are always fine; they cannot leave the package.
  return String.raw`^(?!\.)${exemptions}.+`;
};

const DOMAIN_PURITY_MESSAGE =
  'packages/domain is pure TypeScript (BUILD.md §2). Only relative imports and `zod` are allowed — ' +
  'no React, no DOM, no React Native, no fetch, no node builtins, no side effects. ' +
  'If you need a platform capability, take it as a parameter instead of importing it.';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/coverage/**',
      'apps/**', // apps lint themselves
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['packages/**/*.{ts,tsx}'],
    rules: {
      // §4: "No `any`."
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // §4: "No `@ts-expect-error` without a comment."
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },

  {
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: forbiddenImportRegex(),
              message: DOMAIN_PURITY_MESSAGE,
            },
          ],
        },
      ],

      // "No side effects" has a runtime half as well as an import half. These are
      // the globals that would let platform state leak into a pure package.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: DOMAIN_PURITY_MESSAGE },
        { name: 'window', message: DOMAIN_PURITY_MESSAGE },
        { name: 'document', message: DOMAIN_PURITY_MESSAGE },
        { name: 'navigator', message: DOMAIN_PURITY_MESSAGE },
        { name: 'localStorage', message: DOMAIN_PURITY_MESSAGE },
        { name: 'process', message: DOMAIN_PURITY_MESSAGE },
        { name: 'global', message: DOMAIN_PURITY_MESSAGE },
        { name: 'globalThis', message: DOMAIN_PURITY_MESSAGE },
        { name: 'XMLHttpRequest', message: DOMAIN_PURITY_MESSAGE },
      ],
    },
  },

  {
    // Tests may reach for Vitest. They are still not allowed to import a platform.
    files: ['packages/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: forbiddenImportRegex(['vitest']),
              message: DOMAIN_PURITY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
);
