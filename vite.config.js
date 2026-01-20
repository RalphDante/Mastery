// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react()],
  server: {
    // https: true,
    host: '0.0.0.0', // Allow external connections
    port: 5173,
  },
})