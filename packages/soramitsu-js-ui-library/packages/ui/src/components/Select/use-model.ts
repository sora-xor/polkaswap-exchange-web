import type { Ref } from 'vue'
import type { SelectOption, SelectOptionGroup } from './types'
import { whenever } from '@vueuse/core'
import { and, not } from '@vueuse/math'
import { isSelectOptions } from './utils'

export interface UseSelectModelReturn<T> {
  /**
   * Toggle value's selection state. Works different in single/multiple modes.
   */
  toggleSelection: (value: T) => void
  toggleGroupSelection: (optionsGroup: SelectOptionGroup<T>) => void
  select: (value: T) => void
  unselect: (value: T) => void

  /**
   * Universal checking tool, agnostic to selection mode
   */
  isValueSelected: (value: T) => boolean

  /**
   * List of selected options (with only one item maximum in a single mode)
   */
  selectedOptions: Ref<SelectOption<T>[]>

  isSomethingSelected: Ref<boolean>
  isGroupSelected: (optionsGroup: SelectOptionGroup<T>) => boolean
}

export interface UseSelectModelParams<T> {
  multiple: Ref<boolean>
  model: Ref<null | T | T[]>
  options: Ref<SelectOption<T>[] | SelectOptionGroup<T>[]>
  /**
   * Enables options remembering for async search in multiple select when, for example,
   * the options are changed on search query changes. If there are no options for selected values,
   * then options without labels are created (e.g. for cases when model is changed externally)
   */
  storeSelectedOptions: Ref<boolean>
  singleModeAutoClose: Ref<boolean>
  /**
   * Should be used to actually perform menu closing
   */
  onAutoClose: () => void
  mandatory?: Ref<boolean>
}

export function useSelectModel<T = any>({
  multiple,
  model,
  options,
  singleModeAutoClose,
  onAutoClose,
  storeSelectedOptions,
  mandatory,
}: UseSelectModelParams<T>): UseSelectModelReturn<T> {
  const triggerAutoClose = () => singleModeAutoClose.value && onAutoClose()

  const modelAsArray = computed<T[]>(() => {
    const val = model.value
    if (Array.isArray(val)) return val
    if (val !== null) return [val]
    return []
  })

  const selectedSet = computed<Set<T>>(() => {
    return new Set(modelAsArray.value)
  })

  const optionItems = computed(() => {
    if (isSelectOptions(options.value)) {
      return options.value
    }

    return options.value.flatMap((x) => x.items)
  })

  const storedOptions = shallowReactive(new Map<T, SelectOption<T>>())

  let modelChangedManually = false
  watch(
    modelAsArray,
    () => {
      if (modelChangedManually) {
        modelChangedManually = false

        return
      }

      if (!storeSelectedOptions.value) {
        return
      }

      storedOptions.forEach((_, value) => {
        if (!modelAsArray.value.includes(value)) {
          storedOptions.delete(value)
        }
      })
      modelAsArray.value.forEach(rememberOption)
    },
    { immediate: true, flush: 'sync' },
  )

  function rememberOption(value: T) {
    if (storedOptions.has(value)) {
      return
    }

    const option = optionItems.value.find((x) => x.value === value)

    if (option) {
      storedOptions.set(option.value, option)

      return
    }

    storedOptions.set(value, { label: '', value })
  }

  function forgetOption(value: T) {
    storedOptions.delete(value)
  }

  function isValueSelected(value: T): boolean {
    return selectedSet.value.has(value)
  }

  function isGroupSelected(optionGroup: SelectOptionGroup<T>) {
    return optionGroup.items.every((x) => isValueSelected(x.value))
  }

  function select(value: T): void {
    if (multiple.value) {
      modelChangedManually = true
      model.value = [...new Set([...modelAsArray.value, value])]

      if (storeSelectedOptions.value) {
        rememberOption(value)
      }
    } else {
      modelChangedManually = true

      if (storeSelectedOptions.value) {
        let oldValue = Array.isArray(model.value) ? model.value[0] : model.value

        if (oldValue) {
          forgetOption(oldValue)
        }
      }

      model.value = value

      if (storeSelectedOptions.value) {
        rememberOption(value)
      }

      triggerAutoClose()
    }
  }

  function unselect(value: T) {
    if (multiple.value) {
      modelChangedManually = true
      model.value = modelAsArray.value.filter((x) => x !== value)

      if (storeSelectedOptions.value) {
        forgetOption(value)
      }
    } else {
      modelChangedManually = true
      model.value = null

      if (storeSelectedOptions.value) {
        forgetOption(value)
      }

      triggerAutoClose()
    }
  }

  function toggleSelection(value: T): void {
    if (!isValueSelected(value)) {
      select(value)
    } else {
      if (
        mandatory?.value &&
        ((Array.isArray(model.value) && model.value.length === 1) || (model.value && !multiple.value))
      )
        return

      unselect(value)
    }
  }

  function toggleGroupSelection(optionGroup: SelectOptionGroup<T>): void {
    const optionGroupValues = optionGroup.items.map((x) => x.value)

    if (isGroupSelected(optionGroup)) {
      if (mandatory?.value && Array.isArray(model.value) && model.value.length === optionGroup.items.length) return

      const optionGroupSet = new Set(optionGroupValues)
      const newModel = modelAsArray.value.filter((x) => !optionGroupSet.has(x))
      modelChangedManually = true
      model.value = newModel

      if (storeSelectedOptions.value) {
        optionGroupValues.forEach(forgetOption)
      }

      return
    }

    const newModel = [...new Set([...modelAsArray.value, ...optionGroupValues])]
    modelChangedManually = true
    model.value = newModel

    if (storeSelectedOptions.value) {
      newModel.forEach(rememberOption)
    }
  }

  const selectedOptions = computed<SelectOption<T>[]>(() => {
    if (storeSelectedOptions.value) {
      return [...storedOptions.values()]
    }

    return optionItems.value.filter((x) => isValueSelected(x.value))
  })

  const isSomethingSelected = computed<boolean>(() => !!selectedSet.value.size)

  const isModelAnArray = computed<boolean>(() => Array.isArray(model.value))

  function modelFromSingleToMultiple() {
    const current = model.value as null | T
    model.value = current === null ? [] : [current]
  }

  function modelFromMultipleToSingle() {
    const current = model.value as T[]
    model.value = current.length ? current[0] : null
  }

  whenever(and(isModelAnArray, not(multiple)), modelFromMultipleToSingle, { immediate: true })
  whenever(and(not(isModelAnArray), multiple), modelFromSingleToMultiple, { immediate: true })

  return {
    isValueSelected,
    selectedOptions,
    toggleSelection,
    toggleGroupSelection,
    select,
    unselect,
    isSomethingSelected,
    isGroupSelected,
  }
}
