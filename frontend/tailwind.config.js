/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        study: {
          purple: '#6c63ff',
          lilac: '#a78bfa',
        },
      },
    },
  },
  plugins: [],
};
