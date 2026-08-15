import type { Config } from 'tailwindcss';
import { fontFamilies } from '@my-backpack/shared/constants/theme';

// fontFamily.sans overrides Tailwind Preflight's `html { font-family: ... }` default, which is
// how Nunito Sans becomes the whole app's body font with zero component changes — see
// src/index.css for the actual @font-face imports and the h1-h6 -> font-display rule.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [fontFamilies.body, 'system-ui', 'sans-serif'],
        display: [fontFamilies.display, 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
