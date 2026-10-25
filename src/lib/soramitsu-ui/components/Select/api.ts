import type { InjectionKey, UnwrapRef } from 'vue';
import type { SelectOption, SelectOptionGroup, SelectSize } from './types';
import type { UseSelectModelReturn } from './use-model';
import { forceInject } from '@soramitsu-ui/ui/util';

export interface SelectApi<T> extends UnwrapRef<UseSelectModelReturn<T>> {
  readonly options: UnwrapRef<SelectOption<T>[] | SelectOptionGroup<T>[]>;
  readonly multiple: boolean;
  readonly disabled: boolean;
  readonly loading: boolean;
  readonly mandatory: boolean;
  readonly label: string | null;
  readonly size: SelectSize;
  readonly noAutoClose: boolean;
  readonly searchQuery: string;
  readonly remoteSearch: boolean;

  readonly isMenuOpened: boolean;
  /**
   * Set menu visibility manually
   */
  menuToggle: (value?: boolean) => void;
  updateSearchQuery: (value: string | undefined) => void;
}

export const SELECT_API_KEY: InjectionKey<SelectApi<any>> = Symbol('SelectAPI');

export function useSelectApi<T = any>(): SelectApi<T> {
  return forceInject(SELECT_API_KEY);
}
