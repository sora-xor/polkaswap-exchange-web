import type { ComponentOptions } from 'vue';
import * as decorators from 'vue-property-decorator/lib/index';

export const Component = (options: ComponentOptions = {}) => decorators.Options(options);

if (typeof (Component as { registerHooks?: (hooks: string[]) => void }).registerHooks !== 'function') {
  (Component as { registerHooks?: (hooks: string[]) => void }).registerHooks = (hooks: string[]) => {
    decorators.Vue.registerHooks?.(hooks);
  };
}

export * from 'vue-property-decorator/lib/index';
export default decorators.Vue;
