// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';

export default tseslint.config(
  // ─── Исключения ─────────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.spec.ts', 'drizzle.config.ts'],
  },

  // ─── TypeScript ──────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      jsdoc,
    },
    rules: {
      // ── Базовые JS ──────────────────────────────────────────────────────────
      'no-console': 'error',
      'no-debugger': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-unused-vars': 'off',

      // ── Явные типы везде ────────────────────────────────────────────────────
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: false,
          allowHigherOrderFunctions: false,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
      '@typescript-eslint/typedef': [
        'error',
        {
          arrowParameter: true,
          memberVariableDeclaration: true,
          parameter: true,
          propertyDeclaration: true,
          variableDeclaration: false,
        },
      ],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // ── Именование ──────────────────────────────────────────────────────────
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        {
          selector: 'memberLike',
          modifiers: ['public'],
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        {
          selector: 'memberLike',
          modifiers: ['protected'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'function', format: ['camelCase'] },
        // Свойства TS-типов и объектных литералов могут быть snake_case (JSON-ключи API)
        { selector: 'typeProperty', format: ['camelCase', 'snake_case'] },
        { selector: 'objectLiteralProperty', format: ['camelCase', 'snake_case', 'UPPER_CASE'] },
      ],

      // ── Порядок членов класса ────────────────────────────────────────────────
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'static-field',
            'static-method',
            'public-field',
            'protected-field',
            'private-field',
            'constructor',
            'public-method',
            'protected-method',
            'private-method',
          ],
        },
      ],

      // ── Readonly ─────────────────────────────────────────────────────────────
      '@typescript-eslint/prefer-readonly': 'error',

      // ── Strict boolean expressions ───────────────────────────────────────────
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowNullableBoolean: true,
          allowNullableString: false,
          allowNullableNumber: false,
          allowNullableObject: false,
          allowAny: false,
        },
      ],

      // ── Type imports / exports ───────────────────────────────────────────────
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          disallowTypeAnnotations: true,
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: false },
      ],

      // ── Промисы и async ──────────────────────────────────────────────────────
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      // Функция, возвращающая Promise, обязана быть async.
      // checkMethodDeclarations: false — методы классов часто реализуют async-интерфейс
      // синхронно (Promise.resolve), добавление async конфликтует с require-await.
      '@typescript-eslint/promise-function-async': ['error', {
        checkMethodDeclarations: false,
      }],

      // ── Nullability ──────────────────────────────────────────────────────────
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // ── Switch exhaustiveness ────────────────────────────────────────────────
      // Все кейсы discriminated union обязаны быть покрыты в switch
      '@typescript-eslint/switch-exhaustiveness-check': ['error', {
        allowDefaultCaseForExhaustiveSwitch: false,
        requireDefaultForNonUnion: true,
      }],

      // ── Shadowing ────────────────────────────────────────────────────────────
      // Локальная переменная не должна перекрывать внешнюю с тем же именем
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      // ── JSDoc на всех публичных/экспортируемых сущностях ────────────────────
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: false,
          require: {
            ClassDeclaration: true,
            FunctionDeclaration: true,
            MethodDefinition: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration',
            'TSEnumMember',
            'TSPropertySignature',
            'PropertyDefinition',
          ],
          checkConstructors: false,
        },
      ],
      'jsdoc/require-description': ['error', { checkConstructors: false }],
      'jsdoc/require-param': ['error', { checkDestructured: false, checkConstructors: false }],
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': ['error', { checkConstructors: false, checkGetters: false }],
      'jsdoc/require-returns-description': 'error',
      'jsdoc/require-throws': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/check-alignment': 'error',
      'jsdoc/tag-lines': ['error', 'never'],
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
    },
  },

  // ─── DTO files ─────────────────────────────────────────────────────────────
  // Публичные поля DTO соответствуют snake_case JSON-ключам из api-contracts.
  {
    files: ['src/**/*.dto.ts'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        {
          selector: 'memberLike',
          modifiers: ['public'],
          format: ['camelCase', 'snake_case'],
          leadingUnderscore: 'forbid',
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'function', format: ['camelCase'] },
      ],
    },
  },

  // ─── Drizzle schema files ───────────────────────────────────────────────────
  // pgTable extra-config callback has complex internal Drizzle types that cannot
  // be expressed without circular references or unexported Drizzle generics.
  {
    files: ['src/persistence/schemas/*.ts'],
    rules: {
      '@typescript-eslint/typedef': ['error', {
        arrowParameter: false,
        memberVariableDeclaration: true,
        parameter: true,
        propertyDeclaration: true,
        variableDeclaration: false,
      }],
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      }],
      'jsdoc/require-jsdoc': 'off',
    },
  },
);
