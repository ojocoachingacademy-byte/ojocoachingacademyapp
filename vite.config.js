import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      clientPort: 8888  // Client connects through Netlify Dev proxy on 8888
    }
  }
})
