import { defineConfig } from 'rollup'
import rollupPluginDts from 'rollup-plugin-dts'

export default defineConfig([
  {
    input: 'dist-ts/lib.js',
    external: [/^windicss/],
    output: [
      {
        file: 'dist/lib.esm.js',
        format: 'esm',
      },
      {
        file: 'dist/lib.cjs.js',
        format: 'cjs',
      },
    ],
  },
  {
    input: 'dist-ts/lib.d.ts',
    plugins: [rollupPluginDts()],
    output: {
      file: 'dist/lib.d.ts',
      format: 'esm',
    },
  },
])
