import { forceInject } from '@/util'
import type { InjectionKey } from 'vue'
import type { FocusTrap } from 'focus-trap'

export interface ModalApi {
  close: () => void
  /**
   * It's `null` if focus trap was disabled in SModal props
   */
  focusTrap: null | FocusTrap

  /**
   * ID that is pointed by the modal with `aria-labelledby`.
   * Should be used in child component.
   */
  labelledBy: string

  /**
   * ID that is pointed by the modal with `aria-describedby`.
   */
  describedBy: string | null
}

export const MODAL_API_KEY: InjectionKey<ModalApi> = Symbol('ModalAPI')

export function useModalApi(): ModalApi {
  return forceInject(MODAL_API_KEY)
}
