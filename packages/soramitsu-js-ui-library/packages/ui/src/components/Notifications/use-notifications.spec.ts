/* eslint-disable vue/one-component-per-file */
import { describe, expect, test, vi } from 'vitest'
import { createApp, defineComponent, ref } from 'vue'
import { useNotifications } from './composables'
import { NOTIFICATIONS_API_KEY } from './api'
import { createToastsApiMock } from '@/test-utils'
import type { Status } from '@/types'

describe('useNotifications', () => {
  test('registers toast and wires callbacks', () => {
    const { api, register, unregister, slots } = createToastsApiMock()

    const handleRef: { close?: () => void } = {}

    const Harness = defineComponent({
      name: 'NotificationsHarness',
      setup() {
        const { show } = useNotifications()
        handleRef.close = show({
          title: 'Hello',
          description: 'World',
          timeout: 200,
          showCloseBtn: true,
        }).close

        return () => null
      },
    })

    const container = document.createElement('div')
    const app = createApp(Harness)
    app.provide(NOTIFICATIONS_API_KEY, api as any)
    app.mount(container)

    expect(register).toHaveBeenCalledTimes(1)
    expect(slots).toHaveLength(1)

    const slotOutput = slots[0]?.({} as any, {} as any)
    const vnode = Array.isArray(slotOutput) ? slotOutput[0] : slotOutput
    expect(vnode).toBeDefined()
    expect(vnode?.props?.timeout).toBe(200)
    expect(vnode?.props?.title).toBe('Hello')

    vnode?.props?.onTimeout?.()
    expect(unregister).toHaveBeenCalledTimes(1)

    vnode?.props?.['onClick:close']?.(new MouseEvent('click'))
    expect(unregister).toHaveBeenCalledTimes(2)

    handleRef.close?.()
    expect(unregister).toHaveBeenCalledTimes(3)

    app.unmount()
  })

  test('unwraps reactive parameters', () => {
    const { api, register, slots } = createToastsApiMock()

    const Harness = defineComponent({
      name: 'ReactiveNotificationsHarness',
      setup() {
        const title = ref('Reactive title')
        const description = ref('Reactive description')
        const timeout = ref(150)
        const status = ref<Status>('success')
        const showCloseBtn = ref(true)
        const { show } = useNotifications()

        show({
          title,
          description,
          timeout,
          status,
          showCloseBtn,
        })

        return () => null
      },
    })

    const container = document.createElement('div')
    const app = createApp(Harness)
    app.provide(NOTIFICATIONS_API_KEY, api as any)
    app.mount(container)

    expect(register).toHaveBeenCalledTimes(1)
    const slotOutput = slots[0]?.({} as any, {} as any)
    const vnode = Array.isArray(slotOutput) ? slotOutput[0] : slotOutput
    expect(vnode?.props?.title).toBe('Reactive title')
    expect(vnode?.props?.description).toBe('Reactive description')
    expect(vnode?.props?.timeout).toBe(150)
    expect(vnode?.props?.status).toBe('success')
    expect(vnode?.props?.showCloseBtn).toBe(true)

    app.unmount()
  })
})
