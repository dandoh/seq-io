//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      // Disable import order rules
      'import/order': 'off',
      'simple-import-sort/imports': 'off',
      'simple-import-sort/exports': 'off',
      'sort/imports': 'off',
      'sort-imports': 'off',
      // Disable type specifier and array type rules
      'import/consistent-type-specifier-style': 'off',
      '@typescript-eslint/array-type': 'off',
      "@typescript-eslint/require-await": 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Enforce separate type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },
]
