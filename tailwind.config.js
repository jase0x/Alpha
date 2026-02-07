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
          surface: '#000000',
          card: '#000000',
          border: '#222222',
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
          'menu-bg': '#000000',
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
