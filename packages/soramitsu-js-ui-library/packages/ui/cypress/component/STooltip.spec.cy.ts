import { STooltip } from '@/lib'

const testIdSelector = (id: string) => `[data-testid=${id}]`

describe('Tooltip', () => {
  const TRIGGER_TEXT = 'trigger text'
  const CONTENT = 'content text'
  const CONTENT_SLOT = 'content text for slot'
  const HEADER = 'header text'
  const HEADER_SLOT = 'header text for slot'
  const PRIMARY_BUTTON_TEXT = 'secondary button text'
  const SECONDARY_BUTTON_TEXT = 'primary button text'

  context('Given prop and slot content', () => {
    context('When prop provided ', () => {
      beforeEach(() => {
        cy.mount(STooltip, {
          propsData: {
            content: CONTENT,
          },
          slots: {
            default: () => TRIGGER_TEXT,
          },
        })
      })

      it('Then there is content form prop', () => {
        cy.get(testIdSelector('tooltip-trigger')).trigger('mouseenter')
        cy.get(testIdSelector('tooltip-content')).should('have.text', CONTENT)
      })
    })

    context('When slot provided ', () => {
      beforeEach(() => {
        cy.mount(STooltip, {
          propsData: {
            content: CONTENT,
          },
          slots: {
            default: () => TRIGGER_TEXT,
            content: () => CONTENT_SLOT,
          },
        })
      })

      it('Then there is content from slot', () => {
        cy.get(testIdSelector('tooltip-trigger')).trigger('mouseenter')
        cy.get(testIdSelector('tooltip-content')).should('not.have.text', CONTENT)
        cy.get(testIdSelector('tooltip-content')).should('have.text', CONTENT_SLOT)
      })
    })
  })

  context('Given prop and slot header', () => {
    context('When prop provided ', () => {
      beforeEach(() => {
        cy.mount(STooltip, {
          propsData: {
            header: HEADER,
          },
          slots: {
            default: () => TRIGGER_TEXT,
          },
        })
      })

      it('Then there is header form prop', () => {
        cy.get(testIdSelector('tooltip-trigger')).trigger('mouseenter')
        cy.get(testIdSelector('tooltip-header')).should('have.text', HEADER)
      })
    })

    context('When slot provided ', () => {
      beforeEach(() => {
        cy.mount(STooltip, {
          propsData: {
            header: HEADER,
          },
          slots: {
            default: () => TRIGGER_TEXT,
            header: () => HEADER_SLOT,
          },
        })
      })

      it('Then there is header from slot', () => {
        cy.get(testIdSelector('tooltip-trigger')).trigger('mouseenter')
        cy.get(testIdSelector('tooltip-header')).should('not.have.text', HEADER)
        cy.get(testIdSelector('tooltip-header')).should('have.text', HEADER_SLOT)
      })
    })
  })

  context('Given buttons texts props', () => {
    context('When texts provided ', () => {
      beforeEach(() => {
        cy.mount(STooltip, {
          propsData: {
            primaryButtonText: PRIMARY_BUTTON_TEXT,
            secondaryButtonText: SECONDARY_BUTTON_TEXT,
          },
          slots: {
            default: () => TRIGGER_TEXT,
          },
        })
      })

      it('Then there are buttons with provided texts', () => {
        cy.get(testIdSelector('tooltip-trigger')).trigger('mouseenter')
        cy.get(testIdSelector('tooltip-primary-button')).should('have.text', PRIMARY_BUTTON_TEXT)
        cy.get(testIdSelector('tooltip-secondary-button')).should('have.text', SECONDARY_BUTTON_TEXT)
      })
    })
  })
})
