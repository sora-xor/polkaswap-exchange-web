import type { InjectionKey } from 'vue'
import type { Instance } from '@popperjs/core'
import { forceInject } from '@/util'

export interface PopoverApi {
  /**
   * Should popper be shown
   */
  show: boolean
  /**
   * Current popper instance
   */
  popper: Instance | null

  /**
   * Ref binding to child component doesn't work properly all the time.
   * For example, it breaks when it is binded to a component with `v-if` root.
   * For such case that component should set popper element by itself.
   */
  addPopperRefOverride: (elem: HTMLElement) => void

  /**
   * It should be called when the element is no more a popper elem (e.g. when it is unmounted)
   */
  deletePopperRefOverride: (elem: HTMLElement) => void
}

export const POPOVER_API_KEY: InjectionKey<PopoverApi> = Symbol('PopoverAPI')

export const usePopoverApi = () => forceInject(POPOVER_API_KEY)
