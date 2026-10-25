import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/vue3-vite'
import type { InlineConfig } from 'vite'
import { loadConfigFromFile, mergeConfig } from 'vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const resolve = (...segments: string[]) => path.resolve(dirname, '..', ...segments)

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  async viteFinal(baseConfig) {
    const { config: loadedConfig } = await loadConfigFromFile(
      { mode: 'development', command: 'serve' },
      resolve('vite.config.mts'),
    )

    const mainConfig: InlineConfig & { test?: unknown } = {
      ...(loadedConfig ?? {}),
    }

    delete mainConfig.build
    delete mainConfig.test

    if (Array.isArray(mainConfig.plugins)) {
      // Storybook already wires its own Vue plugin, so skip ours to avoid duplicates
      mainConfig.plugins = mainConfig.plugins.filter((pluginOption) => {
        const entries = Array.isArray(pluginOption) ? pluginOption : [pluginOption]
        return entries.every((entry) => {
          if (!entry || typeof entry !== 'object') {
            return true
          }

          const name = (entry as { name?: string }).name
          return !name || !/vite:vue/.test(name)
        })
      })
    }

    return mergeConfig(baseConfig, mainConfig)
  },
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  docs: {
    autodocs: true,
  },
}

export default config
