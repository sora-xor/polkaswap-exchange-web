import { STable, STableColumn } from '@/lib'
import { VueTestUtils } from 'cypress/vue'

const testIdSelector = (id: string) => `[data-testid=${id}]`

before(() => {
  VueTestUtils.config.global.components = { STable, STableColumn }
})

after(() => {
  VueTestUtils.config.global.components = {}
})

describe('Table', () => {
  const NO_DATA_TEXT = 'There are no data found'

  const ADAPT_BREAKPOINT = 920

  const PROP_NAME_1 = 'prop1'
  const PROP_NAME_2 = 'prop2'
  const PROP_NAME_3 = 'date'
  const PROP_NAME_4 = 'prop4'

  const PROP_FOR_ROW_KEY = PROP_NAME_1
  const HIGHLIGHTED_KEY = '12'
  const COMMON_KEY = '21'

  const ROW_1 = { [PROP_NAME_1]: COMMON_KEY, [PROP_NAME_2]: 'a12', [PROP_NAME_3]: 1424631694418, [PROP_NAME_4]: 'c12' }
  const ROW_2 = {
    [PROP_NAME_1]: HIGHLIGHTED_KEY,
    [PROP_NAME_2]: 'a421',
    [PROP_NAME_3]: 1224382694418,
    [PROP_NAME_4]: 'c21',
  }
  const ROW_3 = { [PROP_NAME_1]: '31', [PROP_NAME_2]: 'a2', [PROP_NAME_3]: 1524682614418, [PROP_NAME_4]: 'c2' }
  const ROW_4 = { [PROP_NAME_1]: '13', [PROP_NAME_2]: 'a32', [PROP_NAME_3]: 1654642633318, [PROP_NAME_4]: 'c32' }

  const ALT_ROW_1 = {
    [PROP_NAME_1]: COMMON_KEY,
    [PROP_NAME_2]: 'b12',
    [PROP_NAME_3]: 1424331994418,
    [PROP_NAME_4]: 'g12',
  }
  const ALT_ROW_2 = { [PROP_NAME_1]: 'q12', [PROP_NAME_2]: 'b421', [PROP_NAME_3]: 1223389694418, [PROP_NAME_4]: 'g21' }
  const ALT_ROW_3 = { [PROP_NAME_1]: 'q31', [PROP_NAME_2]: 'b2', [PROP_NAME_3]: 1524632694418, [PROP_NAME_4]: 'g2' }
  const ALT_ROW_4 = { [PROP_NAME_1]: 'q13', [PROP_NAME_2]: 'b32', [PROP_NAME_3]: 1654342933318, [PROP_NAME_4]: 'g32' }

  const DATA = [ROW_1, ROW_2, ROW_3, ROW_4]
  const ALT_DATA = [ALT_ROW_1, ALT_ROW_2, ALT_ROW_3, ALT_ROW_4]

  const ROW_INDEX_TO_SELECT_AS_NEW_CURRENT = DATA.length - 1

  const ROW_CLASS_NAME = 'ROW_CLASS_NAME'
  const ROW_STYLE = { color: 'rgb(11, 22, 33)' }
  const CELL_CLASS_NAME = 'CELL_CLASS_NAME'
  const CELL_STYLE = { color: 'rgb(22, 33, 44)' }
  const HEADER_ROW_CLASS_NAME = 'HEADER_ROW_CLASS_NAME'
  const HEADER_ROW_STYLE = { color: 'rgb(33, 44, 55)' }
  const HEADER_CELL_CLASS_NAME = 'HEADER_CELL_CLASS_NAME'
  const HEADER_CELL_STYLE = { color: 'rgb(44, 55, 66)' }

  const COLUMN_CELL_CLASS_NAME = 'COLUMN_CELL_CLASS_NAME'
  const COLUMN_HEADER_CELL_CLASS_NAME = 'COLUMN_HEADER_CELL_CLASS_NAME'

  context(`Given table with width bigger than adapt breakpoint`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            data: DATA,
          }
        },
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT + 1}px"
            :data="data"
          >
            <STableColumn prop="${PROP_NAME_1}" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then there are data rows are represented with table', () => {
        cy.get(testIdSelector('table-body')).filter('table').should('exist')
        cy.get(testIdSelector('table-row')).filter('tr').should('exist')
      })
    })
  })

  context(`Given table with width equal to adapt breakpoint`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            data: DATA,
          }
        },
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT}px"
            :data="data"
          >
            <STableColumn prop="${PROP_NAME_1}" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then there are data rows are represented with cards grid', () => {
        cy.get(testIdSelector('table-row')).should('have.class', 's-table-card')
      })
    })
  })

  context(`Given table with expand and selection columns with all rows expanded by default`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            data: DATA,
          }
        },
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT + 1}px"
            :data="data"
            default-expand-all
          >
            <STableColumn type="selection" />
            <STableColumn prop="${PROP_NAME_1}" />
            <STableColumn type="expand" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then rows count equal data array length', () => {
        cy.get(testIdSelector('table-row')).should('have.length', DATA.length)
      })

      it('Then there are expanded block for every row', () => {
        cy.get(testIdSelector('table-expanded-block')).should('have.length', DATA.length)
      })
    })

    context('When expand cell clicked', () => {
      it("Then it's expanded block hidden", () => {
        cy.get(testIdSelector('table-row'))
          .first()
          .get(testIdSelector('table-expanded-icon'))
          .eq(0)
          .closest('td')
          .click()
        cy.get(testIdSelector('table-row'))
          .first()
          .next()
          .should('not.have.attr', 'data-testid', 'table-expanded-block')
      })
    })

    context('When header selection checkbox clicked', () => {
      it('Then all selection checkboxes are selected', () => {
        cy.get(testIdSelector('table-header-selection-checkbox')).click()
        cy.get(testIdSelector('table-selection-checkbox'))
          .not(`${testIdSelector('table-header-selection-checkbox')} ${testIdSelector('table-selection-checkbox')}`)
          .filter('[data-checked="true"]')
          .should('have.length', DATA.length)
      })
    })

    context('When selection checkbox clicked', () => {
      it('Then it is checked', () => {
        cy.get(testIdSelector('table-selection-checkbox')).first().click()
        cy.get(testIdSelector('table-selection-checkbox')).first().should('have.attr', 'data-checked', 'true')
      })
    })
  })

  context(`Given adapted table with expand and selection columns with all rows expanded by default`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            data: DATA,
          }
        },
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT}px"
            :data="data"
            default-expand-all
          >
            <STableColumn type="selection" />
            <STableColumn prop="${PROP_NAME_1}" />
            <STableColumn type="expand" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then rows count equal data array length', () => {
        cy.get(testIdSelector('table-row')).should('have.length', DATA.length)
      })

      it('Then there are expanded block for every row', () => {
        cy.get(testIdSelector('table-expanded-block')).should('have.length', DATA.length)
      })
    })

    context('When expand button clicked', () => {
      it("Then it's expanded block hidden", () => {
        cy.get(testIdSelector('table-row')).first().find(testIdSelector('table-expand-button')).click()
        cy.get(testIdSelector('table-row')).first().find(testIdSelector('table-expanded-block')).should('not.exist')
      })
    })

    context('When card is clicked', () => {
      it('Then it is selected', () => {
        cy.get(testIdSelector('table-row')).first().click()
        cy.get(testIdSelector('table-row')).first().should('have.class', 's-table-card_selected')
      })
    })
  })

  context(`Given table with height`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            data: DATA,
          }
        },
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT + 1}px"
            height="100"
          >
            <STableColumn prop="${PROP_NAME_1}" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then it has height from prop', () => {
        cy.get(testIdSelector('table')).should('have.css', 'height', '100px')
      })
    })
  })

  context(`Given adapted table with height`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            data: DATA,
          }
        },
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT}px"
            height="100"
          >
            <STableColumn prop="${PROP_NAME_1}" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then it has height from prop', () => {
        cy.get(testIdSelector('table')).should('have.css', 'height', '100px')
      })
    })
  })

  context(`Given table with current row highlighting`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            data: DATA,
          }
        },
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT + 1}px"
            :data="data"
            current-row-key="${HIGHLIGHTED_KEY}"
            highlight-current-row
            row-key="${PROP_FOR_ROW_KEY}"
          >
            <STableColumn prop="${PROP_FOR_ROW_KEY}" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then row with according prop is highlighted', () => {
        cy.get(testIdSelector('table-row'))
          .filter('.s-table__tr_current')
          .should('have.length', 1)
          .should('have.text', HIGHLIGHTED_KEY)
      })
    })

    context('When other row clicked', () => {
      it('Then it selected as current row', () => {
        cy.get(testIdSelector('table-row')).eq(ROW_INDEX_TO_SELECT_AS_NEW_CURRENT).click()
        cy.get(testIdSelector('table-row'))
          .eq(ROW_INDEX_TO_SELECT_AS_NEW_CURRENT)
          .should('have.class', 's-table__tr_current')
      })
    })
  })

  context(`Given table with two datasets changing each other`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          const data = ref(DATA)
          const altData = ref(ALT_DATA)
          return {
            data,
            altData,
            switchData: () => {
              ;[data.value, altData.value] = [altData.value, data.value]
            },
          }
        },
        template: `
          <button id="change-data" @click="switchData">change data</button>
          <STable
            style="width: ${ADAPT_BREAKPOINT + 1}px"
            :data="data"
            row-key="${PROP_FOR_ROW_KEY}"
          >
            <STableColumn type="selection" reserve-selection />
            <STableColumn prop="${PROP_FOR_ROW_KEY}" />
          </STable>`,
      })
    })

    context('When rows selected and data change', () => {
      it('Then rows with same key are still selected', () => {
        cy.get(testIdSelector('table-header-selection-checkbox')).click()
        cy.get('#change-data').click()

        cy.get(testIdSelector('table-selection-checkbox'))
          .filter('[data-checked="true"]')
          .closest('tr')
          .each((el) => cy.wrap(el).should('have.text', COMMON_KEY))
        cy.get(testIdSelector('table-selection-checkbox'))
          .filter('[data-checked="false"]')
          .closest('tr')
          .each((el) => cy.wrap(el).should('not.have.text', COMMON_KEY))
      })
    })
  })

  context(`Given table with custom classes and styles on table and classes on first column`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            data: DATA,
          }
        },
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT + 1}px"
            :data="data"
            row-class-name="${ROW_CLASS_NAME}"
            :row-style='${JSON.stringify(ROW_STYLE)}'
            cell-class-name="${CELL_CLASS_NAME}"
            :cell-style='${JSON.stringify(CELL_STYLE)}'
            header-row-class-name="${HEADER_ROW_CLASS_NAME}"
            :header-row-style='${JSON.stringify(HEADER_ROW_STYLE)}'
            header-cell-class-name="${HEADER_CELL_CLASS_NAME}"
            :header-cell-style='${JSON.stringify(HEADER_CELL_STYLE)}'
          >
            <STableColumn
              prop="${PROP_NAME_1}"
              class-name="${COLUMN_CELL_CLASS_NAME}"
              label-class-name="${COLUMN_HEADER_CELL_CLASS_NAME}"
            />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then rows have class from prop', () => {
        cy.get(testIdSelector('table-row')).should('have.class', ROW_CLASS_NAME)
      })

      it('Then rows have styles from prop', () => {
        cy.get(testIdSelector('table-row')).should('have.css', 'color', ROW_STYLE.color)
      })

      it('Then cells have class from prop', () => {
        cy.get(testIdSelector('table-cell')).should('have.class', CELL_CLASS_NAME)
      })

      it('Then cells have styles from prop', () => {
        cy.get(testIdSelector('table-cell')).should('have.css', 'color', CELL_STYLE.color)
      })

      it('Then header row have class from prop', () => {
        cy.get(testIdSelector('table-header-row')).should('have.class', HEADER_ROW_CLASS_NAME)
      })

      it('Then header row have styles from prop', () => {
        cy.get(testIdSelector('table-header-row')).should('have.css', 'color', HEADER_ROW_STYLE.color)
      })

      it('Then header cells have class from prop', () => {
        cy.get(testIdSelector('table-header-cell')).should('have.class', HEADER_CELL_CLASS_NAME)
      })

      it('Then header cells have styles from prop', () => {
        cy.get(testIdSelector('table-header-cell')).should('have.css', 'color', HEADER_CELL_STYLE.color)
      })

      it('Then first column cell have classes from className prop', () => {
        cy.get(testIdSelector('table-cell')).should('have.class', COLUMN_CELL_CLASS_NAME)
      })

      it('Then first column header cell have styles from className and labelClassName prop', () => {
        cy.get(testIdSelector('table-header-cell'))
          .first()
          .should('have.class', COLUMN_HEADER_CELL_CLASS_NAME)
          .should('have.class', COLUMN_CELL_CLASS_NAME)
      })
    })
  })

  context(`Given table with no data`, () => {
    beforeEach(() => {
      cy.mount({
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT + 1}px"
            :data="[]"
            empty-text="${NO_DATA_TEXT}"
          >
            <STableColumn type="selection" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then there are text from emptyText props', () => {
        cy.get(testIdSelector('table-empty-block')).should('have.text', NO_DATA_TEXT)
      })

      it('Then there are table header disabled', () => {
        cy.get(testIdSelector('table-header-selection-checkbox')).should('not.have.css', 'cursor', 'pointer')
      })
    })
  })

  context(`Given adapted table with no data`, () => {
    beforeEach(() => {
      cy.mount({
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT}px"
            :data="[]"
            empty-text="${NO_DATA_TEXT}"
          >
            <STableColumn type="selection" />
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then there are text from emptyText props', () => {
        cy.get(testIdSelector('table-empty-block')).should('have.text', NO_DATA_TEXT)
      })
    })
  })

  context(`Given table with empty slot and no data`, () => {
    beforeEach(() => {
      cy.mount({
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT + 1}px"
            :data="[]"
          >
            <template #empty>${NO_DATA_TEXT}</template>
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then there are text from empty slot', () => {
        cy.get(testIdSelector('table-empty-block')).should('have.text', NO_DATA_TEXT)
      })
    })
  })

  context(`Given adapted table with empty slot and no data`, () => {
    beforeEach(() => {
      cy.mount({
        template: `
          <STable
            style="width: ${ADAPT_BREAKPOINT}px"
            :data="[]"
          >
            <template #empty>${NO_DATA_TEXT}</template>
          </STable>`,
      })
    })

    context('When it is initiated', () => {
      it('Then there are text from empty slot', () => {
        cy.get(testIdSelector('table-empty-block')).should('have.text', NO_DATA_TEXT)
      })
    })
  })

  context(`onClick:row`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          const eventHandlerExistence = ref(true)

          return {
            data: DATA,
            eventHandlerExistence,
          }
        },
        template: `
          <STable
              v-if="eventHandlerExistence"
              style="width: ${ADAPT_BREAKPOINT + 1}px"
              :data="data"
              @click:row="()=>{}"
          >
            <STableColumn/>
          </STable>
          <STable
              v-else
              style="width: ${ADAPT_BREAKPOINT + 1}px"
              :data="data"
          >
            <STableColumn />
          </STable>
          
        <button data-testid="toggle-handler" @click="eventHandlerExistence = false">Toggle</button>`,
      })
    })

    context('When handler is attached', () => {
      it('Then cursor should has pointer type', () => {
        cy.get(testIdSelector('table-cell')).should('have.css', 'cursor', 'pointer')
      })

      it('Otherwise default', () => {
        cy.get(testIdSelector('toggle-handler')).click()
        cy.get(testIdSelector('table-cell')).should('have.css', 'cursor', 'default')
      })
    })
  })
})
