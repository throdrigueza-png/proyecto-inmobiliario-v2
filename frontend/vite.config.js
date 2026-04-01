import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Output the React build directly into backend/static so FastAPI can serve it.
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    // During local development, proxy API requests to the FastAPI dev server.
    proxy: {
      '/auth':       { target: 'http://localhost:8000', changeOrigin: true },
      '/properties': { target: 'http://localhost:8000', changeOrigin: true },
      '/upload':     { target: 'http://localhost:8000', changeOrigin: true },
      '/favorites':  { target: 'http://localhost:8000', changeOrigin: true },
      '/users':      { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
