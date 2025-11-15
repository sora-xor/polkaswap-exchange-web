import type { MountingOptions } from '@vue/test-utils';
import type { Component } from 'vue';
import type { Store } from 'vuex';
type BaseMountOptions<T> = MountingOptions<T> & {
  store?: Store<T>;
  stubs?: Record<string, any>;
};
export declare const useDescribe: (name: string, _component: Component, fn: () => void) => Mocha.Suite;
export declare const useMount: <T = unknown>(
  component: Component,
  options?: BaseMountOptions<T>
) => import('@vue/test-utils').VueWrapper<any, any>;
export declare const useShallowMount: <T = unknown>(
  component: Component,
  options?: BaseMountOptions<T>
) => import('@vue/test-utils').VueWrapper<any, any>;
export declare const useVuex: (submodules?: {}) => Store<unknown>;
export {};
