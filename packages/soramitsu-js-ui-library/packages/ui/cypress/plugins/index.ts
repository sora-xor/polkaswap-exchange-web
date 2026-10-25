import { startDevServer } from '@cypress/vite-dev-server'
import fs from 'fs'

function useAxeCoreReader(on: Cypress.PluginEvents) {
  let content: string | undefined

  on('task', {
    readAxeCoreCached() {
      if (!content) {
        // use the most correct module resolution
        const src = require.resolve('axe-core/axe.min.js')
        content = fs.readFileSync(src, { encoding: 'utf-8' })
      }

      return content
    },
  })
}

const plugin: Cypress.PluginConfig = (on, config) => {
  on('dev-server:start', async (options) => {
    return startDevServer({
      options,
      // additional opts to the main `vite.config.mts`
      viteConfig: {
        resolve: {
          alias: {
            vue: 'vue/dist/vue.esm-bundler.js',
          },
        },
      },
    })
  })

  useAxeCoreReader(on)
}

export default plugin
