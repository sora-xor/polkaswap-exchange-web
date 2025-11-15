declare const openApp: () => Cypress.Chainable<Cypress.AUTWindow>;
declare const checkAttr: (subject: any, name: string, value: string) => Cypress.Chainable<string | undefined>;
declare namespace Cypress {
  interface Chainable<Subject> {
    /**
     * Open app
     */
    openApp: typeof openApp;
    /**
     * Check HTML attribute value
     */
    checkAttr(name: string, value: string): Chainable<Subject>;
  }
}
