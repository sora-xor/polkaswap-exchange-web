import type { FocusTrap, Options } from 'focus-trap'
import { createFocusTrap } from 'focus-trap'
import type { MaybeElementRef } from '@vueuse/core'
import { unrefElement } from '@vueuse/core'
import type { Ref } from 'vue'
import { shallowRef, markRaw, watch, computed, onScopeDispose } from 'vue'

export interface UseFocusTrapParams {
  elem: MaybeElementRef

  /**
   * One-time, no reactivity
   */
  options?: Options
}

export interface UseFocusTrapReturn {
  trap: Ref<null | FocusTrap>
}

export function useFocusTrap(params: UseFocusTrapParams): UseFocusTrapReturn {
  const trap = shallowRef<null | FocusTrap>(null)

  const elem = computed(() => unrefElement(params.elem))

  watch(
    elem,
    (el) => {
      const tr = trap.value

      if (el) {
        if (tr) {
          tr.updateContainerElements(el)
        } else {
          const newTrap = markRaw(createFocusTrap(el, params.options))
          trap.value = newTrap
        }
      } else if (tr) {
        tr.deactivate()
        trap.value = null
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    trap.value?.deactivate()
  })

  return { trap }
}
