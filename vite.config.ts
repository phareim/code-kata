import { defineConfig } from 'vitest/config'

export default defineConfig({
  // CodeMirror with its parsers and the task bank (both languages) are most of the bundle, ~350 kB gzipped. The Java
  // compiler (8 MB) and the bridge load only when a visitor runs Java (src/java/run.ts, compiler.ts).
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1300 },
  test: { include: ['test/**/*.test.ts'] },
})
