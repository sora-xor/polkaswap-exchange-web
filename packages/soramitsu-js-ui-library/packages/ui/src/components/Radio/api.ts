import type { InjectionKey, Ref } from 'vue'
import { forceInject } from '@/util'

export interface RadioGroupApi {
  /**
   * Registers a radio button within the radio group.
   *
   * It is automatically unregistered on scope dispose.
   */
  registerRadio: (params: RegisterRadioParams) => RadioGroupRegisteredItemApi
}

export interface RegisterRadioParams {
  valueRef: Ref<any>
  elRef: Ref<null | HTMLElement>
  disabledRef: Ref<boolean>
}

export interface RadioGroupRegisteredItemApi {
  /**
   * Reactive radio state. Can be used for styling and `aria-checked` attr.
   */
  isChecked: boolean

  tabindex: number

  /**
   * Tells to the radio group that this item was checked
   */
  check: () => void
}

export const RADIO_GROUP_API_KEY: InjectionKey<RadioGroupApi> = Symbol('RadioGroupApi')

export function useRadioGroupApi(): RadioGroupApi {
  return forceInject(RADIO_GROUP_API_KEY)
}
