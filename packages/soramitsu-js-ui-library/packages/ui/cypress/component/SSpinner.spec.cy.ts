import { SSpinner } from '@/lib'

const findSvg = () => cy.get('svg')

const svgSizeShouldBe = (cssValue: string) => {
  findSvg()
    .invoke('css', 'animation', 'none')
    .invoke('css', 'transform', 'none')
    .should('have.css', 'width', cssValue)
    .and('have.css', 'height', cssValue)
}

it('When size pros is a number, it is set as px', () => {
  cy.mount(SSpinner, { props: { size: 55 } })

  svgSizeShouldBe('55px')
})

it('When size prop is a stringified number, it is set as px', () => {
  cy.mount(SSpinner, { props: { size: '12' } })

  svgSizeShouldBe('12px')
})

it('When size prop is a number with some dimension, it is set as is', () => {
  cy.mount(() =>
    h(
      'div',
      {
        style: { fontSize: '120px' },
      },
      [h(SSpinner, { size: '1em' })],
    ),
  )

  svgSizeShouldBe('120px')
})
