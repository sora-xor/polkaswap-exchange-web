import { config } from '@vue/test-utils'
import { SDatePicker } from '@/lib'

before(() => {
  config.global.components = { SDatePicker }
})

after(() => {
  config.global.components = {}
})

describe('SDatePicker', () => {
  const testIdSelector = (id: string) => `[data-testid=${id}]`
  const getEl = (id: string) => cy.get(`[data-cy=${id}]`)
  const picker = () => cy.get(`[data-testid=date-picker]`)
  const OPTIONS_PANEL_ITEM = '.s-date-picker-options-panel__item'
  const CUSTOM_PANEL_INPUT = '.s-date-picker-custom-panel__input'
  const TIME_PANEL = '.s-date-picker-time-panel'
  const CALENDARS_PANEL = '.s-date-picker-calendars-panel'
  const OPTIONS_PANEL = '.s-date-picker-options-panel'
  const PANELS = '.s-date-picker__panels'
  const MONTH_PANEL = '.s-date-picker-month-panel'
  const MONTH_TABLE_YEAR_RANGE_PANEL = '.s-date-picker-month-table__year-range-panel'
  const MONTH_TABLE_MONTH_TABLE = '.s-date-picker-month-table__month-table'
  const YEAR_TABLE_YEAR_TABLE = '.s-date-picker-year-table__year-table'

  it('Time prop works correctly', () => {
    cy.mount({
      components: { SDatePicker },
      template: `
        <SDatePicker v-model="date" :type="'day'" :time="true" data-cy="picker"/>
        <p data-cy="result">{{date}}</p>
      `,
      setup() {
        const date = ref(new Date())
        return {
          date,
        }
      },
    })

    picker().children(TIME_PANEL).should('exist')
  })

  it('Displayed two calendars in range mode', () => {
    cy.mount({
      components: { SDatePicker },
      template: `
        <SDatePicker v-model="date" :type="'range'"/>
        <p data-cy="result">{{date}}</p>
      `,
      setup() {
        const date = ref(new Date())
        return {
          date,
        }
      },
    })
    picker().children(CALENDARS_PANEL).children().should(`have.length`, 2)
  })

  it('Displayed one calendar in day mode', () => {
    cy.mount({
      components: { SDatePicker },
      template: `
        <SDatePicker v-model="date" :type="'day'"/>
        <p data-cy="result">{{date}}</p>
      `,
      setup() {
        const date = ref(new Date())
        return {
          date,
        }
      },
    })
    picker().children(CALENDARS_PANEL).children().should(`have.length`, 1)
  })

  it('No options panel in Pick mode', () => {
    cy.mount({
      components: { SDatePicker },
      template: `
        <SDatePicker v-model="date" :type="'pick'"/>
        <p data-cy="result">{{date}}</p>
      `,
      setup() {
        const date = ref([])
        return {
          date,
        }
      },
    })
    picker().children(OPTIONS_PANEL).should('not.exist')
  })

  describe('Panels tests', () => {
    const clickDoneButton = () => cy.get(testIdSelector('date-picker-done-button')).click()
    it('Input panel works correctly', () => {
      cy.mount({
        components: { SDatePicker },
        template: `
          <SDatePicker v-model="date" :type="'day'" data-cy="picker"/>          
          <p data-cy="result">
            <span data-cy="date">{{date.getDate()}}</span>
            <span data-cy="month">{{date.getMonth()}}</span>
            <span data-cy="year">{{date.getFullYear()}}</span>
          </p>
        `,
        setup() {
          const date = ref(new Date())
          return {
            date,
          }
        },
      })
      getEl('picker').children().first().click()
      picker().get(OPTIONS_PANEL_ITEM).last().click()
      picker().get(CUSTOM_PANEL_INPUT).focus().clear().type('01012000').blur()
      cy.get(testIdSelector('date-picker-done-button')).click({ force: true })
      getEl('date').should('contain.text', '1')
      getEl('month').should('contain.text', '0') // months number is 0-11
      getEl('year').should('contain.text', '2000')
    })

    it('Month panel works as expected', () => {
      cy.mount({
        components: { SDatePicker },
        template: `
      <SDatePicker v-model="date" :type="'day'" data-cy="picker"/>
      <p data-cy="result">{{date}}</p>
    `,
        setup() {
          const date = ref(new Date('01.01.2000'))
          return {
            date,
          }
        },
      })

      getEl('picker').children().first().click()
      cy.get(MONTH_PANEL + ' .header__label')
        .first()
        .click()
      cy.get(MONTH_TABLE_YEAR_RANGE_PANEL + ' > button')
        .first()
        .click()
      cy.get(MONTH_TABLE_MONTH_TABLE + ' > div:contains("May")').click()
      picker()
        .get(MONTH_PANEL + ' .header__label')
        .should('contain', '1999')
      picker()
        .get(MONTH_PANEL + ' .header__label')
        .should('contain', 'May')
    })

    it('Year panel works correctly', () => {
      cy.mount({
        components: { SDatePicker },
        template: `
      <SDatePicker v-model="date" :type="'day'" data-cy="picker"/>
      <p data-cy="result">{{date}}</p>
    `,
        setup() {
          const date = ref(new Date('01.01.2000'))
          return {
            date,
          }
        },
      })

      getEl('picker').children().first().click()
      picker()
        .get(MONTH_PANEL + ' .header__label')
        .last()
        .click()
      cy.get(YEAR_TABLE_YEAR_TABLE + ' > .available:contains("2004")').click()
      picker()
        .get(MONTH_PANEL + ' .header__label')
        .should('contain', '2004')
    })

    it('Time panel works correctly', () => {
      cy.mount({
        components: { SDatePicker },
        template: `
      <SDatePicker v-model="date" :type="'day'" data-cy="picker" :time="true"/>
      <p data-cy="result">{{date}}</p>
    `,
        setup() {
          const date = ref(new Date('01.01.2000'))
          return {
            date,
          }
        },
      })

      getEl('picker').children().first().click()
      cy.get(TIME_PANEL + ' p:contains("02:00")').click()
      clickDoneButton()
      getEl('result').should('contain', '02:00')
    })
  })

  it('Disabled prop dont trigger popup', () => {
    cy.mount({
      components: { SDatePicker },
      template: `
    <SDatePicker v-model="date" :type="'day'" data-cy="picker" :time="true" :disabled="true"/>
    <p data-cy="result">{{date}}</p>
  `,
      setup() {
        const date = ref(new Date('01.01.2000'))
        return {
          date,
        }
      },
    })

    getEl('picker').children().first().click()
    cy.get(PANELS).should('be.hidden')
  })
})
