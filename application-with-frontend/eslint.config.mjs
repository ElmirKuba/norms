// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import jsdoc from 'eslint-plugin-jsdoc';

export default tseslint.config(
  // ─── Исключения ─────────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'dist-electron/**', 'node_modules/**', '**/*.spec.ts'],
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
        project: './tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@angular-eslint': angular,
      jsdoc,
    },
    rules: {
      // ── Базовые JS ──────────────────────────────────────────────────────────
      'no-console': 'error',
      'no-debugger': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      // no-unused-vars базовый отключаем — используем TS-версию
      'no-unused-vars': 'off',

      // ── Явные типы везде ────────────────────────────────────────────────────
      // Обязательный тип возврата на всех функциях, включая колбэки (.map, .filter и т.д.)
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: false,
          allowHigherOrderFunctions: false,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      // Обязательный тип возврата на всех экспортируемых функциях
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // public/private/protected обязательны на всех членах класса
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
      // Явные аннотации типов даже если TS может вывести сам
      '@typescript-eslint/typedef': [
        'error',
        {
          arrowParameter: true, // (x: number): string => ...
          memberVariableDeclaration: true, // class { prop: string = ... }
          parameter: true, // function f(x: string): void
          propertyDeclaration: true, // interface/type { prop: string }
          variableDeclaration: false, // const x = 'hello' — вывод TS достаточен
        },
      ],
      // Разрешаем писать явные типы даже там, где TS вывел бы сам
      '@typescript-eslint/no-inferrable-types': 'off',
      // Запрет any
      '@typescript-eslint/no-explicit-any': 'error',
      // Пустые классы допускаются, если есть декоратор (Angular-компоненты-заглушки)
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      // Неиспользуемые переменные/параметры (параметры с _ разрешены)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // ── Именование ──────────────────────────────────────────────────────────
      '@typescript-eslint/naming-convention': [
        'error',
        // Типы, классы, интерфейсы, перечисления — PascalCase
        { selector: 'typeLike', format: ['PascalCase'] },
        // Члены enum — UPPER_CASE
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        // Публичные члены класса — camelCase без подчёркивания
        {
          selector: 'memberLike',
          modifiers: ['public'],
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
        },
        // Приватные члены — camelCase с обязательным _ в начале
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        // Protected члены — camelCase с обязательным _ в начале
        {
          selector: 'memberLike',
          modifiers: ['protected'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        // Переменные — camelCase или UPPER_CASE (для констант)
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
        // Параметры — camelCase (ведущий _ разрешён для неиспользуемых)
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        // Функции — camelCase
        { selector: 'function', format: ['camelCase'] },
      ],

      // ── Порядок членов класса ────────────────────────────────────────────────
      // static → fields → constructor → methods (от public к private)
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
      // Если свойство нигде не переназначается — должно быть readonly
      '@typescript-eslint/prefer-readonly': 'error',

      // ── Strict boolean expressions ────────────────────────────────────────────
      // Запрет неявного приведения к boolean (строк, чисел, объектов)
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
      // import type { Foo } — для типов используем type-import.
      // fixStyle: 'separate-type-imports' (не inline) — Angular DI через inject()
      // требует чтобы класс-токен был value-импортом. Inline-стиль может ввести
      // в заблуждение авто-фикс в IDE и случайно превратить value-import в type.
      // Separate-стиль явно разделяет: import { inject } и import type { Foo }.
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
      // Промис нельзя оставить «висящим» без await или .catch()
      '@typescript-eslint/no-floating-promises': 'error',
      // Нельзя передавать async-функцию туда, где ожидается sync
      '@typescript-eslint/no-misused-promises': 'error',
      // await можно применять только к Thenable
      '@typescript-eslint/await-thenable': 'error',
      // async-функция без await — ошибка
      '@typescript-eslint/require-await': 'error',
      // Функция, возвращающая Promise, обязана быть async.
      // checkMethodDeclarations: false — методы классов часто реализуют async-интерфейс
      // синхронно (Promise.resolve), добавление async конфликтует с require-await.
      '@typescript-eslint/promise-function-async': ['error', {
        checkMethodDeclarations: false,
      }],

      // ── Nullability ──────────────────────────────────────────────────────────
      // Предпочитать ?? вместо ||
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      // Предпочитать a?.b?.c вместо a && a.b && a.b.c
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
      // Типы не дублируем в JSDoc — они уже есть в TypeScript
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: false,
          require: {
            ClassDeclaration: true, // export class Foo {}
            FunctionDeclaration: true, // export function foo() {}
            MethodDefinition: true, // public method() {}
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            'TSInterfaceDeclaration', // export interface Foo {}
            'TSTypeAliasDeclaration', // export type Foo = ...
            'TSEnumDeclaration', // export enum Foo {}
            'TSEnumMember', // член enum: FOO = 'foo'
            'TSPropertySignature', // поля interface { ... }
            'PropertyDefinition', // поля class { ... }
          ],
          checkConstructors: false,
        },
      ],
      'jsdoc/require-description': ['error', { checkConstructors: false }],
      'jsdoc/require-param': ['error', { checkDestructured: false, checkConstructors: false }],
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-param-description': 'error',
      // checkGetters: false — геттеры не обязаны иметь @returns, описание в JSDoc достаточно
      'jsdoc/require-returns': ['error', { checkConstructors: false, checkGetters: false }],
      'jsdoc/require-returns-description': 'error',
      'jsdoc/require-throws': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/check-alignment': 'error',
      'jsdoc/tag-lines': ['error', 'never'],
      // Типы в JSDoc не нужны — TypeScript уже их знает
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',

      // ── Angular ─────────────────────────────────────────────────────────────
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/directive-class-suffix': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      // ChangeDetectionStrategy.OnPush обязателен
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      // Нельзя вручную вызывать lifecycle-хуки
      '@angular-eslint/no-lifecycle-call': 'error',
      // selector компонентов — kebab-case element, без принудительного префикса
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: [], style: 'kebab-case' },
      ],
      // selector директив — camelCase attribute, без принудительного префикса
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: [], style: 'camelCase' },
      ],
    },
  },

  // ─── HTML шаблоны ────────────────────────────────────────────────────────────
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    rules: {
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
    },
  },
);
