import Vue from 'vue';
import ComponentDecorator, { createDecorator, mixins } from 'vue-class-component';
import { Prop } from 'vue-property-decorator/lib/decorators/Prop';

const OptionsDecorator = ComponentDecorator;

export { mixins, Vue, OptionsDecorator as Options, OptionsDecorator as Component, createDecorator };
export { Emit } from 'vue-property-decorator/lib/decorators/Emit';
export { Inject } from 'vue-property-decorator/lib/decorators/Inject';
export { Model } from 'vue-property-decorator/lib/decorators/Model';
export { Prop } from 'vue-property-decorator/lib/decorators/Prop';
export { Provide } from 'vue-property-decorator/lib/decorators/Provide';
export { Ref } from 'vue-property-decorator/lib/decorators/Ref';
export { Watch } from 'vue-property-decorator/lib/decorators/Watch';

export const Mixins = mixins;
export default Vue;

export function ModelSync(propName: string, event?: string, options: Record<string, unknown> = {}) {
  return (target: any, key: string) => {
    Prop(options)(target, propName);

    createDecorator((componentOptions, propertyKey) => {
      const computed = componentOptions.computed || (componentOptions.computed = {});
      computed[propertyKey] = {
        get() {
          return (this as any)[propName];
        },
        set(value: unknown) {
          (this as any).$emit(event || `update:${propName}`, value);
        },
      };
    })(target, key);
  };
}

export function PropSync(propName: string, options: Record<string, unknown> = {}) {
  return (target: any, key: string) => {
    Prop(options)(target, propName);

    createDecorator((componentOptions, propertyKey) => {
      const computed = componentOptions.computed || (componentOptions.computed = {});
      computed[propertyKey] = {
        get() {
          return (this as any)[propName];
        },
        set(value: unknown) {
          (this as any).$emit(`update:${propName}`, value);
        },
      };
    })(target, key);
  };
}
