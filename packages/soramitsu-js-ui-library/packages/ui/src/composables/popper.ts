import type { VirtualElement, Instance, Options } from '@popperjs/core'
import { createPopper } from '@popperjs/core'
import type { MaybeRef } from '@vueuse/core'
import type { Ref } from 'vue'
import { computed, watch, unref, shallowRef, onScopeDispose, isReactive } from 'vue'

type ElementReference = Element | VirtualElement
type ElementPopper = HTMLElement

export interface UsePopperParams {
  referenceElem: MaybeRef<ElementReference | null>
  popperElem: MaybeRef<ElementPopper | null>
  options?: MaybeRef<Partial<Options>>
  callbackInit?: (reference: ElementReference, popper: ElementPopper) => Instance
  callbackDestroy?: (instance: Instance) => void
}

export interface UsePopperReturn {
  instance: Ref<Instance | null>
}

export function usePopper(params: UsePopperParams): UsePopperReturn {
  const elemReference = computed(() => unref(params.referenceElem))
  const elemPopper = computed(() => unref(params.popperElem))
  const opts = params.options || {}

  const instance = shallowRef<Instance | null>(null)

  function init(reference: ElementReference, popper: ElementPopper) {
    instance.value = markRaw(params.callbackInit?.(reference, popper) ?? createPopper(reference, popper, unref(opts)))
  }

  function destroy() {
    instance.value && (params.callbackDestroy ? params.callbackDestroy(instance.value) : instance.value.destroy())
  }

  watch(
    [elemReference, elemPopper],
    ([a, b]) => {
      destroy()
      a && b && init(a, b)
    },
    { immediate: true },
  )
  onScopeDispose(destroy)

  if (isReactive(opts)) {
    watch(
      opts,
      (updated) => {
        if (instance.value) {
          instance.value.setOptions(unref(updated))
        }
      },
      { deep: true },
    )
  }

  return { instance }
}
