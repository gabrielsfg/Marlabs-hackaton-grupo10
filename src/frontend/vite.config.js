import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Em dev, chamadas para /api vao para o backend .NET
    proxy: {
      '/api': {
        target: 'http://localhost:5058',
        changeOrigin: true,
      },
    },
  },
  build: {
    // O build vai direto para o wwwroot da API (monolito)
    outDir: '../Hackaton.Api/wwwroot',
    emptyOutDir: true,
  },
})
