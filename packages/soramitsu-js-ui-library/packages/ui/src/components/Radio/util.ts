import type { MaybeElementRef, MaybeRef } from '@vueuse/core'
import type { Merge } from 'type-fest'
import type { Ref } from 'vue'
import type { RadioGroupApi, RadioGroupRegisteredItemApi, RegisterRadioParams } from '.'

export function useRadiosSelector<T extends Element>(
  target: MaybeElementRef,
  selector: MaybeRef<string>,
): {
  update: (immediate?: boolean) => void
  elems: Ref<Array<T>>
} {
  const elems = shallowRef<T[]>([])
  const selectorRef = computed(() => unref(selector))
  const targetRef = computed(() => unrefElement(target))

  function doUpdate() {
    const root = targetRef.value

    if (!root) throw new Error('Element is not defined; unable to update')

    elems.value = Array.from(root.querySelectorAll(selectorRef.value))
  }

  const updateTriggerCounter = ref(0)
  let lastUpdateTriggeredCounter = 0

  watch(updateTriggerCounter, (num) => {
    if (num > lastUpdateTriggeredCounter) {
      doUpdate()
      lastUpdateTriggeredCounter = num
    }
  })

  function update(immediate?: boolean) {
    if (immediate) doUpdate()
    else {
      updateTriggerCounter.value++
    }
  }

  watch(selectorRef, () => {
    targetRef.value && doUpdate()
  })

  return {
    elems,
    update,
  }
}

/**
 * Everything here is read-only and exposed by a single radio to the group
 */
export interface Radio {
  /**
   * Root element of the radio. Should be queryable by `radioSelector` for sure.
   */
  elRef: Ref<null | HTMLElement>
  /**
   * Value of the radio. It is used to determine whether radio is checked or not, as well
   * as for setting model value when the radio is activated by user (with `Space` or click)
   */
  valueRef: Ref<any>
  /**
   * Index of the radio, computed by the position of the radio's element in the array of all
   * radio elements.
   */
  index: Ref<number>
  /**
   * It is true when the value of the radio equals to the model value of the radio group
   */
  isChecked: Ref<boolean>
  /**
   * It is true when the radio's element is focused
   */
  isFocused: Ref<boolean>
  isDisabled: Ref<boolean>
}

export interface UseRadiosRegistrationReturn {
  /**
   * Should be called within a setup context of the radio button
   */
  registerRadio: RadioGroupApi['registerRadio']
  /**
   * Function to toggle focus between radios
   *
   * @param forward - `true` by default
   */
  moveFocus: (forward?: boolean) => void
  /**
   * It is needed to check focused radio with {space} key press
   */
  checkFocused: () => void
}

export function useRadiosRegistration({
  radioElements,
  model,
  updateRadioElements,
}: {
  model: Ref<any>
  radioElements: Ref<HTMLElement[]>
  updateRadioElements: () => void
}): UseRadiosRegistrationReturn {
  const radios = shallowReactive<Set<Radio>>(new Set())

  const isNothingChecked = eagerComputed<boolean>(() => {
    for (const entry of radios) {
      if (entry.isChecked.value) return false
    }
    return true
  })

  const focusedRadio = computed<null | Radio>(() => {
    for (const entry of radios) {
      if (entry.isFocused.value) {
        return entry
      }
    }

    return null
  })

  const isNothingFocused = eagerComputed<boolean>(() => !focusedRadio.value)

  function indexOfFocusedRadio(): number {
    return focusedRadio.value?.index?.value ?? -1
  }

  const sequence = computed<Radio[]>(() => {
    const items: Radio[] = new Array(radios.size).fill(null)

    for (const entry of radios) {
      items[entry.index.value] = entry
    }

    return items
  })

  function findNextFocusableRadioInSequence(forward = true): Radio | null {
    const delta = forward ? 1 : -1
    const items = sequence.value
    const count = items.length

    let steps = 0
    let idx = indexOfFocusedRadio()

    if (idx < 0) return null

    while (steps++ < count) {
      idx += delta
      idx = idx >= count ? 0 : idx < 0 ? count - 1 : idx

      if (!items[idx].isDisabled.value) return items[idx]
    }

    return null
  }

  function moveFocus(forward = true) {
    const next = findNextFocusableRadioInSequence(forward)
    if (next) {
      model.value = next.valueRef.value
      next.elRef.value!.focus()
    }
  }

  function checkFocused() {
    const radio = focusedRadio.value
    if (radio) {
      model.value = radio.valueRef.value
    }
  }

  function registerRadio({
    elRef,
    valueRef,
    disabledRef: isDisabled,
  }: RegisterRadioParams): RadioGroupRegisteredItemApi {
    const { focused: isFocused } = useFocus(elRef)

    const index = eagerComputed<number>(() => (elRef.value ? radioElements.value.indexOf(elRef.value) : -1))

    const isItTheFirstRadioInTheGroup = eagerComputed<boolean>(() => index.value === 0)

    const isChecked = eagerComputed<boolean>(() => model.value === valueRef.value)

    const isTabbable = eagerComputed(
      () =>
        !isDisabled.value &&
        (isFocused.value ||
          (isNothingFocused.value && isChecked.value) ||
          (isNothingChecked.value && isItTheFirstRadioInTheGroup.value)),
    )

    const tabindex = computed(() => (isTabbable.value ? 0 : -1))

    function check() {
      model.value = valueRef.value
    }

    const registeredEntry: Radio = {
      elRef,
      valueRef,
      index,
      isChecked,
      isFocused,
      isDisabled,
    }

    watch(elRef, (x) => x && updateRadioElements(), { flush: 'sync' })

    onMounted(() => {
      radios.add(registeredEntry)
    })

    onUnmounted(() => {
      radios.delete(registeredEntry)
      updateRadioElements()
    })

    return readonly<
      Merge<
        RadioGroupRegisteredItemApi,
        {
          isChecked: Ref<boolean>
          tabindex: Ref<number>
        }
      >
    >({
      check,
      isChecked,
      tabindex,
    })
  }

  return { registerRadio, moveFocus, checkFocused }
}
