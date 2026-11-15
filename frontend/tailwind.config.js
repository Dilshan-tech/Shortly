/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f2ff',
          100: '#e0e4ff',
          200: '#c7ceff',
          300: '#a3aeff',
          400: '#7a85ff',
          500: '#635bff', // Stripe / Linear signature blurple
          600: '#4e44e6',
          700: '#3e35cc',
          800: '#322ca5',
          900: '#2c2784',
          950: '#181552',
        },
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          800: '#18181b',
          850: '#141416',
          900: '#101013',
          950: '#09090b',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 12px 28px -5px rgba(0, 0, 0, 0.07), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
        'card-dark': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.07), 0 2px 8px 0 rgba(0, 0, 0, 0.45)',
        'card-dark-hover': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 10px 30px 0 rgba(0, 0, 0, 0.65)',
        'btn-primary': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.28), 0 1px 3px 0 rgba(99, 91, 255, 0.45)',
        'btn-primary-hover': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.4), 0 0 20px 2px rgba(99, 91, 255, 0.5)',
      }
    },
  },
  plugins: [],
};
