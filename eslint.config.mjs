import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/', 'types/', 'coverage/', 'node_modules/', 'tmp/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // The package version is read from package.json at runtime.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
);
