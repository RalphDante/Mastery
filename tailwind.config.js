/** @type {import('tailwindcss').Config} */
export default {
  content: [

    "./src/**/*.{js,jsx,ts,tsx}",
    // ^ GLOBAL ^
    "!./src/components/NavBar/NavBar.jsx",

  
  ],
  theme: {
    extend: {

      maxWidth: {
        'fwidth': '1034px'
      },
    },
  },
  plugins: [],
}

