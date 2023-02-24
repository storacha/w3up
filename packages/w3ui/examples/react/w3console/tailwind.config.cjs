/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@w3ui/react/src/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      backgroundImage: {
        'logo': 'url("/w3.svg")'
      },
      colors: {
        'gray-dark': '#1d2027'
      }
    }
  },
  plugins: []
}
