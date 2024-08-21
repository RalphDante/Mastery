/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/components/NavBar/Home.jsx",
    "./src/components/CreatePage/DisplayFolders.jsx",
    "./src/components/NavBar/Mastery.jsx",
    "./src/components/CreatePage/DisplayFlashCards.jsx",
    "./src/components/CreatePage/DisplayFiles.jsx",

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

