import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000 },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-grid-layout')) return 'grid'
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor'
        },
      },
    },
  },
})
