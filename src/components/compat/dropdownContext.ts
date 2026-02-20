import type { InjectionKey } from 'vue';

export interface DropdownCompatContext {
  onSelect: (value: unknown, event: MouseEvent | KeyboardEvent) => void;
}

export const dropdownCompatContextKey: InjectionKey<DropdownCompatContext> = Symbol('dropdownCompatContext');
