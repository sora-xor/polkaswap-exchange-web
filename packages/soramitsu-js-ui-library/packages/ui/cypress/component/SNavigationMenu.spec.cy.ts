import { SNavigationMenu, SNavigationSubmenu, SNavigationMenuItem } from '@/lib'
import { VueTestUtils } from 'cypress/vue'

const testIdSelector = (id: string) => `[data-testid=${id}]`

before(() => {
  VueTestUtils.config.global.components = { SNavigationMenu, SNavigationSubmenu, SNavigationMenuItem }
})

after(() => {
  VueTestUtils.config.global.components = {}
})

describe('NavigationMenu', () => {
  const findMenu = () => cy.get(testIdSelector('navigation-menu'))
  const HEADER_TEXT = 'Header'
  const FOOTER_TEXT = 'Footer'
  const OPENED_MENU_WIDTH = '220px'
  const CLOSED_MENU_WIDTH = '64px'
  const INITIALLY_SELECTED_ITEM = '1'

  context(`Given default menu`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            collapsed: ref(false),
            selectedItem: ref(INITIALLY_SELECTED_ITEM),
          }
        },
        template: `
          <button id="collapse-btn" @click="collapsed = !collapsed">collapse</button>
      
          <SNavigationMenu v-model="selectedItem" :collapsed="collapsed">
          <template #header>
            <div id="header-content">${HEADER_TEXT}</div>
          </template>

            <SNavigationMenuItem v-for="i in 5" :value="String(i)" :id="'item-' + i">
              <template #icon="iconProps">
                <IconStatusInfo :class="iconProps.class" />
              </template>
              Option {{ String(i) }}
            </SNavigationMenuItem>

            <SNavigationSubmenu>
              <template #title>Submenu</template>
              <SNavigationMenuItem v-for="i in 5" :value="String(i) + 0" :id="'item-' + i + '0'">
                Option {{ String(i) + 0 }}
              </SNavigationMenuItem>
            </SNavigationSubmenu>
          
            <template #footer>
              <div id="footer-content">${FOOTER_TEXT}</div>
            </template>
          </SNavigationMenu>
        `,
      })
    })

    context('When it is initiated', () => {
      it('Then it is expanded', () => {
        findMenu().should('have.css', 'width', OPENED_MENU_WIDTH)
      })

      it('Then its submenu opens on click', () => {
        cy.get(testIdSelector('navigation-submenu-items')).should('be.hidden')
        cy.get(testIdSelector('navigation-submenu-trigger')).click()
        cy.get(testIdSelector('navigation-submenu-items')).should('be.visible')
      })

      it('Then passed into header text is present', () => {
        cy.get('#header-content').should('have.text', HEADER_TEXT)
      })

      it('Then passed into footer text is present', () => {
        cy.get('#footer-content').should('have.text', FOOTER_TEXT)
      })
    })

    context('When menu is collapsed', () => {
      beforeEach(() => {
        cy.get('#collapse-btn').click()
      })

      it("Then submenu can't be opened ", () => {
        cy.get(testIdSelector('navigation-submenu-items')).should('be.hidden')
        cy.get(testIdSelector('navigation-submenu-trigger')).click()
        cy.get(testIdSelector('navigation-submenu-items')).should('be.hidden')
      })
    })

    context('When it toggles collapse state', () => {
      it('Then it changes its width', () => {
        findMenu().should('have.css', 'width', OPENED_MENU_WIDTH)
        cy.get('#collapse-btn').click()
        findMenu().should('have.css', 'width', CLOSED_MENU_WIDTH)
        cy.get('#collapse-btn').click()
        findMenu().should('have.css', 'width', OPENED_MENU_WIDTH)
      })

      it('Then it closes submenus on menu close', () => {
        cy.get(testIdSelector('navigation-submenu-trigger')).click()
        cy.get('#collapse-btn').click()
        cy.get(testIdSelector('navigation-submenu-items')).should('be.hidden')
      })
    })
  })

  context(`Given menu with active item in submenu`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            selectedItem: ref('10'),
          }
        },
        template: `
          <SNavigationMenu v-model="selectedItem">
            <SNavigationSubmenu>
              <template #title>Submenu</template>
              <SNavigationMenuItem v-for="i in 5" :value="String(i) + 0">
                Option {{ String(i) + 0 }}
              </SNavigationMenuItem>
            </SNavigationSubmenu>
          </SNavigationMenu>
        `,
      })
    })

    context('When it is initiated', () => {
      it('Then submenu with active item is open', () => {
        cy.get(testIdSelector('navigation-submenu-items')).should('be.visible')
      })
    })
  })

  context(`Given collapsed menu with active item in submenu`, () => {
    beforeEach(() => {
      cy.mount({
        setup() {
          return {
            selectedItem: ref('10'),
            collapsed: ref(true),
          }
        },
        template: `
          <SNavigationMenu v-model="selectedItem" :collapsed="collapsed">
            <SNavigationSubmenu>
              <template #title>Submenu</template>
              <SNavigationMenuItem v-for="i in 5" :value="String(i) + 0">
                Option {{ String(i) + 0 }}
              </SNavigationMenuItem>
            </SNavigationSubmenu>
          </SNavigationMenu>
        `,
      })
    })

    context('When it is initiated', () => {
      it('Then submenu with active item is closed', () => {
        cy.get(testIdSelector('navigation-submenu-items')).should('be.hidden')
      })
    })
  })
})
