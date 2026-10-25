import { inject, type InjectionKey, type Ref } from 'vue';

export type MenuContext = {
  active: Ref<string>;
  select: (value: string) => void;
};

export const MENU_CONTEXT_KEY: InjectionKey<MenuContext> = Symbol('SMenuContext');

export function useMenuContext(): MenuContext | null {
  return inject(MENU_CONTEXT_KEY, null);
}
