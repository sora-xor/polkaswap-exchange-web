import type { MaybeElementRef } from '@vueuse/core'
import type { InjectionKey, PropType } from 'vue'

export interface BodyScrollLockApi {
  lock: (elem: Element) => void
  unlock: (elem: Element) => void
}

export const BODY_SCROLL_LOCK_API_KEY: InjectionKey<BodyScrollLockApi> = Symbol('SBodyScrollLockApi')

export const SBodyScrollLockProvider = /* @__PURE__ */ defineComponent({
  name: 'SBodyScrollLockProvider',
  props: {
    api: {
      type: Object as PropType<BodyScrollLockApi>,
      required: true,
    },
  },
  setup(props, { slots }) {
    provide(BODY_SCROLL_LOCK_API_KEY, props.api)
    return () => slots.default?.()
  },
})

/**
 * tip: if you want to make it conditional, pass maybe-null-ref as target
 */
export function useBodyScrollLockIfPossible(target: MaybeElementRef) {
  const api = inject(BODY_SCROLL_LOCK_API_KEY, undefined)
  if (!api) return

  const targetNormalized = computed(() => unrefElement(target))

  watch(
    targetNormalized,
    (elem, prevElem) => {
      if (prevElem) {
        api.unlock(prevElem)
      }

      if (elem) {
        api.lock(elem)
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    const elem = targetNormalized.value
    elem && api.unlock(elem)
  })
}
