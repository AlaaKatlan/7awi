/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'hawy-blue': '#007AC3', // الأزرق المستخرج من اللوغو
        'hawy-dark': '#005f99', // درجة أغمق للهوفر
        'hawy-grey': '#6B7280', // الرمادي
        'surface': '#F8FAFC',   // خلفية الصفحات
      }
    },
  },
  plugins: [],
}
