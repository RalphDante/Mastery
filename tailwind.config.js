/** @type {import('tailwindcss').Config} */
export default {
  content: [

    "./src/**/*.{js,jsx,ts,tsx}",
    // ^ GLOBAL ^


  
  ],
  theme: {
    extend: {

      maxWidth: {
        'fwidth': '1034px'
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

