import type { App, InjectionKey, Ref, Component, FunctionalComponent } from 'vue';
import { getCurrentInstance, inject } from 'vue';

const SAFE_DYNAMIC_TAG_RE = /^[A-Za-z][A-Za-z0-9._:-]*$/;

export function forceInject<T>(key: string | InjectionKey<T>): T {
  const sentinel = Symbol('forceInject sentinel');
  const something = inject(key, sentinel as unknown);
  if (something === sentinel) {
    throw new Error(`Injection of "${String(key)}" failed`);
  }
  return something as T;
}

/**
 * Useful for render functions
 * @param model
 * @returns
 */
export function bareMetalVModel<T, K extends string = 'modelValue'>(
  model: Ref<T>,
  prop: K = 'modelValue' as K
): {
  [key in `${K}`]: T;
} & {
  [key in `onUpdate:${K}`]: (value: T) => void;
} {
  return {
    [prop]: model.value as T,
    [`onUpdate:${prop}`]: (v: T) => {
      model.value = v;
    },
  } as any;
}

export function getComponentName(comp: Component): string | undefined {
  if (typeof comp === 'function') {
    const funcComponent = comp as FunctionalComponent;

    return funcComponent.displayName || funcComponent.name;
  }
  return comp.name || comp.__name;
}

const appCounters = new WeakMap<App, number>();
let fallbackCounter = 0;

/*
  Returns app-scoped unique id (falls back to process scope outside of component setup)
 */
export function nextIncrementalCounter(): number {
  const instance = getCurrentInstance();
  const app = instance?.appContext.app;

  if (app) {
    const current = appCounters.get(app) ?? 0;
    appCounters.set(app, current + 1);
    return current;
  }

  return fallbackCounter++;
}

export function uniqueElementId(): string {
  return `soraui-uid-${nextIncrementalCounter()}`;
}

/**
 * Returns true when a dynamic component string is safe to pass to Vue's renderer
 * as a native/custom element tag name.
 */
export function isSafeDynamicTagName(value: string): boolean {
  return SAFE_DYNAMIC_TAG_RE.test(value.trim());
}

/**
 * Normalizes runtime-provided dynamic component values before they reach
 * `<component :is="...">`, preventing DOM InvalidCharacterError crashes.
 */
export function resolveDynamicComponentTag<T extends string | object | Function | null | undefined>(
  value: T,
  fallback: string
): Exclude<T, null | undefined> | string {
  if (typeof value === 'string') {
    return isSafeDynamicTagName(value) ? value : fallback;
  }

  if (typeof value === 'function' || (value && typeof value === 'object')) {
    return value as Exclude<T, null | undefined>;
  }

  return fallback;
}

/**
 * Checks whether a value can be rendered by `<component :is="...">`.
 */
export function isRenderableDynamicComponent(value: unknown): boolean {
  if (typeof value === 'string') return isSafeDynamicTagName(value);
  return typeof value === 'function' || Boolean(value && typeof value === 'object');
}
