import type { Plugin } from 'vite'
import { compileTemplate } from '@vue/compiler-sfc'
import svgo from 'svgo'
import type { Config as SvgoConfig, Output as SvgoOutput } from 'svgo'
import fs from 'fs/promises'

const SVG_REGEX = /\.svg$/

export interface Options {
  /**
   * @default true
   */
  svgo?: boolean | SvgoConfig
}

function createPlugin(opts?: Options): Plugin {
  const svgoOpts = opts?.svgo ?? true

  return {
    name: 'soramitsu-ui-svg',
    enforce: 'pre',
    load: async (id) => {
      if (!SVG_REGEX.test(id)) return

      let svgContents = await fs.readFile(id, 'utf8')

      if (svgoOpts) {
        const result = svgo.optimize(svgContents, svgoOpts === true ? {} : svgoOpts) as SvgoOutput & {
          error?: string
        }
        if (result.error) throw new Error(`SVGO failed on ${id}: ${result.error}`)
        svgContents = result.data
      }

      const { code } = compileTemplate({
        id: JSON.stringify(id),
        source: svgContents,
        filename: id,
        transformAssetUrls: false,
      })

      return `${code}\n\nexport default { render }`
    },
  }
}

export default createPlugin
