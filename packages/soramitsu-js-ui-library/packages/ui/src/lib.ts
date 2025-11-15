export * from './types'
export * from './components'

import type { Plugin } from 'vue'
import { getAllComponents } from './components/all-components'
import { getComponentName } from './util'

import 'virtual:windi.css'

export function plugin(): Plugin {
  return (app) => {
    for (const component of Object.values(getAllComponents())) {
      // we can be sure that the name is set - thanks to tests
      const name = getComponentName(component)!
      app.component(name, component)
    }
  }
}
