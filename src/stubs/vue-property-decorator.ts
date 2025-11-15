const noop = () => undefined;

export function Component(options?: any): ClassDecorator {
  return noop as unknown as ClassDecorator;
}

(Component as unknown as { registerHooks: (hooks: string[]) => void }).registerHooks = function registerHooks(): void {
  // noop hook registration
};

export const Vue = class {};

(Vue as unknown as { registerHooks: (hooks: string[]) => void }).registerHooks = function registerHooks(): void {
  // noop hook registration
};

export const Mixins = (..._args: any[]) => {
  return class extends Vue {};
};

export const Emit = () => noop;
export const Prop = () => noop;
export const Ref = () => noop;
export const Watch = () => noop;
export const Provide = () => noop;
export const Inject = () => noop;
export const Model = () => noop;
export const PropSync = () => noop;
export const ModelSync = () => noop;
export const Options = (_options?: any): ClassDecorator => ((target) => target) as unknown as ClassDecorator;
export const mixins = Mixins;
