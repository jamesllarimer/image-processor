/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
      "./components/**/*.{js,vue,ts}",
      "./layouts/**/*.vue",
      "./pages/**/*.vue",
      "./plugins/**/*.{js,ts}",
      "./app.vue",
    ],
    theme: {
      extend: {
        colors: {
          army: {
            gold:    '#FFB81C',
            black:   '#1C1C1C',
            dark:    '#252525',
            tan:     '#E8DCC8',
            'tan-dark': '#D4C8B0',
          },
        },
      },
    },
    plugins: [],
  }