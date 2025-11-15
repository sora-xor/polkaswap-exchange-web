import { defineComponent } from 'vue';

type ComponentOptions = Parameters<typeof defineComponent>[0];

type ClassComponent<T extends ComponentOptions> = new (...args: any[]) => any;

export class Vue {}

export function Component<T extends ComponentOptions = ComponentOptions>(options?: T) {
  return function <C extends ClassComponent<T>>(_target: C): void {
    // no-op decorator for compat-free build
  };
}

(Component as unknown as { registerHooks: (hooks: string[]) => void }).registerHooks = function registerHooks(): void {
  // noop hook registration
};

(Vue as unknown as { registerHooks: (hooks: string[]) => void }).registerHooks = function registerHooks(): void {
  // noop hook registration for default export parity
};

export default Component;

export function createDecorator() {
  return function () {
    // noop in compat-free mode
  };
}

export { Vue as VueClass };
