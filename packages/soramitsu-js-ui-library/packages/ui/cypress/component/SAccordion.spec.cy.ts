import { SAccordionItem, SAccordion } from '@/lib'

const testIdSelector = (id: string) => `[data-testid=${id}]`

describe('Accordion', () => {
  const findAccordionItem = () => cy.get(testIdSelector('accordion-item'))

  context(`Given closed accordion item's trigger`, () => {
    context('When it is clicked', () => {
      beforeEach(() => {
        cy.mount(SAccordionItem, {
          propsData: {
            title: 'Soramitsu',
          },
          slots: {
            default: () => 'Soramitsu text',
          },
        })
      })

      it('Then it toggles', () => {
        findAccordionItem().get(testIdSelector('content')).should('be.hidden')
        findAccordionItem().get(testIdSelector('trigger')).click()
        findAccordionItem().get(testIdSelector('content')).should('not.be.hidden')
        findAccordionItem().get(testIdSelector('trigger')).click()
        findAccordionItem().get(testIdSelector('content')).should('be.hidden')
      })
    })
  })

  context(`Given default accordion`, () => {
    beforeEach(() => {
      cy.mount({
        components: {
          SAccordion,
          SAccordionItem,
        },
        setup() {
          return {
            modelValue: ref([]),
          }
        },
        template: `
          <SAccordion v-model="modelValue">
            <SAccordionItem
              v-for="i in 3"
              :name="'item' + i"
              :id="'item' + i"
            >
              <template #title>Item {{ i }}</template>
              <template #subtitle>{{ i }} item</template>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
              labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
              ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur.
            </SAccordionItem>
          </SAccordion>
        `,
      })
    })

    context('When one item is expanded', () => {
      it('Then other are closed', () => {
        ;['#item1', '#item2', '#item3'].forEach((id) => {
          findAccordionItem().filter(id).find(testIdSelector('trigger')).click()
          findAccordionItem().filter(id).find(testIdSelector('content')).should('not.be.hidden')
          findAccordionItem().filter(`:not(${id})`).find(testIdSelector('content')).should('be.hidden')
        })
      })
    })
  })

  context(`Given accordion with 'multiple' prop`, () => {
    beforeEach(() => {
      cy.mount({
        components: {
          SAccordion,
          SAccordionItem,
        },
        setup() {
          return {
            modelValue: ref([]),
          }
        },
        template: `
          <SAccordion
            v-model="modelValue"
            multiple
          >
            <SAccordionItem
              v-for="i in 3"
              :name="'item' + i"
              :id="'item' + i"
            >
              <template #title>Item {{ i }}</template>
              <template #subtitle>{{ i }} item</template>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
              labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
              ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur.
            </SAccordionItem>
          </SAccordion>
        `,
      })
    })

    context('When items are clicked', () => {
      it('Then all clicked items are expanded', () => {
        findAccordionItem().find(testIdSelector('trigger')).click({ multiple: true })
        findAccordionItem().find(testIdSelector('content')).should('be.visible')
      })
    })
  })
})
