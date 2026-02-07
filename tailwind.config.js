/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        xdex: {
          bg: '#000000',
          surface: '#0a0a0a',
          card: '#111111',
          border: '#03274e',
          hover: '#0a0a0a',
          accent: '#0566ea',
          'accent-dim': '#0566ea33',
          blue: '#0566ea',
          green: '#22c55e',
          red: '#ff1744',
          yellow: '#f59e0b',
          text: '#e6e6e6',
          'text-secondary': '#999999',
          'text-muted': '#555555',
          'menu-bg': 'rgba(17, 17, 17, 0.6)',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
