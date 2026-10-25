/* eslint-disable no-new-func */
import { defineComponent, onMounted, ref } from 'vue'
import * as Vue from 'vue'
import { compile } from '@vue/compiler-dom'
import { useNotifications, SNotificationsProvider } from '@/lib'

type ExtraComponents = Record<string, ReturnType<typeof defineComponent>>

function compileIfNeeded(component: any) {
  if (
    component &&
    typeof component === 'object' &&
    'template' in component &&
    typeof component.template === 'string' &&
    !component.render
  ) {
    const { template, ...rest } = component
    const { code } = compile(template, { mode: 'function' })
    const renderFn = new Function('Vue', `${code}; return render`)(Vue)

    return defineComponent({
      ...rest,
      render() {
        return renderFn.call(this, this, [])
      },
    })
  }

  return component
}

function mountWithProvider(component: any, extraComponents: ExtraComponents = {}) {
  const compiledComponent = compileIfNeeded(component)
  const compiledExtras = Object.fromEntries(
    Object.entries(extraComponents).map(([key, value]) => [key, compileIfNeeded(value)]),
  )

  cy.mount(compiledComponent, {
    global: {
      components: {
        SNotificationsProvider,
        ...compiledExtras,
      },
      stubs: {
        'transition-group': false,
      },
    },
  })
}

describe('useNotifications()', () => {
  it('Composable works, notification is shown', () => {
    const Trigger = defineComponent({
      setup() {
        const { show } = useNotifications()

        function fire() {
          show({
            title: 'Hey!',
            description: 'Per aspera ad astra',
          })
        }

        return { fire }
      },
      template: `
        <button data-cy="fire" @click="fire">Open notification</button>
      `,
    })

    mountWithProvider(
      {
        template: `
          <SNotificationsProvider placement="bottom-right">
            <Trigger />
          </SNotificationsProvider>
        `,
      },
      { Trigger },
    )

    cy.contains('Per aspera ad astra').should('not.exist')
    cy.get('[data-cy=fire]').click()
    cy.contains('Per aspera ad astra').should('exist')
  })

  it('Appeared notification closes on timeout', () => {
    const Trigger = defineComponent({
      setup() {
        const { show } = useNotifications()

        function fire() {
          show({
            title: 'Auto-dismiss',
            timeout: 200,
          })
        }

        return { fire }
      },
      template: `
        <button data-cy="fire" @click="fire">Open notification</button>
      `,
    })

    mountWithProvider(
      {
        template: `
          <SNotificationsProvider>
            <Trigger />
          </SNotificationsProvider>
        `,
      },
      { Trigger },
    )

    cy.get('[data-cy=fire]').click()
    cy.contains('Auto-dismiss').should('exist')
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300)
    cy.contains('Auto-dismiss').should('not.exist')
  })

  it('Appeared notification closes on click on close button', () => {
    const Trigger = defineComponent({
      setup() {
        const { show } = useNotifications()

        function fire() {
          show({
            title: 'Closable notification',
            timeout: 0,
            showCloseBtn: true,
          })
        }

        return { fire }
      },
      template: `
        <button data-cy="fire" @click="fire">Open notification</button>
      `,
    })

    mountWithProvider(
      {
        template: `
          <SNotificationsProvider>
            <Trigger />
          </SNotificationsProvider>
        `,
      },
      { Trigger },
    )

    cy.get('[data-cy=fire]').click()
    cy.contains('Closable notification').should('exist')
    cy.get('[data-testid=close-btn]').last().click()
    cy.contains('Closable notification').should('not.exist')
  })

  it('Appeared notification closes by `close()` callback returned from `show()` trigger', () => {
    const Trigger = defineComponent({
      setup() {
        const { show } = useNotifications()
        let handle: { close: () => void } | null = null

        function open() {
          handle = show({
            title: 'Manual dismissal',
            timeout: 0,
          })
        }

        function close() {
          handle?.close()
        }

        return { open, close }
      },
      template: `
        <div class="space-x-2">
          <button data-cy="open" @click="open">Open notification</button>
          <button data-cy="close" @click="close">Close notification</button>
        </div>
      `,
    })

    mountWithProvider(
      {
        template: `
          <SNotificationsProvider>
            <Trigger />
          </SNotificationsProvider>
        `,
      },
      { Trigger },
    )

    cy.get('[data-cy=open]').click()
    cy.contains('Manual dismissal').should('exist')
    cy.get('[data-cy=close]').click()
    cy.contains('Manual dismissal').should('not.exist')
  })

  it('Notification is still rendered even if its initiator component is unmounted', () => {
    const Notifier = defineComponent({
      setup() {
        const { show } = useNotifications()

        onMounted(() => {
          show({
            title: 'Persistent notification',
            timeout: 0,
          })
        })

        return () => null
      },
    })

    const Root = defineComponent({
      setup() {
        const visible = ref(true)

        function toggle() {
          visible.value = !visible.value
        }

        return { visible, toggle }
      },
      template: `
        <SNotificationsProvider>
          <button data-cy="toggle" @click="toggle">Toggle notifier</button>
          <Notifier v-if="visible" />
        </SNotificationsProvider>
      `,
    })

    mountWithProvider(Root, { Notifier })

    cy.contains('Persistent notification').should('exist')
    cy.get('[data-cy=toggle]').click()
    cy.contains('Persistent notification').should('exist')
  })
})

/* eslint-enable no-new-func */
