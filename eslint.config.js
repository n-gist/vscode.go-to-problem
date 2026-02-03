import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

const jsFiles = ['**/*.{js,jsx,mjs,cjs}']
const tsFiles = ['**/*.{ts,tsx,mts,cts}']

/** @type {import('eslint').Linter.Config} */
const ignores = {
    ignores: [
        'dist/*'
    ],
}

/** @type {import('eslint').Linter.Config[]} */
const rules = [
    {
        // ts
        files: tsFiles,
        plugins: {
        },
        rules: {
        }
    },
    {
        // js
        files: jsFiles,
        rules: {
        }
    },
    {
        // common
        plugins: {
            '@stylistic': stylistic
        },
        rules: {
            '@typescript-eslint/no-unused-vars':
            [
                'warn',
                {
                    'args': 'all',
                    'argsIgnorePattern': '^_',
                    'caughtErrors': 'all',
                    'caughtErrorsIgnorePattern': '^_',
                    'destructuredArrayIgnorePattern': '^_',
                    'varsIgnorePattern': '^_',
                    'ignoreRestSiblings': true
                }
            ],
            '@typescript-eslint/no-empty-function': 'off',
            '@stylistic/indent': ['warn', 4],
            '@stylistic/quotes': ['warn', 'single'],
            '@stylistic/semi': ['warn', 'never']
        },
        settings: {
            react: {
                version: 'detect'
            }
        }
    }
]

/** @type {import('eslint').Linter.Config} */
const jsConfig = {
    files: jsFiles,
    ...tseslint.configs.disableTypeChecked,
    name: 'eslint-js-config'
}
jsConfig.languageOptions.globals = {}

/** @type {import('eslint').Linter.Config} */
const tsConfig = {
    files: tsFiles,
    name: 'eslint-ts-config',
    languageOptions: {
        globals: {},
        parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname
        }
    }
}


export default [
    ignores,
    pluginJs.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    tsConfig,
    jsConfig,
    ...rules
]
