import { VueTestUtils } from 'cypress/vue'
import type { Ref } from 'vue'
import { bareMetalVModel } from '@/util'
import type { BodyScrollLockApi } from '@/lib'
import { SModal, SModalCard, useModalApi, SBodyScrollLockProvider } from '@/lib'
import { objectPick } from '@vueuse/core'
import type { Options as FocusTrapOptions } from 'focus-trap'
import { enableBodyScroll, disableBodyScroll } from 'body-scroll-lock'

const showVModel = (val: Ref<boolean>) => bareMetalVModel(val, 'show')
const findRoot = () => cy.get('[data-testid=root]')
const findModal = () => findRoot().find('[data-testid=modal]')
const findOverlay = () => findRoot().find('[data-testid=overlay]')

before(() => {
  VueTestUtils.config.global.stubs = { transition: false }
  VueTestUtils.config.global.components = { SModal, SModalCard }
})

after(() => {
  VueTestUtils.config.global.stubs = {}
  VueTestUtils.config.global.components = {}
})

it('Mounts', () => {
  cy.mount({
    setup() {
      const [show, toggleShow] = useToggle(false)

      return {
        show,
        toggleShow,
      }
    },
    template: `
      <button @click="toggleShow()">show toggle</button>
      <SModal v-model:show="show">
        <SModalCard>
          <template #title>Title slot</template>

          Default slot
        </SModalCard>
      </SModal>
    `,
  })
})

describe('Focus trap', () => {
  function mountFactory(params?: {
    focusTrap?: boolean | FocusTrapOptions
    eager?: boolean
    mountWithoutTabbable?: boolean
    closeOnEsc?: boolean
  }) {
    cy.mount({
      components: { SModal },
      setup() {
        const props = objectPick(params || {}, ['focusTrap', 'eager', 'closeOnEsc'])

        const mountTabbables = !params?.mountWithoutTabbable

        return { show: ref(false), mountTabbables, props }
      },
      template: `
        <button @click="show = true">open modal</button>
        <SModal v-model:show="show" v-bind="props">
          <template v-if="mountTabbables">
            <input data-cy="check">
            <button @click="show = false">close modal</button>
          </template>
        </SModal>
      `,
    })
  }

  function assertFirstTabbableFocus(shouldBeFocused: boolean) {
    cy.get('input[data-cy=check]').should(shouldBeFocused ? 'be.focused' : 'not.be.focused')
  }

  it('Works by default', () => {
    mountFactory()

    cy.get('button').click()

    assertFirstTabbableFocus(true)
  })

  it("Doesn't work if `false` is passed", () => {
    mountFactory({ focusTrap: false })

    cy.get('button').click()

    assertFirstTabbableFocus(false)
  })

  it('Works with eager modal', () => {
    mountFactory({ eager: true })

    // when focus trap is enabled, everything outside of it is not clickable
    // so click should just work
    cy.contains('open modal').click()

    assertFirstTabbableFocus(true)
    cy.contains('close modal').click()
    cy.contains('open modal').should('be.focused')
  })

  it("{esc} doesn't disable focus trap if `close-on-esc=false`", () => {
    mountFactory({ closeOnEsc: false })

    cy.contains('open modal').click()
    assertFirstTabbableFocus(true)
    cy.get('body').type('{esc}')
    assertFirstTabbableFocus(true)
  })

  it('{esc} handling focus-trap option works', () => {
    const spy = Cypress.sinon.spy()

    mountFactory({
      focusTrap: {
        escapeDeactivates: spy,
      },
    })

    cy.contains('open modal')
      .click()
      .get('body')
      .type('{esc}')
      .then(() => {
        cy.wrap(spy).should('be.calledOnce')
      })
  })
})

describe('Some tests with simple modal with focus trap', () => {
  /**
   * Mounts:
   * - without a focus trap
   * - without a modal transition
   */
  function mountFactory(params?: {
    closeOnOverlayClick?: boolean
    closeOnEsc?: boolean
    showOverlay?: boolean
    absolute?: boolean
  }) {
    return cy.mount({
      components: { SModal },
      setup() {
        const show = ref(false)

        return { show, params }
      },
      template: `
        <button @click="show = true">
          Open
        </button>

        <SModal
          v-model:show="show"
          v-bind="params"
          :modal-transition="null"
        >
          <div>
            Dip

            <button @click="show = false">
              Close
            </button>
          </div>
        </SModal>
      `,
    })
  }

  it('Modal closes by click on overlay', () => {
    mountFactory()

    cy.get('button').click()
    cy.contains('Dip')
    findOverlay().click('top', { force: true })
    cy.contains('Dip').should('not.exist')
  })

  it("Modal doesn't close by click on overlay with the false prop", () => {
    mountFactory({ closeOnOverlayClick: false })

    cy.get('button').click()
    cy.contains('Dip')
    findOverlay().click('top', { force: true })

    // it may be still mounted
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(50)
    cy.contains('Dip').should('exist')
  })

  it('Modal closes by esc key down', () => {
    mountFactory()

    cy.get('button').click()
    cy.contains('Dip')

    cy.get('body').type('{esc}')
    cy.contains('Dip').should('not.exist')
  })

  it("Modal doesn't close by esc if it is disabled by prop", () => {
    mountFactory({ closeOnEsc: false })

    cy.get('button').click()
    cy.contains('Dip')

    cy.get('body').type('{esc}')
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(50)
    cy.contains('Dip').should('exist')
  })

  it('No overlay if prop is set', () => {
    mountFactory({ showOverlay: false })

    cy.get('button').click()
    findOverlay().should('not.exist')
  })

  it('Modal root is `fixed` by default', () => {
    mountFactory()

    cy.get('button').click()
    findRoot().should('have.css', 'position', 'fixed')
  })

  it('Modal root is `absolute` if related prop is set to true', () => {
    mountFactory({ absolute: true })

    cy.get('button').click()
    findRoot().should('have.css', 'position', 'absolute')
  })
})

describe('Teleportation', () => {
  it('Teleports to body by default', () => {
    cy.mount(() =>
      h(
        SModal,
        {
          show: true,
          focusTrap: false,
        },
        { default: () => h('span', { 'data-cy': 'content' }) },
      ),
    )

    cy.get('body span[data-cy=content]').should('exist')
  })

  it('Teleports to custom target', () => {
    cy.mount(() => [
      h('div', { id: 'anchor' }),
      h(
        SModal,
        {
          teleportTo: '#anchor',
          show: true,
          focusTrap: false,
        },
        { default: () => h('span', { 'data-cy': 'content' }) },
      ),
    ])

    cy.get('#anchor [data-cy=content]').should('exist')
  })

  it('No teleportation at all if target is null', () => {
    cy.mount(() => [
      h('div', { 'data-cy': 'anchor' }, [
        h(
          SModal as any,
          {
            teleportTo: null,
            show: true,
            focusTrap: false,
          },
          { default: () => h('span', { 'data-cy': 'content' }) },
        ),
      ]),
    ])

    cy.get('[data-cy=anchor] [data-cy=content]').should('exist')
  })
})

describe('Classes & styles applying', () => {
  type GenStyle<T extends string> = { [K in `${T}Style`]: object }
  type GenClass<T extends string> = { [K in `${T}Class`]: object | string | string[] }
  type GenStyleClass<T extends string> = GenStyle<T> & GenClass<T>

  type Params = Partial<GenStyleClass<'root' | 'modal' | 'overlay'>>

  function mountFactory(params?: Params) {
    cy.mount(() =>
      h(
        SModal,
        {
          ...params,
          show: true,
          focusTrap: false,
        },
        {
          default: () => 'Hey!',
        },
      ),
    )
  }

  type Case = [label: string, params: Params, assertionCb: () => void]

  function defineCases(cases: Case[]): Case[] {
    return cases
  }

  const CASES = defineCases([
    ['Root class', { rootClass: ['a', 'b', { c: true }] }, () => findRoot().should('have.class', 'a b c')],
    ['Root style', { rootStyle: { zIndex: 55123 } }, () => findRoot().should('have.css', 'zIndex', '55123')],
    ['Modal class', { modalClass: ['re ri rae'] }, () => findModal().should('have.class', 're ri rae')],
    ['Modal style', { modalStyle: { zIndex: 55123 } }, () => findModal().should('have.css', 'zIndex', '55123')],
    [
      'Overlay class',
      { overlayClass: [{ a: false }, 're ri rae'] },
      () => findOverlay().should('have.class', 're ri rae'),
    ],
    ['Overlay style', { overlayStyle: { zIndex: 55123 } }, () => findOverlay().should('have.css', 'zIndex', '55123')],
  ])

  for (const [label, params, assertion] of CASES) {
    it(label, () => {
      mountFactory(params)
      assertion()
    })
  }
})

describe('Modal API', () => {
  it('Modal closes via API call', () => {
    const ModalContent = defineComponent({
      setup() {
        const api = useModalApi()

        return () =>
          h(
            'button',
            {
              onClick: () => api.close(),
            },
            'Close modal from inner slot',
          )
      },
    })

    const ModalMounter = defineComponent({
      setup() {
        const show = ref(false)

        return () => [
          `State: ${show.value ? 'opened' : 'closed'}`,
          h(
            'button',
            {
              onClick: () => {
                show.value = true
              },
            },
            'Open modal',
          ),
          h(
            SModal,
            {
              ...showVModel(show),
              focusTrap: false,
            },
            {
              default: () => h(ModalContent),
            },
          ),
        ]
      },
    })

    cy.mount(ModalMounter)

    cy.contains('Open modal').click()
    cy.contains('Close modal from inner slot').click()
    cy.contains('State: closed')
  })
})

describe('Scroll Lock', () => {
  function mountFactory(params?: { lockScroll?: boolean }) {
    return cy.mount({
      setup() {
        const show = ref(false)

        const bodyScrollLockApi: BodyScrollLockApi = {
          lock: (el) => {
            disableBodyScroll(el)
          },
          unlock: (el) => {
            enableBodyScroll(el)
          },
        }

        return () => [
          h(
            'button',
            {
              onClick: () => {
                show.value = true
              },
            },
            'toggle',
          ),
          h(
            'div',
            {
              style: {
                height: '9999px',
              },
            },
            'A very huge element',
          ),
          h(
            SBodyScrollLockProvider,
            { api: bodyScrollLockApi },
            {
              default: () =>
                h(
                  SModal as any,
                  {
                    ...showVModel(show),
                    ...params,
                    focusTrap: false,
                    modalTransition: null,
                  },
                  {
                    default: () => h('span', {}, 'Dip'),
                  },
                ),
            },
          ),
        ]
      },
    })
  }

  it('Locks scroll by default', () => {
    mountFactory()

    cy.get('body').should('have.css', 'overflowY', 'visible')
    cy.get('button').click()
    cy.get('body').should('have.css', 'overflowY', 'hidden')
  })

  it('No lock if related prop is false', () => {
    mountFactory({ lockScroll: false })

    cy.get('body').should('have.css', 'overflowY', 'visible')
    cy.get('button').click()
    cy.get('body').should('have.css', 'overflowY', 'visible')
  })
})

describe('Emitting of click:overlay', () => {
  function mountFactory(params?: { closeOnOverlayClick?: boolean }) {
    return cy.mount({
      setup() {
        const emitted = ref(false)
        return () => [
          `Emitted: ${emitted.value}`,
          h(
            SModal,
            {
              ...params,
              show: true,
              focusTrap: false,
              'onClick:overlay': () => {
                emitted.value = true
              },
            },
            {
              default: () => '...',
            },
          ),
        ]
      },
    })
  }

  it('Emitted by default', () => {
    mountFactory()

    findOverlay().click('top', { force: true })
    cy.contains('Emitted: true')
  })

  it('Emitted even with closeOnOverlayClick=false', () => {
    mountFactory({ closeOnOverlayClick: false })

    findOverlay().click('top', { force: true })
    cy.contains('Emitted: true')
  })
})

it('Open-closed events', () => {
  const EMITTED: string[] = []

  function eventsPush(name: string) {
    EMITTED.push(name)
  }

  function eventsClear() {
    EMITTED.splice(0, 99)
  }

  cy.mount({
    setup() {
      const show = ref(false)

      return () => [
        h(
          'button',
          {
            onClick: () => {
              show.value = true
            },
          },
          'Open',
        ),
        h(
          SModal,
          {
            ...showVModel(show),
            focusTrap: false,
            onBeforeOpen: () => eventsPush('before-open'),
            onAfterOpen: () => eventsPush('after-open'),
            onBeforeClose: () => eventsPush('before-close'),
            onAfterClose: () => eventsPush('after-close'),
          },
          {
            default: () =>
              h(
                'button',
                {
                  onClick: () => {
                    show.value = false
                  },
                },
                'Close',
              ),
          },
        ),
      ]
    },
  }).then(() => {
    cy.wrap(EMITTED).should('be.empty')
  })

  cy.contains('Open')
    .click()
    .then(() => {
      cy.wrap(EMITTED).should('deep.equal', ['before-open', 'after-open'])
    })
    .then(eventsClear)

  cy.contains('Close')
    .click()
    .then(() => {
      cy.wrap(EMITTED).should('deep.equal', ['before-close', 'after-close'])
    })
})

describe('Eagering', () => {
  function mountFactory(params?: { eager?: boolean }) {
    cy.mount({
      components: { SModal },
      setup() {
        const show = ref(false)

        const bindings = {
          teleportTo: null,
          focusTrap: false,
          overlayTransition: null,
          modalTransition: null,
          ...params,
        }

        return { show, bindings }
      },
      template: `
        Show: {{ show }}

        <button @click="show = true">Open</button>

        <div id="anchor">
          <SModal
            v-model:show="show"
            v-bind="bindings"
          >
            <button @click="show = false">Close</button>
          </SModal>
        </div>
      `,
    })
  }

  const findAnchorRoot = () => cy.get('#anchor [data-testid=root]')
  const findAnchorModal = () => findAnchorRoot().find('[data-testid=modal]')
  const findAnchorOverlay = () => findAnchorRoot().find('[data-testid=overlay]')

  const fragmentsGetters = [() => findAnchorRoot(), () => findAnchorModal(), () => findAnchorOverlay()]

  it('Non-eager rendering (default behavior)', () => {
    mountFactory()

    // nothing rendered
    cy.get('#anchor').children().should('have.length', 0)

    cy.contains('Open').click()

    // everything should exist
    for (const getter of fragmentsGetters) {
      getter().should('exist')
    }

    cy.contains('Close').click()

    // everything should not exist
    findAnchorRoot().should('not.exist')
  })

  it('Eager rendering', () => {
    mountFactory({ eager: true })

    findAnchorRoot().should('exist').and('not.be.visible')
    findAnchorModal().should('exist')

    cy.contains('Open').click()

    findAnchorModal().should('be.visible')

    cy.contains('Close').click()

    cy.contains('Show: false')
    findAnchorRoot().should('exist').and('not.be.visible')
    findAnchorModal().should('exist').and('not.be.visible')
  })
})

describe('SModalCard', () => {
  const findCloseBtn = () => cy.get('[data-testid=btn-close]')

  it('When "close" SModalCard button is clicked, then modal is closed', () => {
    cy.mount({
      setup() {
        return {
          show: ref(true),
        }
      },
      template: `
        Show: {{ show }}

        <SModal v-model:show="show">
          <SModalCard data-testid="card">
            Some placeholder
          </SModalCard>
        </SModal>
      `,
    })

    cy.contains('Show: true')
    cy.get('[data-testid=card]').within(() => {
      findCloseBtn().click()
    })
    cy.contains('Show: false')
  })

  it('When "close" prop is false, then close button does not exist', () => {
    cy.mount({
      template: `
        <SModal show :focus-trap="false">
          <SModalCard :close="false" data-testid="card">
            Some placeholder
          </SModalCard>
        </SModal>
      `,
    })

    cy.get('[data-testid=card]').within(() => {
      findCloseBtn().should('not.exist')
    })
  })
})

describe('A11y', () => {
  it('When `labelledBy` of SModal is used, then a11y is ok', () => {
    cy.mount({
      template: `
        <SModal show v-slot="{ labelledBy }">
          <h2 :id="labelledBy">
            This modal is labelled by this heading
          </h2>

          <button> Close </button>
        </SModal>
      `,
    })

    cy.injectAxeAndConfigureCTDefaults()
    cy.checkA11y()
  })

  it('When `labelled-by` prop is set, then its value is used for label', () => {
    const CUSTOM_LABEL_ID = 'custom-id'

    cy.mount({
      template: `
        <SModal show labelled-by="${CUSTOM_LABEL_ID}" v-slot="{ labelledBy }">
          <h2 :id="labelledBy">Label</h2>
          <button>close</button>
        </SModal>
      `,
    })

    cy.get('h2').should('have.attr', 'id', CUSTOM_LABEL_ID)

    cy.injectAxeAndConfigureCTDefaults()
    cy.checkA11y()
  })

  it('When two different modals are rendered, they have different generated labels', () => {
    cy.mount({
      setup() {
        return {
          show: ref(true),
        }
      },
      template: `
        <input type="checkbox" v-model="show">

        <SModal v-if="show" show v-slot="{ labelledBy }">
          <h2 :id="labelledBy">Label</h2>
          <button @click="show = false">Close</button>
        </SModal>
      `,
    })

    let firstLabelId: string

    cy.get('h2').then((el) => {
      firstLabelId = el.attr('id') as string
    })

    cy.contains('Close').click()
    cy.get('input').click()

    cy.get('h2').should((el) => {
      expect(el.attr('id')).not.to.eq(firstLabelId)
    })
  })

  it('When SModalCard is used, then label id is automatically set and its title is a <h2>', () => {
    cy.mount({
      template: `
        <SModal show>
          <SModalCard>
            <template #title>
              Soramitsu
            </template>
          </SModalCard>
        </SModal>
      `,
    })

    cy.injectAxeAndConfigureCTDefaults()
    cy.checkA11y()

    cy.get('h2').contains('Soramitsu')
  })

  it('When `described-by` is set on SModal, its aria attr is set', () => {
    cy.mount({
      template: `
        <SModal show described-by="desc1">
          <SModalCard>
            <template #title> Title </template>

            <div id="desc1">
              Description
            </div>
          </SModalCard>
        </SModal>
      `,
    })

    // btw `aria-describedby` is not checked by axe-core.
    // Maybe it should be configured more strict for it?
    // FIXME
    cy.injectAxeAndConfigureCTDefaults()
    cy.checkA11y()

    findModal().should('have.attr', 'aria-describedby', 'desc1')
  })
})
