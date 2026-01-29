import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    hmr: {
      // Only use proxy port if running through Netlify Dev
      clientPort: process.env.NETLIFY_DEV ? 8888 : 5173
    }
  }
})
