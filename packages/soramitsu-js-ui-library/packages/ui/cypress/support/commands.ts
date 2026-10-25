// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// import 'cypress-plugin-snapshots/commands'

import 'cypress-axe'
import { tabbable } from 'tabbable'

// Overwriting broken injection
Cypress.Commands.overwrite('injectAxe', () => {
  cy.task('readAxeCoreCached', null, { log: false }).then((contents) => {
    cy.get('head', { log: false }).then((el) => {
      el.append(`<script>${contents}</script>`)
    })
  })
})

Cypress.Commands.add('injectAxeAndConfigureCTDefaults', () => {
  cy.injectAxe()

  cy.configureAxe({
    rules: [
      {
        id: 'landmark-one-main',
        enabled: false,
      },
      {
        id: 'page-has-heading-one',
        enabled: false,
      },
      {
        id: 'region',
        enabled: false,
      },
      {
        id: 'html-has-lang',
        enabled: false,
      },
    ],
  })
})

Cypress.Commands.add('dataCy', { prevSubject: 'optional' }, (subject, cyId) => {
  if (subject) {
    return cy.wrap(subject).find(`[data-cy=${cyId}]`)
  }
  return cy.get(`[data-cy=${cyId}]`)
})

Cypress.Commands.add('tab', { prevSubject: 'optional' }, () => {
  return cy.focused({ log: false }).then((focused) => {
    const focusedEl = focused.get(0)

    return cy.get('body', { log: false }).then((x) => {
      const body = x.get(0)
      const elems = tabbable(body)
      const idx = elems.indexOf(focusedEl)
      if (idx < 0) throw new Error('Currently focused element is not found in the list of tabbable elements')

      const nextIdx = (idx + 1) % elems.length
      const nextEl = elems[nextIdx]
      nextEl.focus()

      return nextEl
    })
  })
})

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Command to inject axe-core & configure defaults that are suitable
       * for component testing
       */
      injectAxeAndConfigureCTDefaults: () => Chainable<null>

      /**
       * Shorthand for `[data-cy=<xxx>]` selector with a subject (`cy.find()`) or without (`cy.get()`)
       */
      dataCy: (cyId: string) => Chainable

      /**
       * Switches focus to the next tabbable element within the body
       *
       * Ahh... https://github.com/cypress-io/cypress/issues/299
       */
      tab: () => Chainable<HTMLElement | SVGElement>
    }
  }
}
