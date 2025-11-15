import type { PropType } from 'vue'
import { defineComponent, provide } from 'vue'
import { defineToastsApi, TOASTS_API_KEY } from './api'

type ProvideKey = string | Symbol

function* iterKeys<T>(baseKey: T, additional: T | T[]): Generator<T> {
  yield baseKey
  if (Array.isArray(additional)) {
    for (const x of additional) yield x
  } else {
    yield additional
  }
}

/**
 * SToastsAPI provider, nothing else
 */
export default /* @__PURE__ */ defineComponent({
  name: 'SToastsProvider',
  props: {
    /**
     * Non-reactive key(s) to use to provide the API (additional to the base `TOASTS_API_KEY`)
     */
    apiKey: {
      type: [String, Symbol, Array] as PropType<ProvideKey | ProvideKey[]>,
      default: null,
    },
  },
  setup(props, { slots }) {
    const api = defineToastsApi()

    for (const key of iterKeys(TOASTS_API_KEY, props.apiKey)) {
      provide(key, api)
    }

    return () => slots.default?.()
  },
})
