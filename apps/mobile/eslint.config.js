// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // §4 definition of done: no `any`, no undocumented suppressions.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    /*
     * §4: "Every domain concept comes from packages/domain/ontology. No string
     * literals for positions, lengths, lines or phases anywhere in a component."
     *
     * This rule cannot catch a bare string literal on its own, so it catches the
     * next best thing: a component defining domain vocabulary locally instead of
     * importing it. Tighten this in M1 once the ontology exists and the real
     * union types are importable.
     */
    files: ['app/**/*.tsx', 'components/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "TSTypeAliasDeclaration[id.name=/^(Length|Line|Variation|Intent|PositionId|Phase|ShotType|ScoringZone|Archetype|Format)$/]",
          message:
            'Domain vocabulary is defined once, in packages/domain/ontology (BUILD.md §4). Import it.',
        },
      ],
    },
  },
]);
