import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { defineConfig } from 'cypress'
import { loadConfigFromFile } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function useAxeCoreReader(on) {
  let content

  on('task', {
    async readAxeCoreCached() {
      if (!content) {
        const requireFromCwd = createRequire(`${process.cwd()}/package.json`)
        const src = requireFromCwd.resolve('axe-core/axe.min.js')
        content = fs.readFileSync(src, { encoding: 'utf-8' })
      }

      return content
    },
    log(value) {
      if (value !== null && value !== undefined) {
        console.log(value)
      }
      return null
    },
  })
}

function dedupe(values, extras) {
  return Array.from(new Set([...(values ?? []), ...extras]))
}

async function loadComponentViteConfig() {
  const { config: viteConfig } = await loadConfigFromFile(
    { command: 'serve', mode: process.env.NODE_ENV ?? 'development' },
    path.resolve(__dirname, 'vite.config.mts'),
  )

  return {
    ...viteConfig,
    resolve: {
      ...viteConfig?.resolve,
      alias: {
        ...(viteConfig?.resolve?.alias ?? {}),
        vue: 'vue/dist/vue.esm-bundler.js',
      },
    },
    optimizeDeps: {
      ...viteConfig?.optimizeDeps,
      include: dedupe(viteConfig?.optimizeDeps?.include, ['cypress-plugin-tab']),
      exclude: dedupe(viteConfig?.optimizeDeps?.exclude, ['platform']),
    },
  }
}

export default defineConfig({
  component: {
    async setupNodeEvents(on, config) {
      useAxeCoreReader(on)

      const componentViteConfig = await loadComponentViteConfig()

      config.component ??= {}
      config.component.devServer = {
        ...(config.component.devServer ?? {}),
        framework: 'vue',
        bundler: 'vite',
        viteConfig: componentViteConfig,
      }

      return config
    },
    video: false,
    specPattern: './cypress/component/**/*.spec.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'vue',
      bundler: 'vite',
    },
  },
})
