import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Tạo alias để gọi thẳng vào thư mục data của server
      '@server-data': path.resolve(__dirname, '../server/src/data'),
      // Alias tiện ích cho chính thư mục client
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    fs: {
      // Quan trọng: Cho phép Vite truy cập tệp ngoài thư mục client/
      allow: [
        '.',
        '../server/src/data'
      ]
    },
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'ws://localhost:3001', ws: true },
    }
  }
})