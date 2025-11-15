import { VueTestUtils } from 'cypress/vue'
import { SCheckboxSolo, CHECKBOX_SIZE_VALUES } from '@/components/Checkbox'

before(() => {
  VueTestUtils.config.global.components = { SCheckboxSolo }
})

after(() => {
  VueTestUtils.config.global.components = {}
})

it('Play', () => {
  cy.mount({
    setup() {
      return {
        sizes: CHECKBOX_SIZE_VALUES,
        checked: ref(true),
        disabled: ref(false),
      }
    },
    template: `
      <div>
        <div>
          <SCheckboxSolo v-model=disabled>Disable</SCheckboxSolo>
        </div>

        <div v-for="s in sizes" :key="s" class="grid grid-cols-3 place-items-start gap-4 p-4 m-4 border border-gray-100">
          <SCheckboxSolo v-model="checked" :size="s" :disabled="disabled && s === 'md'">
            Default
          </SCheckboxSolo>
          <SCheckboxSolo v-model="checked" :size="s" type="bordered" :disabled="disabled && s === 'lg'">
            Bordered
          </SCheckboxSolo>
          <SCheckboxSolo v-model="checked" :size="s" type="bordered-with-description" :disabled="disabled && s === 'xl'">
            Bordered
            <template #description>
              With description
            </template>
          </SCheckboxSolo>
        </div>
      </div>
    `,
  })

  cy.injectAxeAndConfigureCTDefaults()
  cy.checkA11y()
})

describe('SCheckboxSolo', () => {
  const findCheckbox = () => cy.get('[role=checkbox]')

  it('When it is disabled, it is not tabbable', () => {
    cy.mount(SCheckboxSolo, {
      props: { disabled: true },
      slots: { default: () => 'I should be not tabbable' },
    })

    findCheckbox().should('have.attr', 'tabindex', '-1')
  })
})
