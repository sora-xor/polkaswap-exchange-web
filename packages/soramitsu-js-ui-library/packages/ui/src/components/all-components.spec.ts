import { test, expect } from 'vitest'
import { getAllComponents } from './all-components'
import { getComponentName } from '../util'

for (const [nameExpected, component] of Object.entries(getAllComponents())) {
  test(`Component "${nameExpected}" should have the same actual "name"`, () => {
    const nameActual = getComponentName(component)

    expect(nameActual).toEqual(nameExpected)
  })
}
