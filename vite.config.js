import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: mode === "ux_test" ? { "import.meta.env.VITE_APP_MODE": JSON.stringify("ux_test") } : {},
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
  },
}))
