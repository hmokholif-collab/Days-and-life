import type { Config } from 'tailwindcss';
export default { darkMode: 'class', content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#19213a', coral: '#ff6b5f', mint: '#70d6b0' } } }, plugins: [] } satisfies Config;
