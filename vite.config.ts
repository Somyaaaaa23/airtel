/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The design-token contrast test reads styles.css as text.
  test: { css: { include: [/styles\.css/] } },
})
