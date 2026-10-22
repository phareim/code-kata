import { defineConfig } from 'vitest/config'

export default defineConfig({
  // CodeMirror with the JavaScript parser is most of the bundle, ~170 kB gzipped.
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 700 },
  test: { include: ['test/**/*.test.ts'] },
})
