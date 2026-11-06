import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages(/mtpack/)에서도, 로컬에서도 열리게 상대 경로로
export default defineConfig({
  base: './',
  plugins: [react()],
})
