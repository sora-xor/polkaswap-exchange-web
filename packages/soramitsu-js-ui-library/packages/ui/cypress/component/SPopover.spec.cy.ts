import { SPopover, SPopoverWrappedTransition } from '@/components/Popover'
import { usePopoverApi } from '@/components/Popover/api'

import type { Instance, Options } from '@popperjs/core'
import { VueTestUtils } from 'cypress/vue'

before(() => {
  VueTestUtils.config.global.components = { SPopover, SPopoverWrappedTransition }
  VueTestUtils.config.global.stubs = { transition: false }
})

after(() => {
  VueTestUtils.config.global.components = {}
  VueTestUtils.config.global.stubs = {}
})

describe('Trigger mechanisms', () => {
  function mountFactory(params?: { trigger?: 'hover' | 'click' | 'manual'; showDelay?: number; hideDelay?: number }) {
    cy.mount({
      components: {
        // for checking of the state after internal nextTick
        CounterBtn: {
          setup() {
            const { count, inc } = useCounter()

            return { count, inc }
          },
          template: `<button @click="inc()">Count: {{ count }}</button>`,
        },
      },
      setup() {
        const show = ref(false)

        return { params, show }
      },
      template: `
        <div>State: {{ show }}</div>
        <button>Outside btn</button>
        <input v-model="show" type="checkbox">

        <SPopover v-model:show="show" v-bind="params">
          <template #trigger>
            <button>trigger</button>
          </template>

          <template #popper="{ show }">
            <span v-if="show" data-cy="popper">
              <CounterBtn />
            </span>
          </template>
        </SPopover>
      `,
    })
  }

  const findTrigger = () => cy.contains('trigger')
  const findPopper = (params?: { immediate?: boolean }) => {
    if (params?.immediate) {
      return cy.get('[data-cy=popper]', { timeout: 0 })
    }

    return cy.get('[data-cy=popper]')
  }
  const findPopperCounter = () => findPopper().contains('Count: ')
  const findOutsideBtn = () => cy.contains('Outside btn')
  const findManualCheckbox = () => cy.get('input[type=checkbox]')
  const assertShowState = (state: boolean) => cy.contains(`State: ${state}`)

  it('hover (default)', () => {
    mountFactory()

    findPopper().should('not.exist')
    findTrigger().trigger('mouseenter')
    findPopper().should('exist').trigger('mouseenter')
    findTrigger().trigger('mouseleave')

    // to ensure existence of the popper
    findPopperCounter().click().contains('Count: 1')

    findPopper().trigger('mouseleave').should('not.exist')
  })

  it('click', () => {
    mountFactory({ trigger: 'click' })

    findPopper().should('not.exist')
    findTrigger().click()
    findPopper().should('exist')
    findTrigger().click()
    findPopper().should('not.exist')
  })

  it('click - outside handle', () => {
    mountFactory({ trigger: 'click' })

    findTrigger().click()
    findPopper().should('exist')
    findOutsideBtn().click()
    findPopper().should('not.exist')
  })

  it('click on trigger does not close popper', () => {
    mountFactory({ trigger: 'click' })

    findTrigger().click()
    findPopperCounter().click().contains('Count: 1').click().contains('Count: 2')
  })

  it('manual', () => {
    mountFactory({ trigger: 'manual' })

    findPopper().should('not.exist')

    findManualCheckbox().click()
    findPopper().should('exist')

    // click outside does nothing
    findOutsideBtn().click()
    findPopperCounter().click().contains('Count: 1')

    // click on trigger does nothing
    findTrigger().click()
    findPopperCounter().click().contains('Count: 2')

    // and only checkbox closes popper
    findManualCheckbox().click()
    findPopper().should('not.exist')
  })

  it('show delay (test on click)', () => {
    mountFactory({ trigger: 'click', showDelay: 150 })

    findTrigger().click()
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(50)
    findPopper({ immediate: true }).should('not.exist')
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(100)
    findPopper().should('exist')
  })

  it('Show delay (test on click) - now shown after double-click', () => {
    mountFactory({ trigger: 'click', showDelay: 150 })

    findTrigger().click()
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(50)
    findTrigger().click()
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(100)
    findPopper({ immediate: true }).should('not.exist')
  })

  it('close delay (test on click)', () => {
    mountFactory({ trigger: 'click', hideDelay: 150 })

    findTrigger().click()
    findPopper().should('exist')
    findTrigger().click()
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(50)
    findPopper({ immediate: true }).should('exist')
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(100)
    findPopper().should('not.exist')
  })

  it('@update:show always works, e.g. in hover mode', () => {
    mountFactory()

    assertShowState(false)
    findTrigger().trigger('mouseenter')
    assertShowState(true)
    findTrigger().trigger('mouseleave')
    assertShowState(false)
  })
})

describe('Elements binding', () => {
  it('ok if trigger is a single-element component', () => {
    cy.mount({
      components: {
        Trigger: {
          template: `<button>btn</button>`,
        },
      },
      template: `
        <SPopover trigger="click">
          <template #trigger><Trigger/></template>
          <template #popper="{ show }"><span v-if="show">pop</span></template>
        </SPopover>
      `,
    })

    cy.contains('btn').click()
    cy.contains('pop').should('exist')
  })

  it('ok if popper is toggled with v-if inside of transition', () => {
    cy.mount({
      template: `
        <SPopover>
          <template #trigger><button>btn</button></template>
          <template #popper="{ show }">
            <Transition>
              <span v-if="show">pop</span>
            </Transition>
          </template>
        </SPopover>
      `,
    })

    cy.contains('btn').click()
    cy.contains('pop').should('exist')
  })
})

describe('Popper API', () => {
  it('Popper instance is available inside of "popper" slot', () => {
    cy.mount({
      setup() {
        const checkInstance = (x: unknown): x is Instance => !!x && !!(x as Instance).state && !!(x as Instance).update

        return { checkInstance }
      },
      template: `
        <SPopover trigger="click">
          <template #trigger>
            <button>trigger</button>
          </template>
  
          <template #popper="{ show, popper }">
            <span v-if="show">
              Instance: {{ checkInstance(popper) }}
            </span>
          </template>
        </SPopover>
      `,
    })

    cy.get('button').click()
    cy.contains('Instance: true')
  })

  it('Popper API is provided to children slots', () => {
    cy.mount({
      components: {
        Check: {
          setup() {
            usePopoverApi()
            return () => null
          },
        },
      },
      template: `
        <SPopover>
          <template #trigger><Check/></template>
          <template #popper><Check/></template>
        </SPopover>
      `,
    })
  })
})

describe('SPopoverWrappedTransition', () => {
  describe('Eagering', () => {
    function mountFactory(params?: { eager?: boolean }) {
      cy.mount({
        setup() {
          return {
            eager: params?.eager ?? false,
          }
        },
        template: `
          <SPopover
            trigger="click"
          >
            <template #trigger>
              <button>trigger</button>
            </template>
  
            <template #popper>
              <SPopoverWrappedTransition
                :eager="eager"
              >
                <span>popper</span>
              </SPopoverWrappedTransition>
            </template>
          </SPopover>
        `,
      })
    }

    const findTrigger = () => cy.contains('trigger')
    const findPopper = () => cy.contains('popper')

    it('Non-eager mode', () => {
      mountFactory()

      findPopper().should('not.exist')
      findTrigger().click()
      findPopper().should('exist')
      findTrigger().click()
      findPopper().should('not.exist')
    })

    it('Eager mode', () => {
      mountFactory({ eager: true })

      findPopper().and('not.be.visible')
      findTrigger().click()
      findPopper().should('be.visible')
      findTrigger().click()
      findPopper().should('not.be.visible')
    })

    it('Popper is created in non-eager mode', () => {
      cy.mount({
        template: `
          <SPopover
            trigger="click"
          >
            <template #trigger>
              <button>trigger</button>
            </template>

            <template #popper="{ popper }">
              <SPopoverWrappedTransition>
                <span>Popper: {{ !!popper }}</span>
              </SPopoverWrappedTransition>
            </template>
          </SPopover>
        `,
      })

      cy.contains('trigger').click()
      cy.contains('Popper: true')
    })
  })

  it('Passing props & events to transition component itself', () => {
    cy.mount({
      setup() {
        const afterEnterCount = ref(0)

        return {
          afterEnterCount,
          onAfterEnter: () => {
            afterEnterCount.value += 1
          },
        }
      },
      template: `
        <div style="padding: 150px">
          <SPopover trigger="click">
            <template #trigger>
              <button data-cy="trigger">trigger</button>
            </template>

            <template #popper>
              <SPopoverWrappedTransition
                name="wrapped-popover-transition"
                @after-enter="onAfterEnter"
              >
                <span data-cy="content">content</span>
              </SPopoverWrappedTransition>
            </template>
          </SPopover>

          <output data-cy="after-enter-count">{{ afterEnterCount }}</output>
        </div>
      `,
    })

    cy.get('[data-cy=trigger]').click()

    cy.get('[data-cy=content]').should('have.class', 'wrapped-popover-transition-enter-active')
    cy.get('[data-cy=after-enter-count]').should('have.text', '1')
  })

  it('Binding class, style & attrs to the wrapper element', () => {
    cy.mount({
      template: `
        <div style="padding: 150px">
          <SPopover trigger="click">
            <template #trigger>
              <button data-cy="trigger">trigger</button>
            </template>

            <template #popper>
              <SPopoverWrappedTransition
                :wrapper-attrs="{
                  'data-cy': 'wrapper',
                  class: 'popover-wrapper-extra',
                  style: { padding: '12px' },
                  'data-extra': 'value',
                }"
              >
                <span>content</span>
              </SPopoverWrappedTransition>
            </template>
          </SPopover>
        </div>
      `,
    })

    cy.get('[data-cy=trigger]').click()

    cy.get('[data-cy=wrapper]')
      .should('have.class', 'popover-wrapper-extra')
      .and('have.attr', 'data-extra', 'value')
      .and('have.css', 'padding-top', '12px')
  })

  it('Binding class, style & attrs to the content element', () => {
    cy.mount({
      template: `
        <div style="padding: 150px">
          <SPopover trigger="click">
            <template #trigger>
              <button data-cy="trigger">trigger</button>
            </template>

            <template #popper>
              <SPopoverWrappedTransition
                :inner-wrapper-attrs="{
                  'data-cy': 'content-wrapper',
                  class: 'popover-content-extra',
                  style: { color: 'rgb(255, 0, 0)' },
                  'data-extra': 'inner',
                }"
              >
                <span>content</span>
              </SPopoverWrappedTransition>
            </template>
          </SPopover>
        </div>
      `,
    })

    cy.get('[data-cy=trigger]').click()

    cy.get('[data-cy=content-wrapper]')
      .should('have.class', 'popover-content-extra')
      .and('have.attr', 'data-extra', 'inner')
      .and('have.css', 'color', 'rgb(255, 0, 0)')
  })
})

describe('Popper options reactivity', () => {
  it('snap: placement change', () => {
    cy.mount({
      setup() {
        const placement = ref<'top' | 'bottom'>('top')

        return {
          placement,
          setBottom: () => {
            placement.value = 'bottom'
          },
        }
      },
      template: `
        <div style="padding: 200px">
          <button data-cy="set-bottom" @click="setBottom">set bottom</button>

          <SPopover
            trigger="click"
            :placement="placement"
          >
            <template #trigger>
              <button data-cy="trigger">trigger</button>
            </template>

            <template #popper="{ popper }">
              <SPopoverWrappedTransition eager>
                <div data-cy="popper">
                  <div data-cy="placement">{{ popper?.state.placement }}</div>
                </div>
              </SPopoverWrappedTransition>
            </template>
          </SPopover>
        </div>
      `,
    })

    cy.get('[data-cy=trigger]').click()

    cy.get('[data-cy=placement]').should('contain', 'top')

    cy.get('[data-cy=set-bottom]').click()

    cy.get('[data-cy=placement]').should('contain', 'bottom')
  })

  it('snap: distance & skidding changes', () => {
    cy.mount({
      components: {
        OffsetWatcher: {
          name: 'OffsetWatcher',
          setup() {
            const api = usePopoverApi()
            const offsetSnapshot = ref('')

            const extractOffset = (options: Partial<Options> | undefined) => {
              const modifiers = options?.modifiers ?? []
              const offsetModifier = modifiers.find((modifier: any) => modifier?.name === 'offset')
              if (!offsetModifier) return null

              let rawOffset = offsetModifier.options?.offset
              if (!rawOffset) return null

              if (Array.isArray(rawOffset)) return rawOffset
              if (typeof rawOffset === 'object' && 'value' in rawOffset) return rawOffset.value

              return null
            }

            const updateFromInstance = (instance: Instance) => {
              const current = instance.state.modifiersData.offset?.[instance.state.placement]
              if (current) {
                offsetSnapshot.value = current.map((part) => Math.round(part)).join(',')
                return
              }

              const fallback = extractOffset(instance.state.options)
              if (fallback) {
                offsetSnapshot.value = fallback.map((part) => Number(part)).join(',')
              }
            }

            watch(
              () => api.popper as Instance | null,
              (instance) => {
                if (!instance) return

                updateFromInstance(instance)

                if (!(instance as any).__offsetWatcherPatched) {
                  const original = instance.setOptions.bind(instance)

                  instance.setOptions = (options) => {
                    const extracted = extractOffset(options)
                    if (extracted) {
                      offsetSnapshot.value = extracted.map((part) => Number(part)).join(',')
                    }

                    return original(options)
                  }
                  ;(instance as any).__offsetWatcherPatched = true
                }
              },
              { immediate: true },
            )

            return { offsetSnapshot }
          },
          template: `<div data-cy="offset">{{ offsetSnapshot }}</div>`,
        },
      },
      setup() {
        const skidding = ref(0)
        const distance = ref(0)

        return {
          skidding,
          distance,
          setOffset: () => {
            skidding.value = 10
            distance.value = 20
          },
        }
      },
      template: `
        <div style="padding: 200px">
          <button data-cy="set-offset" @click="setOffset">set offset</button>

          <SPopover
            trigger="click"
            placement="bottom"
            :skidding="skidding"
            :distance="distance"
          >
            <template #trigger>
              <button data-cy="trigger">trigger</button>
            </template>

            <template #popper>
              <SPopoverWrappedTransition eager>
                <div data-cy="popper">
                  <OffsetWatcher />
                </div>
              </SPopoverWrappedTransition>
            </template>
          </SPopover>
        </div>
      `,
    })

    cy.get('[data-cy=trigger]').click()

    cy.get('[data-cy=offset]')
      .invoke('text')
      .should('match', /0[, ]0/)

    cy.get('[data-cy=set-offset]').click()

    cy.get('[data-cy=offset]').should('contain', '10,20')
  })
})
