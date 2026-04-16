const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require:   'readonly',
        module:    'writable',
        exports:   'writable',
        process:   'readonly',
        console:   'readonly',
        __dirname: 'readonly',
        __filename:'readonly',
        Buffer:    'readonly',
        setTimeout:'readonly',
        setInterval:'readonly',
        clearInterval:'readonly',
        URL:       'readonly',
        fetch:     'readonly',
      },
    },
    rules: {
      'no-unused-vars':  ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console':      'off',
      'semi':            ['error', 'always'],
      'quotes':          ['error', 'single', { avoidEscape: true }],
      'indent':          ['error', 2, { SwitchCase: 1 }],
      'eqeqeq':          ['error', 'always'],
      'no-var':          'error',
      'prefer-const':    'warn',
      'no-trailing-spaces': 'error',
      'eol-last':        ['error', 'always'],
    },
  },
];
