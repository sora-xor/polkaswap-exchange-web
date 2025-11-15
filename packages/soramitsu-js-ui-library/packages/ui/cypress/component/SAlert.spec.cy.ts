import { ref } from 'vue'
import { Status } from '@/types'
import { SAlert } from '@/lib'

it('Different statuses', () => {
  cy.mount({
    components: { SAlert },
    data: () => ({ items: Object.values(Status) }),
    template: `
      <div class="p-4 grid gap-4">
        <SAlert
          v-for="x in items"
          :key="x"
          :status="x"
        >
          <template #title>My <b>awesome</b> title</template>
          <template #description>
            Scientia potentia est<br>
            <a href="/">href</a>
          </template>
        </SAlert>
      </div>
    `,
  })
})

describe('Close button', () => {
  function scene() {
    cy.mount({
      components: { SAlert },
      setup() {
        const showCloseBtn = ref(false)
        const clicked = ref(false)

        return { showCloseBtn, clicked }
      },
      template: `
        <p>Clicked - {{ clicked }}</p>
        <p><input v-model="showCloseBtn" type="checkbox"></p>
        <SAlert
          v-bind="{ showCloseBtn }"
          @click:close="clicked = true"
          title="Alarm"
        />
      `,
    })
  }

  const findCloseBtn = () => cy.get('[data-testid=close-btn]')

  it('Close btn visibility is controlled by prop', () => {
    scene()

    findCloseBtn().should('not.exist')
    cy.get('input').click()
    findCloseBtn().should('exist')
  })

  it('Click emits `click:close`', () => {
    scene()

    cy.get('input').click()
    findCloseBtn().click()
    cy.contains('Clicked - true')
  })
})
