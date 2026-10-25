import { SPagination } from '@/lib'
import { VueTestUtils } from 'cypress/vue'

const testIdSelector = (id: string) => `[data-testid=${id}]`

before(() => {
  VueTestUtils.config.global.components = { SPagination }
})

after(() => {
  VueTestUtils.config.global.components = {}
})

describe('Pagination', () => {
  const TOTAL = 202
  const INITIAL_PAGE_NUM = 1

  const getCustomProgressText = (firstItemNum: number, lastItemNum: number, total: number) => {
    return `shown ${firstItemNum} from ${lastItemNum} of ${total}`
  }

  context(`Given pagination`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            total: TOTAL,
            getCustomProgressText,
          }
        },
        template: `
          <SPagination
            :total="total"
            :page-sizes="[10, 20, 100, 200, 500]"
          >
            <template #progress="{ firstItemNum, lastItemNum, total }">
              {{ getCustomProgressText(firstItemNum, lastItemNum, total) }}
            </template>
          </SPagination>`,
      })
    })

    context('When it is initiated', () => {
      it(`Then there are custom text showing pagination progress in 'progress' slot`, () => {
        const customProgressText = getCustomProgressText(1, 10, TOTAL)

        cy.get(testIdSelector('pagination-progress')).should('contain.text', customProgressText)
      })

      it(`Then there are controls block`, () => {
        cy.get(testIdSelector('pagination-controls')).should('exist')
      })

      it(`Then there is first page selected`, () => {
        cy.get('.s-pagination__button_active').should('contain.text', INITIAL_PAGE_NUM)
      })
    })

    context('When page button clicked', () => {
      it('Then page selected', () => {
        const PAGE_BUTTON_FOR_SELECTION = 5

        cy.get(testIdSelector('page-button')).contains(PAGE_BUTTON_FOR_SELECTION).click()
        cy.get('.s-pagination__button_active').should('contain.text', PAGE_BUTTON_FOR_SELECTION)
      })
    })

    context('When next or prev buttons clicked', () => {
      it('Then next or prev page selected', () => {
        cy.get(testIdSelector('next-button')).click()
        cy.get('.s-pagination__button_active').should('contain.text', INITIAL_PAGE_NUM + 1)
        cy.get(testIdSelector('prev-button')).click()
        cy.get('.s-pagination__button_active').should('contain.text', INITIAL_PAGE_NUM)
      })
    })

    context('When jump prev control is used', () => {
      it('Then pagination never underflows the first page', () => {
        const PAGE_BUTTON_FOR_JUMP = 5

        cy.get(testIdSelector('page-button')).contains(PAGE_BUTTON_FOR_JUMP).click()
        cy.get('.s-pagination__button_active').should('contain.text', PAGE_BUTTON_FOR_JUMP)

        cy.get(testIdSelector('page-button')).first().click()

        cy.get('.s-pagination__button_active').should('contain.text', 1)
        cy.get(testIdSelector('pagination-progress')).should('contain.text', getCustomProgressText(1, 10, TOTAL))
      })
    })

    context('When first page selected', () => {
      it(`Then prev button doesn't work`, () => {
        cy.get('.s-pagination__button_active').should('contain.text', INITIAL_PAGE_NUM)
        cy.get(testIdSelector('prev-button')).click()
        cy.get('.s-pagination__button_active').should('contain.text', INITIAL_PAGE_NUM)
      })
    })

    context('When last page selected', () => {
      it(`Then next button doesn't work`, () => {
        cy.get(testIdSelector('page-button'))
          .last()
          .within((el) => {
            cy.wrap(el).click()
            cy.wrap(el).should('have.class', 's-pagination__button_active')

            cy.wrap(el).closest(testIdSelector('pagination')).find(testIdSelector('next-button')).click()
            cy.wrap(el).should('have.class', 's-pagination__button_active')
          })
      })
    })
  })

  context(`Given pagination with a few pages`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            total: TOTAL,
          }
        },
        template: `
          <SPagination
            :total="total"
            :page-sizes="[100]"
          />`,
      })
    })

    context('When it is initiated', () => {
      it(`Then there are no controls block`, () => {
        cy.get(testIdSelector('pagination-controls')).should('not.exist')
      })
    })
  })
})
