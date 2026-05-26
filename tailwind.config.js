/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cimon: {
          onyx:     '#191919',
          pewter:   '#999999',
          light:    '#f2f2f2',
          gunmetal: '#333333',
          accent:   '#0d3a5e',
        },
      },
      fontFamily: {
        sans:     ['"Helvetica Neue"', 'Pretendard', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
        headline: ['Automati', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
