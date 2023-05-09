/** @type {import("prettier").Config} */
module.exports = {
  arrowParens: 'always',
  bracketSpacing: false,
  printWidth: 140,
  proseWrap: 'always',
  semi: true,
  singleQuote: true,
  svelteSortOrder: 'markup-scripts-styles',
  trailingComma: 'es5',
  plugins: [require.resolve('prettier-plugin-astro'), require('prettier-plugin-svelte'), require.resolve('prettier-plugin-tailwindcss')],
  overrides: [{files: '*.astro', options: {parser: 'astro'}}],
  pluginSearchDirs: false,
};
