import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  clean: true,
  sourcemap: true,
})
