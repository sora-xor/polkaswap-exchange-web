import { defineConfig } from 'windicss/helpers'

export default defineConfig({
  extract: {
    include: [
      'src/**/*.vue',
      'cypress/component/**/*.spec.cy.{js,ts}',
      'cypress/component/**/*.vue',
      'stories/**/*.stories.{js,ts}',
    ],
  },
})
