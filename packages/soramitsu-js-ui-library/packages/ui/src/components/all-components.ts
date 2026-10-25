// importing every component - for plugin & tests

// it is placed separately from the `index` file because
// `index` file is re-exported from the `lib` file, but there is
// no intention to expose `COMPONENTS` for the end user

import type { Component } from 'vue'
import * as exportedComponents from './index'
import { getComponentName } from '../util'

function toComponentEntry(candidate: unknown): [string, Component] | null {
  if (!candidate) return null

  if (typeof candidate !== 'object' && typeof candidate !== 'function') {
    return null
  }

  const component = candidate as Component
  const name = getComponentName(component)

  return name ? [name, component] : null
}

let cachedComponents: Record<string, Component> | null = null

function buildComponentsMap(): Record<string, Component> {
  return Object.fromEntries(
    Object.values(exportedComponents)
      .map(toComponentEntry)
      .filter((entry): entry is [string, Component] => Boolean(entry)),
  ) as Record<string, Component>
}

export function getAllComponents(): Record<string, Component> {
  if (!cachedComponents) {
    cachedComponents = buildComponentsMap()
  }

  return cachedComponents
}
