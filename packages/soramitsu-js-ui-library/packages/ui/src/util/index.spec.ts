/* eslint-disable vue/one-component-per-file */
import { describe, expect, test, vi } from 'vitest'
import { createApp, defineComponent, h, ref } from 'vue'
import { bareMetalVModel, forceInject, uniqueElementId, nextIncrementalCounter } from './index'

describe('uniqueElementId', () => {
  function mountCollect(store: string[], calls: number) {
    const Collect = defineComponent({
      name: 'CollectIds',
      setup() {
        for (let i = 0; i < calls; i++) {
          store.push(uniqueElementId())
        }
        return () => h('div')
      },
    })

    const container = document.createElement('div')
    const app = createApp(Collect)
    app.mount(container)
    app.unmount()
  }

  test('resets counters for each app instance', () => {
    const firstRun: string[] = []
    const secondRun: string[] = []

    mountCollect(firstRun, 2)
    mountCollect(secondRun, 1)

    expect(firstRun[0]).toMatch(/^soraui-uid-/)
    expect(firstRun[0]).not.toBe(firstRun[1])
    expect(secondRun).toEqual([firstRun[0]])
  })

  test('generates unique ids within the same app instance', () => {
    const ids: string[] = []
    mountCollect(ids, 5)

    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('nextIncrementalCounter', () => {
  test('increments outside of component context', () => {
    const first = nextIncrementalCounter()
    const second = nextIncrementalCounter()

    expect(second).toBe(first + 1)
  })
})

describe('bareMetalVModel', () => {
  test('maps value and update callback for custom prop', () => {
    const model = ref('initial')
    const binding = bareMetalVModel(model, 'foo')

    expect(binding.foo).toBe('initial')
    binding['onUpdate:foo']('next')

    expect(model.value).toBe('next')
  })

  test('defaults to modelValue prop', () => {
    const model = ref(10)
    const binding = bareMetalVModel(model)

    expect(binding.modelValue).toBe(10)
    binding['onUpdate:modelValue'](42)

    expect(model.value).toBe(42)
  })
})

describe('forceInject', () => {
  test('returns provided value', () => {
    const KEY = Symbol('injection')
    const provided = { foo: 'bar' }
    const collected: any[] = []

    const Collector = defineComponent({
      name: 'TestCollector',
      setup() {
        collected.push(forceInject(KEY))
        return () => h('div')
      },
    })

    const container = document.createElement('div')
    const app = createApp(Collector)
    app.provide(KEY, provided)
    app.mount(container)

    expect(collected).toEqual([provided])

    app.unmount()
  })

  test('throws when injection is missing', () => {
    const KEY = Symbol('missing')

    const Broken = defineComponent({
      name: 'TestBrokenComponent',
      setup() {
        forceInject(KEY)
        return () => h('div')
      },
    })

    const container = document.createElement('div')
    const app = createApp(Broken)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      expect(() => app.mount(container)).toThrowError(/Injection/)
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })
})
