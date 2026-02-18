import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const PORT_MAP = {
  'cwn-character-creator': 5100,
  'cwn-workspace-1': 5101,
  'cwn-workspace-2': 5102,
  'cwn-workspace-3': 5103,
}

const dirName = path.basename(path.resolve('..'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/cwn-character-creator/',
  server: {
    port: PORT_MAP[dirName] || 5100,
    strictPort: true,
  },
})
