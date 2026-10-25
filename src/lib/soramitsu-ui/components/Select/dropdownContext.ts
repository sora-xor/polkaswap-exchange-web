import type { InjectionKey } from 'vue';

export interface DropdownContext {
  onSelect: (value: unknown, event: MouseEvent | KeyboardEvent) => void;
}

export const dropdownContextKey: InjectionKey<DropdownContext> = Symbol('dropdownContext');
