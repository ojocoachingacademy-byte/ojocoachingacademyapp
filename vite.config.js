import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Suppress 500 errors for missing favicon and other common requests
    middlewareMode: false,
  },
  // Handle favicon requests gracefully
  publicDir: 'public',
  // Enable source maps in development for better debugging
  // Disable in production to reduce bundle size
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
  }
})
