import { VueTestUtils } from 'cypress/vue'
import type { TabsPanelApi } from '@/lib'
import { STabsPanel, STab, useTabsPanelApi } from '@/lib'

before(() => {
  VueTestUtils.config.global.components = { STabsPanel, STab }
})

after(() => {
  VueTestUtils.config.global.components = {}
})

describe('STabsPanel', () => {
  const getEl = (id: string) => cy.get(`[data-cy=${id}]`)

  it('The first and the last tabs in Panel have border-radius', () => {
    cy.mount({
      template: `
      <STabsPanel>
        <STab :name="'left'" data-cy="left">left</STab>
        <STab :name="'center'" data-cy="center">center</STab>
        <STab :name="'right'" data-cy="right">right</STab>
      </STabsPanel>
      `,
    })
    const borderRadius = '8px'
    getEl('left').should('have.css', 'border-radius', `${borderRadius} 0px 0px ${borderRadius}`)
    getEl('center').should('have.css', 'border-radius', '0px')
    getEl('right').should('have.css', 'border-radius', `0px ${borderRadius} ${borderRadius} 0px`)
  })

  it('Disabled prop works correctly', () => {
    cy.mount({
      template: `
        <STabsPanel>
          <STab :disabled="true" data-cy="disabled">disabled</STab>
          <STab data-cy="notDisabled">notDisabled</STab>
        </STabsPanel>
      `,
    })
    getEl('disabled').should('be.disabled')
    getEl('notDisabled').should('not.be.disabled')
  })

  it('When background prop on STabsPanel is set to primary, then STab background is set accordingly', () => {
    cy.mount({
      template: `
        <STabsPanel :background="'primary'" data-cy="primary">
          <STab data-cy="tabName" name="primary-tab">TabTitle</STab>
        </STabsPanel>
      `,
    })
    getEl('tabName').should('have.class', 's-tab_background_primary')
  })

  it('When background prop on STabsPanel is set to secondary, then STab background is set accordingly', () => {
    cy.mount({
      template: `
        <STabsPanel :background="'secondary'" data-cy="secondary">
          <STab data-cy="tabName" name="secondary-tab">TabTitle</STab>
        </STabsPanel>
      `,
    })
    getEl('tabName').should('have.class', 's-tab_background_secondary')
  })

  it('When background prop on STabsPanel is set to none, then STab background is set accordingly', () => {
    cy.mount({
      template: `
        <STabsPanel :background="'none'" data-cy="none">
          <STab data-cy="tabName" name="none-tab">TabTitle</STab>
        </STabsPanel>
      `,
    })
    getEl('tabName').should('have.class', 's-tab_background_none')
  })

  it('Click on tab makes this tab active', () => {
    cy.mount({
      template: `
      <div data-cy="currentValue">{{currentTab}}</div>
            <STabsPanel v-model="currentTab">
              <STab :name="'first'">First</STab>
              <STab :name="'second'" data-cy="second">Second</STab>
              <STab :name="'third'">Third</STab>
              <STab :name="'disabled'" data-cy="disabled" :disabled="true">Disabled</STab>
            </STabsPanel>`,
      setup() {
        let currentTab = ref('first')
        return {
          currentTab,
        }
      },
    })
    getEl('currentValue').contains('first')
    getEl('second')
      .should('not.have.class', 's-tab_active')
      .click()
      .then(() => {
        getEl('second').should('have.class', 's-tab_active')
        getEl('currentValue').contains('second')
      })
  })

  it('If active tab goes disabled, modelValue become empty string', () => {
    cy.mount({
      template: `
      <div data-cy="currentValue">{{currentTab}}</div>
            <STabsPanel v-model="currentTab">
              <STab :name="'first'" :disabled="disabled">First</STab>
              <STab :name="'second'" data-cy="second">Disabled</STab>
            </STabsPanel>`,
      setup() {
        let currentTab = ref('first')
        let disabled = ref(false)
        onMounted(() => {
          disabled.value = true
        })
        return {
          currentTab,
          disabled,
        }
      },
    })

    getEl('currentValue').should('be.empty')
  })

  it('Using custom component with TabsPanelApi', () => {
    const CustomTab = defineComponent({
      props: {
        tabId: {
          type: String,
          default: '',
          required: true,
        },
      },

      setup(props) {
        const { tabId } = toRefs(props)

        const state: TabsPanelApi = useTabsPanelApi()
        const { selectTab } = state
        const activateTab = () => {
          selectTab(tabId.value)
        }

        return { activateTab }
      },
      template: `<button @click="activateTab">button</button>`,
    })

    cy.mount({
      components: { CustomTab },
      template: `
            <div data-cy="currentValue">{{currentTab}}</div>
            <STabsPanel v-model="currentTab" data-cy="panel">
              <custom-tab :tabId="'first'"/>
              <custom-tab :tabId="'second'" data-cy="second"/>
            </STabsPanel>`,
      setup() {
        let currentTab = ref('first')
        return {
          currentTab,
        }
      },
    })

    getEl('currentValue').contains('first')
    getEl('second')
      .click()
      .then(() => {
        getEl('currentValue').contains('second')
      })
  })
})
