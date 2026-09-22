/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  theme: {
    extend: {
      colors: {
        /**
         * Canvas di pagina — neutro chiaro, alto contrasto con text-ink (#1b2430).
         * Uso: bg-background
         */
        background: {
          DEFAULT: '#f1f4f8',
        },
        brand: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd6ff',
          300: '#8ebaff',
          400: '#5993ff',
          500: '#1f6feb',
          600: '#1558d6',
          700: '#1245ad',
          800: '#143c8f',
          900: '#163574',
          950: '#112249',
        },
        surface: {
          DEFAULT: '#f7f9fc',
          muted: '#eef2f7',
          raised: '#ffffff',
          sunken: '#e8edf3',
        },
        ink: {
          DEFAULT: '#1b2430',
          secondary: '#445566',
          tertiary: '#667788',
          inverse: '#ffffff',
        },
        line: {
          DEFAULT: '#e3e8ef',
          strong: '#c9d0da',
          focus: '#9aa7b8',
        },
        success: {
          DEFAULT: '#146c2e',
          soft: '#e7f7ed',
        },
        warning: {
          DEFAULT: '#d9892b',
          soft: '#fff4e5',
        },
        /**
         * Scala rossa per azioni distruttive (es. Elimina) e alert di errore.
         * Uso: bg-danger-500, hover:bg-danger-600, text-danger-700, bg-danger-50.
         */
        danger: {
          50: '#fdecea',
          100: '#f9d4cf',
          200: '#f3ada4',
          300: '#e87b6d',
          400: '#d94a3a',
          500: '#c6281a',
          600: '#a81f14',
          700: '#8a1f11',
          800: '#721c12',
          900: '#5f1b14',
          950: '#340c08',
          DEFAULT: '#c6281a',
          soft: '#fdecea',
        },
      },
    },
  },
  plugins: [],
};
