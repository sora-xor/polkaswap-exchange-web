import type { ToastsApi } from '@/lib'
import { SToastsProvider, SToastsDisplay, TOASTS_API_KEY } from '@/lib'

import { VueTestUtils } from 'cypress/vue'
import { forceInject } from '@/util'

const findRoot = () => cy.get('[data-testid=root]')
const findList = () => cy.get('[data-testid=list]')

const UseToggle = {
  setup() {
    const flag = ref(false)
    return { flag }
  },
  template: `
    <input v-model="flag" type="checkbox">
    <slot v-bind="{ value: flag }" />
  `,
}

const Toast = defineComponent({
  props: {
    via: {
      type: [String, Symbol],
      default: TOASTS_API_KEY,
    },
  },
  setup(props, { slots }) {
    const api = forceInject<ToastsApi>(props.via)

    onScopeDispose(
      api.register({
        slot: () => slots.default?.(),
      }),
    )

    return () => null
  },
})

before(() => {
  VueTestUtils.config.global.components = {
    SToastsProvider,
    SToastsDisplay,
    Toast,
    UseToggle,
  }
  VueTestUtils.config.global.stubs = { 'transition-group': false }
})

after(() => {
  VueTestUtils.config.global.components = {}
  VueTestUtils.config.global.stubs = {}
})

it('Playground', () => {
  cy.mount(
    {
      setup() {
        let count = 0
        const toasts: number[] = reactive([])
        const vert = ref('bottom')
        const vertItems = ['bottom', 'top']
        const hor = ref('left')
        const horItems = ['left', 'center', 'right']

        function push() {
          toasts.push(count++)
        }

        function close(i: number) {
          toasts.splice(toasts.indexOf(i), 1)
        }

        return {
          toasts,
          push,
          close,
          vert,
          vertItems,
          hor,
          horItems,
        }
      },
      template: `
        <SToastsProvider>
          <SToastsDisplay :vertical="vert" :horizontal="hor" />

          <template v-for="i in toasts" :key="i">
            <Toast>
              <div class="p-2 bg-blue-300 shadow-lg rounded">
                Toast {{ i }}

                <button @click="close(i)">Close</button>
              </div>
            </Toast>
          </template>

          <div class="absolute inset-0 flex items-center justify-center">
            <div>
              <RadioList v-model="vert" :options="vertItems" />
              <RadioList v-model="hor" :options="horItems" />
              <button @click="push">Push</button>
            </div>
          </div>
        </SToastsProvider>
      `,
    },
    {
      global: {
        components: {
          RadioList: {
            props: ['modelValue', 'options'],
            emits: ['update:modelValue'],
            setup(props, { emit }) {
              const proxy = useVModel(props, 'modelValue', emit)
              return { proxy }
            },
            template: `
              <div class="space-x-4">
                <span v-for="item in options" :key="item">
                  <input v-model="proxy" :value="item" type="radio"> {{ item }}
                </span>
              </div>
            `,
          },
        },
      },
    },
  )
})

it('Minimal working repr', () => {
  cy.mount({
    template: `
      <SToastsProvider>
        <SToastsDisplay />

        <UseToggle v-slot="{ value }">
          <Toast v-if="value">
            Here I am
          </Toast>
        </UseToggle>
      </SToastsProvider>
    `,
  })

  cy.contains('Here I am').should('not.exist')

  cy.get('input[type=checkbox]').click()
  cy.contains('Here I am')

  cy.get('input[type=checkbox]').click()
  cy.contains('Here I am').should('not.exist')
})

it('Different nested providers with different displays', () => {
  cy.mount({
    template: `
      <SToastsProvider api-key="notify">
        <SToastsDisplay />

        <SToastsProvider api-key="message">
          <SToastsDisplay />

          <Toast via="notify">Notification</Toast>
          <Toast via="message">Message</Toast>
        </SToastsProvider>
      </SToastsProvider>
    `,
  })

  findRoot()
    .should('have.length', 2)
    .first()
    .within(() => {
      cy.contains('Notification')
    })
    .next()
    .contains('Message')
})

it('Multiple providers with multiple displays in the deep', () => {
  cy.mount({
    template: `
      <SToastsProvider api-key="A">
        <SToastsProvider api-key="B">
          <SToastsDisplay api-key="A" />
          <SToastsDisplay api-key="B" />

          <Toast via="A">ToastA</Toast>
          <Toast via="B">ToastB</Toast>
        </SToastsProvider>
      </SToastsProvider>
    `,
  })

  findRoot()
    .should('have.length', 2)
    .first()
    .within(() => {
      cy.contains('ToastA')
    })
    .next()
    .contains('ToastB')
})

it('Composed provider', () => {
  cy.mount({
    template: `
      <SToastsProvider :api-key="['A', 'B']">
        <SToastsDisplay />

        <Toast via="A">ToastA</Toast>
        <Toast via="B">ToastB</Toast>
      </SToastsProvider>
    `,
  })

  findList()
    .children()
    .should('have.length', 2)
    .first()
    .within(() => {
      cy.contains('ToastA')
    })
    .next()
    .contains('ToastB')
})

it("Reactivity in Toast's slot is not broken", () => {
  cy.mount({
    setup() {
      const { count, inc } = useCounter()

      return { count, inc }
    },
    template: `
      <SToastsProvider>
        <SToastsDisplay />

        <button @click="inc()">inc</button>

        <Toast>
          Count: {{ count }}
        </Toast>
      </SToastsProvider>
    `,
  })

  cy.contains('Count: 0')
  cy.contains('inc').click().click().click()
  cy.contains('Count: 3')
})

it('Component in slot keeps its state', () => {
  const Counter = defineComponent({
    setup() {
      const { count, inc } = useCounter()

      return { count, inc }
    },
    template: `<button @click="inc()">Count: {{ count }}</button>`,
  })

  cy.mount({
    components: { SToastsProvider, SToastsDisplay, Toast, Counter },
    template: `
      <SToastsProvider>
        <SToastsDisplay placement="top-right" />

        <Counter data-cy="outer" />

        <Toast>
          <Counter data-cy="inner" />
        </Toast>
      </SToastsProvider>
    `,
  })

  cy.get('[data-cy=inner]')
    .contains('Count: 0')
    .click()
    .click()
    .contains('Count: 2')
    .get('[data-cy=outer]')
    .click()
    .contains('Count: 1')
    .get('[data-cy=inner]')
    .contains('Count: 2')
})

it('Rendered toast is clickable, but its container is not', () => {
  cy.mount({
    template: `
      <SToastsProvider>
        <SToastsDisplay />

        <Toast>
          <button>click me</button>
        </Toast>
      </SToastsProvider>
    `,
  })

  cy.contains('click me').click().parent().should('have.css', 'pointer-events', 'none')
  findRoot().should('have.css', 'pointer-events', 'none')
})
