import { VueTestUtils } from 'cypress/vue'
import { SRadio, SRadioGroup, RADIO_SIZE_VALUES, useRadioGroupApi } from '@/components/Radio'

before(() => {
  VueTestUtils.config.global.components = { SRadio, SRadioGroup }
})

after(() => {
  VueTestUtils.config.global.components = {}
})

const testidSelector = (id: string) => `[data-testid=${id}]`
const radioButtonSelector = `[role=radio]${testidSelector('radio-button')}`

const findRadioButtonContains = (text: string) => cy.contains(text).closest(radioButtonSelector)

const expectRadioToBeTabbable = (innerText: string) =>
  findRadioButtonContains(innerText).should('have.attr', 'tabindex', 0)

const expectRadioToBeNotTabbable = (innerText: string) =>
  findRadioButtonContains(innerText).should('have.attr', 'tabindex', -1)

it('Play', () => {
  cy.mount({
    setup() {
      return {
        SIZES: RADIO_SIZE_VALUES,
        disabled: ref(false),
      }
    },
    template: `
      <input type="checkbox" v-model="disabled" id="disabled">
      <label for="disabled">Disabled</label>

      <SRadioGroup>
        <div v-for="s in SIZES" :key="s" class="grid grid-cols-3 place-items-start border border-blue-300 m-4 gap-4 p-4">
          <SRadio v-bind="{ disabled, value: s, size: s }">
            Size {{ s }}
          </SRadio>

          <SRadio v-bind="{ disabled, value: s + '-bordered', size: s }" type="bordered">
            Bordered
          </SRadio>

          <SRadio v-bind="{ disabled, value: s + '-desc', size: s }" type="bordered-with-description">
            Bordered

            <template #description>
              With description
            </template>
          </SRadio>
        </div>
      </SRadioGroup>
    `,
  })
})

describe('Initial tabindex', () => {
  it("When RadioGroup doesn't have an initial value, then a11y is ok and the first radio is tabbable", () => {
    cy.mount({
      template: `
        <SRadioGroup>
          <SRadio value="1">First</SRadio>
          <SRadio value="2">Second</SRadio>
        </SRadioGroup>
      `,
    })

    cy.injectAxeAndConfigureCTDefaults()
    cy.checkA11y()

    expectRadioToBeTabbable('First')
    expectRadioToBeNotTabbable('Second')
  })

  it(`When RadioGroup doesn't have an initial value and first radio button is dynamic, tabbable state is always up to date`, () => {
    // Helpers

    const inc = () => cy.contains('inc').click()

    // Mounting

    cy.mount({
      setup() {
        const { count, inc } = useCounter()

        return { count, inc }
      },
      template: `
        <button @click="inc()">inc</button>

        <SRadioGroup>
          <SRadio
            v-for="i in 5"
            :key="count + i"
            :value="count + i"
          >
            Radio {{ count + i }}
          </SRadio>
        </SRadioGroup>
      `,
    })

    // Acting

    inc()

    expectRadioToBeTabbable('Radio 2')
    expectRadioToBeNotTabbable('Radio 3')

    inc()

    expectRadioToBeTabbable('Radio 3')
    expectRadioToBeNotTabbable('Radio 4')
  })

  it('When there is no selected value initially, but then it appears, then related radio button is tabbable', () => {
    cy.mount({
      setup() {
        const val = ref<string | null>(null)

        function set() {
          val.value = 'foo'
        }

        return {
          val,
          set,
        }
      },
      template: `
        <button @click="set">Set</button>

        <SRadioGroup v-model="val">
          <SRadio value="bar">Bar</SRadio>
          <SRadio value="foo">Foo</SRadio>
        </SRadioGroup>
      `,
    })

    expectRadioToBeTabbable('Bar')
    expectRadioToBeNotTabbable('Foo')

    cy.contains('Set').click()

    expectRadioToBeNotTabbable('Bar')
    expectRadioToBeTabbable('Foo')
  })

  // it(
  //   "When some radio was selected, but then value changed so radio group doesn't have a selected radio anymore, then zero tabindex is saved for the last tabbable radio",
  // )
})

describe('Keyboard, Focusing, Disabling', () => {
  beforeEach(() => {
    cy.mount({
      setup() {
        const valueRef = ref<null | string>(null)
        const disableDeep = ref(false)
        const disableAll = ref(false)

        const root = templateRef<HTMLElement>('root')

        const keys = useMagicKeys({ target: root })
        function useWhenPressed(what: string, cb: () => void) {
          whenever(keys[what], cb, { flush: 'sync' })
        }

        useWhenPressed('Shift+R', () => {
          valueRef.value = 'regular'
        })

        useWhenPressed('Shift+D', () => {
          disableDeep.value = true
        })

        useWhenPressed('Shift+A', () => {
          disableAll.value = true
        })

        return {
          value: valueRef,
          disableDeep,
          disableAll,
        }
      },
      template: `
        <div class="p-4" ref="root">
          <p data-cy="model">
            {{ value || 'none' }}
          </p>

          <div>
            <input id="disable-all" type="checkbox" v-model="disableAll">
            <label for="disable-all">
              Disable all
            </label>
          </div>

          <div>
            <input id="disable-deep" type="checkbox" v-model="disableDeep">
            <label for="disable-deep">
              Disable deep dish
            </label>
          </div>

          <button>Pre</button>

          <SRadioGroup v-model="value">
            <SRadio value="regular" :disabled="disableAll">
              Regular crust
            </SRadio>

            <SRadio value="deep" :disabled="disableDeep || disableAll">
              Deep dish
            </SRadio>

            <SRadio value="thin" :disabled="disableAll">
              Thin crust
            </SRadio>
          </SRadioGroup>


          <button>Post</button>
        </div>
      `,
    })
  })

  const modelShouldBe = (value: string) => cy.dataCy('model').contains(value)

  const findDeepDisabledCheckbox = () => cy.get('input#disable-deep')
  const findAllDisabledCheckbox = () => cy.get('input#disable-all')

  it('When something is focused by click, a11y is ok', () => {
    findRadioButtonContains('Deep dish').click()

    cy.injectAxeAndConfigureCTDefaults()
    cy.checkA11y()
  })

  it('When focus enters radio group, firstly it focuses on the first button, but value is not automatically selected', () => {
    modelShouldBe('none')

    cy.contains('Pre').focus().tab().contains('Regular crust')

    modelShouldBe('none')
  })

  it('When a radio group is "tabbed through", value is not selected', () => {
    cy.contains('Pre').focus().tab().tab().contains('Post')

    modelShouldBe('none')
  })

  it(`When an empty radio group is "tabbed" and {space} is pressed, then value is selected`, () => {
    cy.contains('Pre').focus().tab().type(' ')

    modelShouldBe('regular')
  })

  it('When arrow keys are pressed when radio group is focused, value is changed appropriate', () => {
    cy.contains('Regular crust')
      .click()
      // going next with Down
      .type('{downarrow}')

    cy.focused().contains('Deep dish')
    modelShouldBe('deep')

    // going back with Up
    cy.focused().type('{uparrow}')

    cy.focused().contains('Regular crust')
    modelShouldBe('regular')

    // going "back" with Left (should jump to the last, cycle)
    cy.focused().type('{leftarrow}')

    cy.focused().contains('Thin crust')
    modelShouldBe('thin')

    // and again "next" to the first with Right
    cy.focused().type('{rightarrow}')

    cy.focused().contains('Regular crust')
    modelShouldBe('regular')
  })

  it("When some radio is focused & selected, but value is changed to another radio, then focus isn't changed to it, as well as tabindex, and value can be re-selected by {space}", () => {
    findRadioButtonContains('Thin crust').click()
    modelShouldBe('thin')

    cy.focused().type('{shift+r}')
    modelShouldBe('regular')
    cy.focused().contains('Thin crust')
    expectRadioToBeTabbable('Thin crust')
    expectRadioToBeNotTabbable('Regular crust')

    cy.focused().type(' ')
    modelShouldBe('thin')
    expectRadioToBeTabbable('Thin crust')
    expectRadioToBeNotTabbable('Regular crust')
  })

  it('When value of the selected & focused radio is changed to another radio, then keyboard navigation works relative to the focused radio', () => {
    findRadioButtonContains('Thin crust').click().type('{shift+r}')
    modelShouldBe('regular')
    findRadioButtonContains('Thin crust').should('be.focused').type('{leftarrow}')
    findRadioButtonContains('Deep dish').should('be.focused')
    modelShouldBe('deep')
  })

  describe('"disabled" cases', () => {
    it('When radio is disabled, then it is not clickable & not tabbable', () => {
      findDeepDisabledCheckbox().check()

      cy.injectAxeAndConfigureCTDefaults()
      cy.checkA11y()

      findRadioButtonContains('Deep dish')
        .should('have.attr', 'tabindex', -1)
        .should('have.attr', 'aria-disabled', 'true')
        .should('have.css', 'pointer-events', 'none')

      findDeepDisabledCheckbox().uncheck()
    })

    it('When radio is selected and becomes disabled, then it is still checked', () => {
      findRadioButtonContains('Deep dish').click()
      findDeepDisabledCheckbox().check()
      findRadioButtonContains('Deep dish').should('have.attr', 'aria-checked', 'true')
    })

    it('When radio is selected and focused, but becomes disabled, then it is still focused and navigation works correctly', () => {
      findRadioButtonContains('Deep dish').click()
      cy.focused().type('{shift+d}') // disabling without losing focus
      findRadioButtonContains('Deep dish').should('be.focused')
      modelShouldBe('deep')

      cy.focused().type('{leftarrow}')
      modelShouldBe('regular')
      cy.focused().type('{rightarrow}')
      modelShouldBe('thin') // disabled radio is jumped over, so not "deep", but "thin"
    })

    it("When everything suddenly becomes disabled, focus & value doesn't change by keyboard", () => {
      findRadioButtonContains('Regular crust').click().type('{shift+a}')
      findAllDisabledCheckbox().should('be.checked')
      cy.focused().type('{rightarrow}')
      cy.focused().contains('Regular crust')
      modelShouldBe('regular')
    })
  })
})

describe('SRadioGroup', () => {
  it('It has role=radiogroup', () => {
    cy.mount({
      template: `
        <SRadioGroup data-cy="group">
          Soramitsu
        </SRadioGroup>
      `,
    })

    cy.dataCy('group').should('have.attr', 'role', 'radiogroup')
  })

  it('When custom radio selector is set, it is used correctly', () => {
    const CustomRadio = {
      props: {
        value: String,
      },
      setup(props) {
        const { tabindex, check } = useRadioGroupApi().registerRadio({
          elRef: templateRef('root'),
          valueRef: computed(() => props.value),
          disabledRef: ref(false),
        })

        return { tabindex, check }
      },
      template: `
        <div
          ref="root"
          class="custom-radio"
          v-bind="{ tabindex }"
          @click="check"
        >
          <slot />
        </div>
      `,
    }

    const CUSTOM_SELECTOR = `div.custom-radio`

    cy.mount({
      components: { CustomRadio },
      setup() {
        return { val: ref(null), selector: CUSTOM_SELECTOR }
      },
      template: `
        <p id="model">{{ val }}</p>

        <SRadioGroup v-model="val" :radio-selector="selector">
          <CustomRadio value="aaa">
            AAA
          </CustomRadio>
          <CustomRadio value="bbb">
            BBB
          </CustomRadio>
        </SRadioGroup>
      `,
    })
    const findCustomRadioContaining = (what: string) => cy.get(CUSTOM_SELECTOR).contains(what).closest(CUSTOM_SELECTOR)
    const modelShouldBe = (val: string) => cy.get('#model').should('have.text', val)

    // navigation & focus should work
    findCustomRadioContaining('AAA').click()
    modelShouldBe('aaa')
    cy.focused().type('{leftarrow}')
    cy.focused().contains('BBB')
    modelShouldBe('bbb')
  })

  it('When `labelled-by` & `described-by` are set, then appropriate ARIA is set', () => {
    cy.mount({
      template: `
        <SRadioGroup data-cy="group" labelled-by="label" described-by="desc">
          <label id="label">Label</label>
          <div id="desc">Description</div>
        </SRadioGroup>
      `,
    })

    cy.dataCy('group').should('have.attr', 'aria-labelledby', 'label').should('have.attr', 'aria-describedby', 'desc')
  })
})
