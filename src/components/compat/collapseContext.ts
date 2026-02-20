import type { ComputedRef, InjectionKey, Ref } from 'vue';

export type CollapseName = string | number;

export interface CollapseContext {
  activeNames: Ref<CollapseName[]>;
  accordion: ComputedRef<boolean>;
  toggleItem: (name: CollapseName) => void;
}

export const collapseContextKey: InjectionKey<CollapseContext | null> = Symbol('SCollapseCompatContext');
