import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import path from 'path'

// modified fix from https://github.com/preactjs/preset-vite/issues/56
// also includes `preact/jsx-runtime` alias, as rollup build fails without it.
const patchedPreactPlugin = preact()
patchedPreactPlugin[0].config = () => ({
  resolve: {
    alias: {
      'react-dom/test-utils': path.resolve(
        __dirname,
        './node_modules/preact/test-utils'
      ),
      'react-dom': path.resolve(__dirname, './node_modules/preact/compat'),
      react: path.resolve(__dirname, './node_modules/preact/compat'),
      'preact/jsx-runtime': path.resolve(
        __dirname,
        './node_modules/preact/jsx-runtime'
      ),
    },
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  plugins: [patchedPreactPlugin],
  server: {
    port: 3000,
  },
})
