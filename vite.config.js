import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ourspots/',
  build: {
    chunkSizeWarningLimit: 1000, // Höj gränsen till 1000kB för att undvika varningar
    rollupOptions: {
      output: {
        manualChunks: {
          // Dela upp stora vendor-bibliotek i separata chunks
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'map-vendor': ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
          'icons-vendor': ['lucide-react']
        }
      }
    }
  }
})