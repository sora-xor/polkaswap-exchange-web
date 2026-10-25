// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import 'virtual:windi.css'
import './custom.scss'

// Alternatively you can use CommonJS syntax:
// require('./commands')

/* eslint-disable no-new-func */
import { mount, VueTestUtils } from 'cypress/vue'
import { defineComponent } from 'vue'
import * as Vue from 'vue'
import { compile } from '@vue/compiler-dom'

// Surface console errors and warnings emitted from the component iframe
Cypress.on('window:before:load', (win) => {
  const originalError = win.console.error
  const originalWarn = win.console.warn

  win.console.error = (...args: any[]) => {
    originalError?.(...args)
    console.error(...args)
  }

  win.console.warn = (...args: any[]) => {
    originalWarn?.(...args)
    console.warn(...args)
  }
})

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

function withRenderedTemplate(component: any) {
  if (
    component &&
    typeof component === 'object' &&
    'template' in component &&
    typeof component.template === 'string' &&
    !component.render
  ) {
    const { template, components, ...rest } = component
    const { code } = compile(template, { mode: 'function' })
    const renderFn = new Function('Vue', `${code}; return render`)(Vue)

    return defineComponent({
      ...rest,
      components: components
        ? Object.fromEntries(Object.entries(components).map(([key, value]) => [key, withRenderedTemplate(value)]))
        : undefined,
      render() {
        return renderFn.call(this, this, [])
      },
    })
  }

  return component
}

Cypress.Commands.add('mount', (component, options = {}) => {
  const baseGlobal = VueTestUtils.config.global ?? {}
  const optionGlobal = options.global ?? {}

  const mergedGlobal = {
    ...baseGlobal,
    ...optionGlobal,
    components: {
      ...(baseGlobal.components ?? {}),
      ...(optionGlobal.components ?? {}),
    },
    directives: {
      ...(baseGlobal.directives ?? {}),
      ...(optionGlobal.directives ?? {}),
    },
    mixins: [...(baseGlobal.mixins ?? []), ...(optionGlobal.mixins ?? [])],
    plugins: [...(baseGlobal.plugins ?? []), ...(optionGlobal.plugins ?? [])],
    provide: {
      ...(typeof baseGlobal.provide === 'object' ? baseGlobal.provide : {}),
      ...(typeof optionGlobal.provide === 'object' ? optionGlobal.provide : {}),
    },
    stubs: {
      ...(baseGlobal.stubs ?? {}),
      ...(optionGlobal.stubs ?? {}),
    },
  }

  if (mergedGlobal.components) {
    mergedGlobal.components = Object.fromEntries(
      Object.entries(mergedGlobal.components).map(([key, value]) => [key, withRenderedTemplate(value)]),
    )
  }

  const resolvedComponent = withRenderedTemplate(component)

  return mount(resolvedComponent as any, {
    ...options,
    global: mergedGlobal,
  })
})

// Example use:
// cy.mount(MyComponent)
/* eslint-enable no-new-func */
