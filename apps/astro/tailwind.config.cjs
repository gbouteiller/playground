/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,js,jsx,svelte,ts,tsx}',
    require('path').join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}'),
  ],
  darkMode: 'class',
  plugins: [
    ...require('@skeletonlabs/skeleton/tailwind/skeleton.cjs')(),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
