import { SButton } from '@/lib'

const testIdSelector = (id: string) => `[data-testid=${id}]`

describe('Button', () => {
  const findButton = () => cy.get('button')

  context('Given prop disabled', () => {
    context('When It is true', () => {
      beforeEach(() => {
        cy.mount(SButton, {
          propsData: {
            disabled: true,
          },
          slots: {
            default: () => 'Soramitsu',
          },
        })
      })

      it('Then it has disabled natively', () => {
        findButton().should('have.prop', 'disabled', true)
      })
    })
  })

  context('Given prop loading', () => {
    context('When It is true', () => {
      beforeEach(() => {
        cy.mount(SButton, {
          propsData: {
            loading: true,
          },
          slots: {
            default: () => 'Soramitsu',
          },
        })
      })

      it('Then it has spinner', () => {
        findButton().get(testIdSelector('spinner')).should('exist')
      })

      it('Then there are no icon and text', () => {
        findButton().get(testIdSelector('icon')).should('be.hidden')
        findButton().get(testIdSelector('text')).should('be.hidden')
      })

      it('Then it is disabled', () => {
        findButton().should('have.prop', 'disabled', true)
      })
    })
  })

  context('Given prop uppercase', () => {
    context('When It is true and button is xs sized', () => {
      beforeEach(() => {
        cy.mount(SButton, {
          propsData: {
            size: 'xs',
            uppercase: true,
          },
          slots: {
            default: () => 'Soramitsu',
          },
        })
      })

      it('Then text is in upper case', () => {
        findButton().should('have.css', 'text-transform', 'uppercase')
      })
    })

    context('When It is true and button is not xs sized', () => {
      beforeEach(() => {
        cy.mount(SButton, {
          propsData: {
            size: 'md',
            uppercase: true,
          },
          slots: {
            default: () => 'Soramitsu',
          },
        })
      })

      it('Then text is not in upper case', () => {
        findButton().should('not.have.css', 'text-transform', 'uppercase')
      })
    })
  })

  context('Given prop rounded', () => {
    context('When It is true and button is type action', () => {
      beforeEach(() => {
        cy.mount(SButton, {
          propsData: {
            type: 'action',
            rounded: true,
          },
          slots: {
            default: () => 'Soramitsu',
          },
        })
      })

      it('Then button is rounded', () => {
        findButton().should('have.css', 'border-radius', '9999px')
      })
    })

    context('When It is true and button is not type action', () => {
      beforeEach(() => {
        cy.mount(SButton, {
          propsData: {
            type: 'primary',
            rounded: true,
          },
          slots: {
            default: () => 'Soramitsu',
          },
        })
      })

      it('Then button is not rounded', () => {
        findButton().should('not.have.class', 'rounded-full')
      })
    })
  })
})
