import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appSrc = path.resolve(__dirname, './src')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:5000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': appSrc,
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: devApiTarget,
          changeOrigin: true,
        },
        '/labels': {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
