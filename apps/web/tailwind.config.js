/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          DEFAULT: '#681D32',
          light: '#852842',
          dark: '#4A1222',
          deep: '#3A0C18',
        },
        gold: {
          DEFAULT: '#C5A15B',
          light: '#E2CA92',
          dark: '#A6843D',
          muted: '#8F7233',
        },
        ivory: {
          DEFAULT: '#F7F0E4',
          dark: '#EFE5D3',
          light: '#FDFBF7',
        },
        deepBrown: {
          DEFAULT: '#30231F',
          light: '#473630',
          dark: '#1F1614',
        },
        champagne: {
          DEFAULT: '#E8D8BD',
          light: '#F2E8D7',
          dark: '#D4C09E',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Cormorant Garamond', 'Georgia', 'serif'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'royal': '0 4px 20px -2px rgba(104, 29, 50, 0.15), 0 2px 6px -1px rgba(197, 161, 91, 0.2)',
        'royal-lg': '0 10px 25px -3px rgba(104, 29, 50, 0.25), 0 4px 10px -2px rgba(197, 161, 91, 0.3)',
        'gold-glow': '0 0 15px rgba(197, 161, 91, 0.4)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 16px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
    },
  },
  plugins: [],
};
