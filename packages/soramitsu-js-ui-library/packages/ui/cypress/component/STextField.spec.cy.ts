import { Status } from '@/types'

import { VueTestUtils } from 'cypress/vue'
import { STextField } from '@/lib'

const findInput = () => cy.get('input')
const findLabel = () => cy.get('label')
const findCounter = () => cy.get('[data-testid=counter]')
const findMsg = () => cy.get('[data-testid=message]')
const findEye = () => cy.get('[data-testid=eye]')
const findAppend = () => cy.get('[data-testid=append]')

before(() => {
  VueTestUtils.config.global.components = { STextField }
})

after(() => {
  VueTestUtils.config.global.components = {}
})

it('Playground', () => {
  cy.mount({
    setup() {
      const model = ref('Lorem ipsum')
      const statuses = [null, Status.Warning, Status.Error, Status.Success]

      return {
        model,
        statuses,
      }
    },
    template: `
      <div class="p-4 grid gap-4 grid-cols-2">
        <STextField
          v-for="(x, i) in statuses"
          :key="i"
          v-model="model"
          :status="x"
        >
          <template #label>
            Status: {{ x || 'default' }}
          </template>
        </STextField>
      </div>
    `,
  })

  // TODO make snapshot?
})

it('Events are emitted from input', () => {
  cy.mount({
    setup() {
      const focused = ref(false)

      return { focused }
    },
    template: `
      Focused: {{ focused }}

      <STextField
        @blur="focused = false"
        @focus="focused = true"
      />
    `,
  })

  findInput().focus()
  cy.contains('Focused: true')
  findInput().blur()
  cy.contains('Focused: false')
})

describe('Modeling extensions', () => {
  it('Input does not change its value when prop is not updated', () => {
    cy.mount({
      template: `<STextField />`,
    })

    findInput().type('henno').should('have.value', '')
  })

  it('Input changes its value when prop is not updated BUT strict sync is disabled', () => {
    cy.mount({
      template: `<STextField no-model-value-strict-sync />`,
    })

    findInput().type('henno').should('have.value', 'henno')
  })

  it('Input value does not change if upstream modelValue has not been changed', () => {
    cy.mount({
      setup() {
        const nums = ref('')

        function updateNums(val: string) {
          if (/^\d+$/.test(val)) {
            nums.value = val
          }
        }

        return { nums, updateNums }
      },
      template: `
        <STextField
          :model-value="nums"
          @update:model-value="updateNums"
        />

        <span id="assert">{{ nums }}</span>
      `,
    })

    findInput().type('123fff').should('have.value', '123')
    cy.get('#assert').should('have.text', '123')
  })
})

describe('Counter', () => {
  it('Displays counter with a limit', () => {
    cy.mount({
      template: `<STextField counter="5" model-value="Google" />`,
    })

    findCounter().should('have.text', '6/5')
  })

  it('Displays counter without a limit', () => {
    cy.mount({
      template: `<STextField counter model-value="Google" />`,
    })

    findCounter().should('have.text', '6')
  })
})

describe('Label', () => {
  it('Works via prop', () => {
    cy.mount({
      template: `<STextField label="Hey" />`,
    })

    findLabel().should('have.text', 'Hey')
  })

  it('Works via slot', () => {
    cy.mount({
      template: `
        <STextField>
          <template #label>Umm?</template>
        </STextField>
      `,
    })

    findLabel().should('have.text', 'Umm?')
  })
})

describe('Status message', () => {
  it('Not shown by default', () => {
    cy.mount({
      template: `<STextField />`,
    })

    findMsg().should('not.exist')
  })

  it('Shown if prop is set', () => {
    cy.mount({
      template: `<STextField message="foo" />`,
    })

    findMsg().contains('foo')
  })

  it('Shown if slot is defined', () => {
    cy.mount({
      template: `
        <STextField>
          <template #message>bar</template>
        </STextField>
      `,
    })

    findMsg().contains('bar')
  })

  it('Conditional slot works', () => {
    cy.mount({
      setup() {
        return {
          showSlot: ref(false),
        }
      },
      template: `
        <input type="checkbox" v-model="showSlot">

        <STextField>
          <template #message v-if="showSlot">
            Conditional message
          </template>
        </STextField>
      `,
    })

    findMsg().should('not.exist')
    cy.get('input[type=checkbox]').click()
    findMsg().should('exist')
    cy.get('input[type=checkbox]').click()
    findMsg().should('not.exist')
  })
})

describe('Append slot', () => {
  it('No append if no slot', () => {
    cy.mount(() => h(STextField))

    findAppend().should('not.exist')
  })

  it('Rendered with eye', () => {
    cy.mount(() =>
      h(
        STextField,
        { password: true },
        {
          append: () => 'Anchor',
        },
      ),
    )

    findAppend().within(() => {
      findEye()
      cy.contains('Anchor')
    })
  })

  it('Rendered with counter', () => {
    cy.mount(() =>
      h(
        STextField,
        { counter: 20 },
        {
          append: () => 'Hey',
        },
      ),
    )

    findAppend().within(() => {
      findCounter()
      cy.contains('Hey')
    })
  })

  it('Conditional slot works', () => {
    cy.mount({
      setup() {
        return {
          showSlot: ref(false),
        }
      },
      template: `
        <input type="checkbox" v-model="showSlot">
    
        <STextField>
          <template #append v-if="showSlot">
            He
          </template>
        </STextField>
      `,
    })

    findAppend().should('not.exist')
    cy.get('input[type=checkbox]').click()
    findAppend().should('exist')
    cy.get('input[type=checkbox]').click()
    findAppend().should('not.exist')
  })
})

describe('Password input', () => {
  it("Eye is shown and toggles input's type", () => {
    cy.mount({
      template: `<STextField password />`,
    })

    const inputTypeShouldBe = (type: string) => findInput().should('have.attr', 'type', type)

    inputTypeShouldBe('password')
    findEye().should('exist').click()
    inputTypeShouldBe('text')
    findEye().click()
    inputTypeShouldBe('password')
  })

  it('Eye is not shown if `no-eye` prop is set', () => {
    cy.mount({
      template: `<STextField password no-eye />`,
    })

    findEye().should('not.exist')
  })
})

it('disabled=true => input itself is disabled too', () => {
  cy.mount({ template: `<STextField disabled />` })

  findInput().should('be.disabled')
})

it('`id` - it is set correctly', () => {
  cy.mount({
    template: `<STextField id="email" />`,
  })

  findInput().should('have.id', 'email')
  findLabel().should('have.attr', 'for', 'email')
})

it('Autofocus works', () => {
  cy.mount({ template: `<STextField autofocus />` })
  findInput().should('have.attr', 'autofocus')
})

describe('Passing extra attributes', () => {
  it('they are passed to <input>', () => {
    cy.mount({ template: `<STextField extra-attr />` })

    findInput().should('have.attr', 'extra-attr')
  })

  it('they are reactive', () => {
    cy.mount({
      setup() {
        const { count, inc } = useCounter()
        return { count, inc }
      },
      template: `
        <button @click="inc()">inc</button>

        <STextField :data-count="count" />
      `,
    })

    findInput().should('have.attr', 'data-count', 0)
    cy.get('button').contains('inc').click()
    findInput().should('have.attr', 'data-count', 1)
  })
})

it('Validations list works', () => {
  cy.mount({
    setup() {
      const model = ref('')

      // since we don't change model value by using type() method we have to edit it manually
      // because message slot relies on model.value correctness otherwise it's always empty
      setTimeout(() => {
        // matches some rules
        model.value = 'a1'
      }, 1000)

      setTimeout(() => {
        // matches every rule
        model.value = 'a1!'
      }, 2000)

      function validations(value: string) {
        return [
          {
            rule: /[a-z]/.test(value),
            message: 'At least 1 lowercase letter',
          },
          {
            rule: /\d/.test(value),
            message: 'At least 1 digit',
          },
          {
            rule: /[!"#$%&'()*+,./:;<=>?@[\]^_`{|}~\\-]/.test(value),
            message: 'At least 1 special character',
          },
        ]
      }

      const validationsList = computed(() => {
        return {
          title: 'String must contain:',
          validations: validations(model.value).map((v) => ({ isMatching: v.rule, ...v })),
          showOnFocusOnly: true,
        }
      })

      return {
        validationsList,
        model,
      }
    },
    template: `<STextField :model-value="model" :validations-list="validationsList" no-model-value-strict-sync/>`,
  })

  findMsg().should('not.exist')
  findInput().focus()
  findMsg().should('exist')
  // first timeout
  findInput().should('have.value', 'a1')
  findInput().blur()
  findMsg().should('not.exist')
  findInput().focus()
  findMsg().should('exist')
  // second timeout
  findInput().should('have.value', 'a1!')
  findMsg().should('not.exist')
})
