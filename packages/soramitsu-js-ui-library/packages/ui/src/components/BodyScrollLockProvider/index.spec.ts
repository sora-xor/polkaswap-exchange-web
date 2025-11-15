/* eslint-disable vue/one-component-per-file */
import { describe, expect, test, vi } from 'vitest'
import { BODY_SCROLL_LOCK_API_KEY, useBodyScrollLockIfPossible } from './index'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

describe('useBodyScrollLockIfPossible', () => {
  test('locks and unlocks when target changes', async () => {
    const lock = vi.fn()
    const unlock = vi.fn()
    const element = document.createElement('div')
    let toggle: ((value: HTMLElement | null) => void) | undefined

    const Harness = defineComponent({
      setup() {
        const target = ref<HTMLElement | null>(null)
        useBodyScrollLockIfPossible(target)
        toggle = (value) => {
          target.value = value
        }
        return () => h('div')
      },
    })

    const app = createApp(Harness)
    app.provide(BODY_SCROLL_LOCK_API_KEY, { lock, unlock })
    app.mount(document.createElement('div'))

    toggle?.(element)
    await nextTick()
    expect(lock).toHaveBeenCalledWith(element)

    toggle?.(null)
    await nextTick()
    expect(unlock).toHaveBeenCalledWith(element)

    app.unmount()
    expect(unlock).toHaveBeenCalledTimes(1)
  })

  test('does nothing when API is absent', () => {
    const Harness = defineComponent({
      setup() {
        useBodyScrollLockIfPossible(ref(null))
        return () => h('div')
      },
    })

    const app = createApp(Harness)
    expect(() => app.mount(document.createElement('div'))).not.toThrow()
    app.unmount()
  })
})
