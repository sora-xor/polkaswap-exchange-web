import {
  computed,
  createCommentVNode,
  createTextVNode,
  getCurrentInstance,
  h,
  inject,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onScopeDispose,
  onUnmounted,
  provide,
  reactive,
  readonly,
  ref,
  renderList,
  renderSlot,
  shallowReactive,
  shallowRef,
  toDisplayString,
  toRef,
  toRefs,
  unref,
  useAttrs,
  useSlots,
  watch,
  watchEffect,
} from 'vue';

import {
  eagerComputed,
  templateRef,
  unrefElement,
  useFocus,
  useResizeObserver,
  useToggle,
  watchOnce,
  whenever,
} from '@vueuse/core';

type GlobalLike = Record<string, unknown>;

const runtime: GlobalLike = globalThis as GlobalLike;

const assignHelper = <T>(key: string, value: T) => {
  if (runtime[key] == null) {
    runtime[key] = value as unknown;
  }
};

const looseEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (typeof a === 'object' && typeof b === 'object' && a && b) {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => looseEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  }
  return String(a) === String(b);
};

const looseIndexOf = (arr: unknown[], value: unknown) => {
  for (let i = 0; i < arr.length; i += 1) {
    if (looseEqual(arr[i], value)) {
      return i;
    }
  }
  return -1;
};

assignHelper('_s', toDisplayString);
assignHelper('_n', (value: unknown) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
});
assignHelper('_q', looseEqual);
assignHelper('_i', looseIndexOf);
assignHelper('_l', renderList);
assignHelper('_t', renderSlot);
assignHelper('_e', createCommentVNode);
assignHelper('_v', createTextVNode);

// Vue composition API globals for compat-mode / legacy code that expects auto-imports.
assignHelper('computed', computed);
assignHelper('ref', ref);
assignHelper('reactive', reactive);
assignHelper('shallowReactive', shallowReactive);
assignHelper('shallowRef', shallowRef);
assignHelper('readonly', readonly);
assignHelper('watch', watch);
assignHelper('watchEffect', watchEffect);
assignHelper('nextTick', nextTick);
assignHelper('provide', provide);
assignHelper('inject', inject);
assignHelper('toRef', toRef);
assignHelper('toRefs', toRefs);
assignHelper('unref', unref);
assignHelper('onMounted', onMounted);
assignHelper('onBeforeUnmount', onBeforeUnmount);
assignHelper('onUnmounted', onUnmounted);
assignHelper('onScopeDispose', onScopeDispose);
assignHelper('useAttrs', useAttrs);
assignHelper('useSlots', useSlots);
assignHelper('markRaw', markRaw);
assignHelper('getCurrentInstance', getCurrentInstance);
assignHelper('h', h);

// VueUse helpers used widely across the embedded UI libraries.
assignHelper('eagerComputed', eagerComputed);
assignHelper('templateRef', templateRef);
assignHelper('unrefElement', unrefElement);
assignHelper('useToggle', useToggle);
assignHelper('watchOnce', watchOnce);
assignHelper('useFocus', useFocus);
assignHelper('useResizeObserver', useResizeObserver);
assignHelper('whenever', whenever);
