import type { InjectionKey, Ref } from 'vue'
import { inject } from 'vue'

export interface AccordionItemApi {
  name: string
  toggle: (expand?: boolean) => void
  isActive: boolean
}

export interface AccordionApi {
  register: (item: Ref<AccordionItemApi>) => void
  unregister: (item: Ref<AccordionItemApi>) => void
}

export const ACCORDION_API_KEY: InjectionKey<AccordionApi | undefined> = Symbol('AccordionAPI')

export const useAccordionApi = () => inject(ACCORDION_API_KEY, undefined)
