import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'

import SCard from './SCard.vue'

const mountComponent = (options: Record<string, unknown> = {}) =>
  mount(SCard, {
    slots: {
      default: 'Content',
    },
    ...options,
  })

describe('SCard', () => {
  test('renders default structure and slot', () => {
    const wrapper = mountComponent()

    expect(wrapper.classes()).toContain('s-card')
    expect(wrapper.classes()).toContain('el-card')
    expect(wrapper.classes()).toContain('neumorphic')
    expect(wrapper.find('.el-card__body').text()).toBe('Content')
  })

  test('renders header slot and prop fallback', () => {
    const first = mountComponent({
      props: {
        header: 'Title',
      },
    })

    expect(first.find('.el-card__header').exists()).toBe(true)
    expect(first.find('.el-card__header').text()).toBe('Title')

    const second = mountComponent({
      slots: {
        header: '<span>Slot Header</span>',
      },
    })

    expect(second.find('.el-card__header').html()).toContain('Slot Header')
  })

  test('applies body style prop', () => {
    const wrapper = mountComponent({
      props: {
        bodyStyle: { padding: '10px' },
      },
    })

    expect(wrapper.find('.el-card__body').attributes('style')).toContain('padding: 10px')
  })

  test('handles clickable state', async () => {
    const wrapper = mountComponent({
      props: {
        clickable: true,
      },
    })

    expect(wrapper.classes()).toContain('s-clickable')

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('click')?.[0]?.[0]).toBeInstanceOf(MouseEvent)
  })

  test('applies sizing, radius, status, and shadow classes', () => {
    const wrapper = mountComponent({
      props: {
        size: 'small',
        borderRadius: 'mini',
        status: 'warning',
        shadow: 'always',
      },
    })

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['s-size-small', 's-border-radius-mini', 's-status-warning', 'is-always-shadow']),
    )
  })

  test('supports pressed and primary states', () => {
    const wrapper = mountComponent({
      props: {
        pressed: true,
        primary: true,
      },
    })

    expect(wrapper.classes()).toContain('s-pressed')
    expect(wrapper.classes()).toContain('s-primary')
  })

  test('allows disabling neumorphic class', () => {
    const wrapper = mountComponent({
      props: {
        neumorphic: false,
      },
    })

    expect(wrapper.classes()).not.toContain('neumorphic')
  })
})
