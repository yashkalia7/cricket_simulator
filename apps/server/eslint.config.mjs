// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Server lint. Node, not React Native — so this is its own config rather than
 * the Expo one, and the root config deliberately ignores `apps/**`.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
      // A secret must never reach a log line or an error message.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read configuration through loadConfig() in env.ts, so secrets stay in one place and never leak into a log.',
        },
      ],
    },
  },
  {
    // env.ts is the one place allowed to touch process.env.
    files: ['src/env.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
);
