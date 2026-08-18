import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],
  jsx: 'transform',
  external: ['react', 'react-dom'],
  clean: true,
  sourcemap: true,
})
