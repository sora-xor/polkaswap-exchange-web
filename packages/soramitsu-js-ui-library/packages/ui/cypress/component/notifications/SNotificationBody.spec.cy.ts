import { SNotificationBody, Status } from '@/lib'

const findCloseBtn = () => cy.get('[data-testid=close-btn]')

it('Playground', () => {
  cy.mount(
    {
      setup() {
        const { count, inc } = useCounter()

        return { count, inc }
      },
      template: `
        <button @click="inc()">Count: {{ count }}</button>
        <SNotificationBody :timeout="1000 + 50 * count">
          <template #title>
            Count: {{ count }}
          </template>
        </SNotificationBody>
      `,
    },
    {
      global: {
        stubs: {
          transition: false,
        },
      },
    },
  )
})

it('Timeout works', () => {
  cy.mount({
    components: { SNotificationBody },
    setup() {
      const show = ref(true)

      return { show }
    },
    template: `
      <SNotificationBody
        v-if="show"
        data-cy="item"
        :timeout="50"
        @timeout="show = false"
      />
    `,
  })

  cy.get('[data-cy=item]', { timeout: 0 }).should('exist')

  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(50)
  cy.get('[data-cy=item]', { timeout: 0 }).should('not.exist')
})

it('Close btn works', () => {
  cy.mount({
    components: { SNotificationBody },
    setup() {
      const show = ref(true)
      const closeBtn = ref(false)

      return { show, closeBtn }
    },
    template: `
      <input
        v-model="closeBtn"
        type="checkbox"
      >
      <SNotificationBody
        v-if="show"
        data-cy="item"
        :show-close-btn="closeBtn"
        @click:close="show = false"
      />
    `,
  })

  findCloseBtn().should('not.exist')
  cy.get('input').click()
  findCloseBtn().should('exist').click()
  cy.get('[data-cy=item]').should('not.exist')
})

it('Different types', () => {
  cy.mount({
    components: { SNotificationBody },
    setup() {
      return {
        statuses: Object.values(Status),
      }
    },
    template: `
      <div class="p-4 grid grid-cols-2 gap-4">
        <SNotificationBody
          v-for="x in statuses"
          :key="x"
          :status="x"
          show-close-btn
        >
          <template #title>
            <span class="uppercase">{{ x }}</span>
          </template>
          <template #description>
            Aut cum scuto aut in scuto
          </template>
        </SNotificationBody>
      </div>
    `,
  })

  // todo snap
})
