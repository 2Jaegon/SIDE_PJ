/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 밝은 중성 바탕 + 초록 계열 포인트 한 가지. 색은 데이터·상태·주 행동에만 쓴다.
      colors: {
        ground: '#f5f5f3',
        surface: '#ffffff',
        sunken: '#ececea',
        line: '#e0e0dc',
        ink: '#1a1a18',
        sub: '#53524d',
        faint: '#6a6963',
        accent: { DEFAULT: '#0b6b5c', hover: '#095649', soft: '#e1f0ec' },
        danger: { DEFAULT: '#a33a2a', soft: '#f9e8e4' },
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { DEFAULT: '8px' },
      fontSize: { xs: ['0.8125rem', '1.25rem'] },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}
