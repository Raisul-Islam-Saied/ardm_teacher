import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const teacherEditorSrc = path.resolve(__dirname, 'src/components/teacher')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': teacherEditorSrc,
      '@api': path.resolve(teacherEditorSrc, 'api'),
      '@components': path.resolve(teacherEditorSrc, 'components'),
      '@constants': path.resolve(teacherEditorSrc, 'constants'),
      '@data': path.resolve(teacherEditorSrc, 'data'),
      '@pages': teacherEditorSrc,
      '@utils': path.resolve(teacherEditorSrc, 'utils')
    }
  }
})
