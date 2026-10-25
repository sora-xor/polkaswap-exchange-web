import { defineConfig } from 'vitest/config'
import Windi from 'vite-plugin-windicss'
import Vue from '@vitejs/plugin-vue'
import type { RootNode, TemplateChildNode } from '@vue/compiler-core'
import Icons from 'unplugin-icons/vite'
import SvgPlugin from '@soramitsu-ui/vite-plugin-svg'
import AutoImport from 'unplugin-auto-import/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

function resolve(...args: string[]): string {
  return path.resolve(rootDir, ...args)
}

// Support both ESM and CommonJS builds of the SVG plugin
const svgPlugin = (SvgPlugin as any).default ?? SvgPlugin

const vueCompilerTransforms = {
  removeAttribute(attr: string) {
    return (node: RootNode | TemplateChildNode) => {
      if (process.env.NODE_ENV === 'production') {
        if (node.type === 1 /* NodeTypes.ELEMENT */) {
          for (let i = 0; i < node.props.length; i++) {
            const p = node.props[i]

            if (p && p.type === 6 /* NodeTypes.ATTRIBUTE */ && p.name === attr) {
              node.props.splice(i, 1)
              i--
            }

            if (
              p &&
              p.type === 7 /* NodeTypes.DIRECTIVE */ &&
              p.name === 'bind' &&
              p.arg &&
              'content' in p.arg &&
              p.arg.content === attr
            ) {
              node.props.splice(i, 1)
              i--
            }
          }
        }
      }
    }
  },
}

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'happy-dom',
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
  resolve: {
    alias: {
      '@': resolve('src'),
      '@popperjs/core': '@popperjs/core/lib/index',
    },
  },
  plugins: [
    Windi({
      // explicit path in case when cwd is not project root
      config: resolve('windi.config.ts'),
    }),
    Vue({
      template: {
        compilerOptions: {
          nodeTransforms: [vueCompilerTransforms.removeAttribute('data-testid')],
        },
      },
    }),
    Icons(),
    svgPlugin({
      svgo: {
        plugins: [{ name: 'removeViewBox', active: false }],
      },
    }),
    AutoImport({
      imports: ['vue', '@vueuse/core'],
      dts: process.env.GENERATE_AUTO_IMPORT_FILES !== 'false',
      eslintrc: {
        enabled: process.env.GENERATE_AUTO_IMPORT_FILES !== 'false',
      },
    }),
  ],
  build: {
    sourcemap: true,
    cssCodeSplit: false,
    minify: false,
    chunkSizeWarningLimit: 2_000,
    reportCompressedSize: false,
    target: 'esnext',
    lib: {
      entry: resolve('src/lib.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `lib.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      output: { chunkFileNames: '[name].[format].js' },
      external: [
        'vue',
        /^lodash/,
        'jsoneditor',
        '@popperjs/core',
        /^@vueuse/,
        '@soramitsu-ui/theme',
        'body-scroll-lock',
        'focus-trap',
      ],
    },
  },
})
