import { forceInject } from '@/util'
import type { InjectionKey } from 'vue'

export interface TabsPanelApi {
  active: string
  selectTab: (tab: string) => void
  background: TabsPanelBackgroundType
}

export const TABS_PANEL_BACKGROUND_TYPES = ['primary', 'secondary', 'none'] as const

export type TabsPanelBackgroundType = typeof TABS_PANEL_BACKGROUND_TYPES extends ReadonlyArray<infer T> ? T : never

export const TABS_PANEL_API_KEY: InjectionKey<TabsPanelApi> = Symbol('tabsPanel')

export function useTabsPanelApi(): TabsPanelApi {
  return forceInject(TABS_PANEL_API_KEY)
}
