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
          bg: '#080b11',
          surface: '#0d1117',
          card: '#111827',
          border: '#1e2a3a',
          hover: '#162033',
          accent: '#00d4aa',
          'accent-dim': '#00d4aa33',
          cyan: '#22d3ee',
          green: '#10b981',
          red: '#ef4444',
          yellow: '#f59e0b',
          text: '#e2e8f0',
          'text-secondary': '#8899aa',
          'text-muted': '#556677',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
