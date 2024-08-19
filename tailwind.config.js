/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/components/NavBar/Home.jsx",
    "./src/components/CreatePage/DisplayFolders.jsx",
    "./src/components/NavBar/Mastery.jsx",

  ],
  theme: {
    extend: {

      maxWidth: {
        'fwidth': '1014px'
      }
    },
  },
  plugins: [],
}

