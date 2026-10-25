import { SNotificationsProvider, SUseNotification } from '@/lib'

it('Placements are reactive', () => {
  const findDisplayRoot = () => cy.get('[data-cy=notification]').closest('[data-testid=root]')

  cy.mount(
    {
      setup() {
        const placements = reactive({
          vertical: 'top',
          horizontal: 'right',
        })

        function change() {
          placements.vertical = 'bottom'
          placements.horizontal = 'center'
        }

        return {
          placements,
          change,
        }
      },
      template: `
        <SNotificationsProvider v-bind="placements">
          <button @click="change">Update placements</button>

          <SUseNotification show>
            <template #title>
              <code data-cy="notification">Notifying you</code>
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
      },
    },
  )

  findDisplayRoot().should('have.attr', 'data-placement-v', 'top').and('have.attr', 'data-placement-h', 'right')
  cy.contains('Update placements').click()
  findDisplayRoot().should('have.attr', 'data-placement-v', 'bottom').and('have.attr', 'data-placement-h', 'center')
})
