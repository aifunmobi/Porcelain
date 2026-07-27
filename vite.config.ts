import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* The build stamps its own timestamp. It used to be a hand-edited literal in
 * version.ts, which meant the About panel claimed a build date from whenever
 * someone last remembered to change it — a day stale after a session of work,
 * and silently wrong rather than obviously missing. */
const buildTimestamp = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
  },
})
