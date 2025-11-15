import type { InjectionKey, Ref, DeepReadonly } from 'vue'
import { inject } from 'vue'
import { forceInject } from '@/util'

export interface NavigationMenuApi {
  /**
   * Should be called inside item to select it
   */
  select: (index: string) => void
  active: string
  collapsed: boolean
}

export interface NavigationSubmenuApi {
  /**
   * Should be called inside item on setup. Unregister on scope dispose automatically
   */
  register: (index: Ref<string>) => void
}

export const NAVIGATION_MENU_API_KEY: InjectionKey<DeepReadonly<NavigationMenuApi>> = Symbol('NavigationMenuAPI')
export const NAVIGATION_SUBMENU_API_KEY: InjectionKey<DeepReadonly<NavigationSubmenuApi> | undefined> =
  Symbol('NavigationSubmenuAPI')

export const useNavigationMenuApi = () => forceInject(NAVIGATION_MENU_API_KEY)
export const useNavigationSubmenuApi = () => inject(NAVIGATION_SUBMENU_API_KEY, undefined)
