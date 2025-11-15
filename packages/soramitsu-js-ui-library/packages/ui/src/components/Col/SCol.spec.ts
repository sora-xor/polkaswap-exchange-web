import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'

import SCol from './SCol.vue'
import SRow from '../Row/SRow.vue'

describe('SCol', () => {
  test('applies base span and offset styles', () => {
    const wrapper = mount(SCol, {
      props: {
        span: 6,
        offset: 3,
        push: 2,
      },
    })

    const style = wrapper.attributes('style')

    expect(style).toContain('--s-col-span-width: 50%')
    expect(style).toContain('--s-col-offset: 25%')
    expect(style).toContain('--s-col-translate: 16.6667%')
  })

  test('derives gutter padding from parent row', () => {
    const wrapper = mount({
      components: { SRow, SCol },
      template: `
        <SRow :gutter="24">
          <SCol data-test="col" />
        </SRow>
      `,
    })

    const col = wrapper.get('[data-test="col"]')
    const style = col.attributes('style')

    expect(style).toContain('--s-col-gutter: 24px')
    expect(style).toContain('padding-left: 12px')
    expect(style).toContain('padding-right: 12px')
  })

  test('supports responsive configuration objects', () => {
    const wrapper = mount(SCol, {
      props: {
        sm: { span: 8, offset: 1 },
        md: 6,
      },
    })

    const style = wrapper.attributes('style')

    expect(style).toContain('--s-col-span-width-sm: 66.6667%')
    expect(style).toContain('--s-col-offset-sm: 8.3333%')
    expect(style).toContain('--s-col-span-width-md: 50%')
  })

  test('hides column when span is zero', () => {
    const wrapper = mount(SCol, {
      props: { span: 0 },
    })

    expect(wrapper.attributes('style')).toContain('display: none')
  })
})
