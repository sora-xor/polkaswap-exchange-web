import { SNotificationsProvider, SUseNotification } from '@/lib'

const findCloseBtn = () => cy.get('[data-testid=close-btn]', {})

it('Notification is controlled by the boolean model', () => {
  cy.mount(
    {
      setup() {
        return {
          show: ref(false),
        }
      },
      template: `
        <SNotificationsProvider>
          <input v-model="show" type="checkbox">

          show - {{ show }}

          <SUseNotification v-model:show="show" show-close-btn>
            <template #title>
              My <code>custom</code> title
            </template>
          </SUseNotification>
        </SNotificationsProvider>
      `,
    },
    {
      global: {
        components: {
          SNotificationsProvider,
          SUseNotification,
        },
        stubs: {
          'transition-group': false,
        },
      },
    },
  )

  cy.contains('My custom title').should('not.exist')
  cy.get('input').click()
  cy.contains('My custom title').should('exist')
  findCloseBtn().click()
  cy.contains('My custom title').should('not.exist')
  cy.contains('show - false')
})
