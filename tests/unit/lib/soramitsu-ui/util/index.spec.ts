import { mount } from '@vue/test-utils';
import { defineComponent, h, provide, ref, type Component, type FunctionalComponent, type InjectionKey } from 'vue';
import { describe, expect, it } from 'vitest';

import {
  bareMetalVModel,
  forceInject,
  getComponentName,
  isRenderableDynamicComponent,
  isSafeDynamicTagName,
  resolveDynamicComponentTag,
  uniqueElementId,
} from '@/lib/soramitsu-ui/util';

describe('soramitsu-ui util', () => {
  it('creates v-model bindings for default and custom prop names', () => {
    const defaultModel = ref('initial');
    const defaultBindings = bareMetalVModel(defaultModel);

    expect(defaultBindings.modelValue).toBe('initial');
    defaultBindings['onUpdate:modelValue']('updated');
    expect(defaultModel.value).toBe('updated');

    const checkedModel = ref(false);
    const checkedBindings = bareMetalVModel(checkedModel, 'checked');

    expect(checkedBindings.checked).toBe(false);
    checkedBindings['onUpdate:checked'](true);
    expect(checkedModel.value).toBe(true);
  });

  it('resolves provided values and throws when required injection is missing', () => {
    const key = Symbol('required value') as InjectionKey<string>;
    let injectedValue = '';

    const Child = defineComponent({
      setup() {
        injectedValue = forceInject(key);
        return () => h('span', injectedValue);
      },
    });

    const Parent = defineComponent({
      setup() {
        provide(key, 'provided');
        return () => h(Child);
      },
    });

    const wrapper = mount(Parent);

    expect(injectedValue).toBe('provided');
    expect(wrapper.text()).toBe('provided');
    wrapper.unmount();

    const MissingProvider = defineComponent({
      setup() {
        forceInject('missing-key');
        return {};
      },
      render() {
        return null;
      },
    });

    expect(() => mount(MissingProvider)).toThrow('Injection of "missing-key" failed');
  });

  it('reads display names from functional, options, and script-setup style components', () => {
    const Functional = (() => null) as FunctionalComponent & { displayName?: string };
    Functional.displayName = 'FunctionalLabel';

    expect(getComponentName(Functional)).toBe('FunctionalLabel');
    expect(getComponentName(defineComponent({ name: 'NamedComponent' }))).toBe('NamedComponent');
    expect(getComponentName({ __name: 'ScriptSetupComponent' } as Component)).toBe('ScriptSetupComponent');
  });

  it('generates incremental ids globally and app-scoped ids inside component setup', () => {
    const firstFallbackId = uniqueElementId();
    const secondFallbackId = uniqueElementId();
    const firstFallbackCounter = Number(firstFallbackId.replace('soraui-uid-', ''));
    const secondFallbackCounter = Number(secondFallbackId.replace('soraui-uid-', ''));

    expect(secondFallbackCounter).toBe(firstFallbackCounter + 1);

    const appScopedIds: string[] = [];
    const Host = defineComponent({
      setup() {
        appScopedIds.push(uniqueElementId(), uniqueElementId());
        return () => null;
      },
    });

    const firstWrapper = mount(Host);
    firstWrapper.unmount();

    expect(appScopedIds).toEqual(['soraui-uid-0', 'soraui-uid-1']);

    const secondAppIds: string[] = [];
    const SecondHost = defineComponent({
      setup() {
        secondAppIds.push(uniqueElementId());
        return () => null;
      },
    });

    const secondWrapper = mount(SecondHost);
    secondWrapper.unmount();

    expect(secondAppIds).toEqual(['soraui-uid-0']);
  });

  it('guards dynamic component tags before Vue creates DOM elements', () => {
    const ComponentObject = defineComponent({ name: 'DynamicObject' });
    const Functional = (() => null) as FunctionalComponent;

    expect(isSafeDynamicTagName('span')).toBe(true);
    expect(isSafeDynamicTagName('s-tooltip')).toBe(true);
    expect(isSafeDynamicTagName(' div ')).toBe(true);
    expect(isSafeDynamicTagName('0.5')).toBe(false);
    expect(isSafeDynamicTagName('bad tag')).toBe(false);

    expect(resolveDynamicComponentTag('0.5', 'div')).toBe('div');
    expect(resolveDynamicComponentTag('s-tooltip', 'div')).toBe('s-tooltip');
    expect(resolveDynamicComponentTag(' div ', 'span')).toBe('div');
    expect(resolveDynamicComponentTag(ComponentObject, 'div')).toBe(ComponentObject);
    expect(resolveDynamicComponentTag(Functional, 'div')).toBe(Functional);
    expect(resolveDynamicComponentTag(null, 'div')).toBe('div');

    expect(isRenderableDynamicComponent('0.5')).toBe(false);
    expect(isRenderableDynamicComponent('s-tooltip')).toBe(true);
    expect(isRenderableDynamicComponent(ComponentObject)).toBe(true);
    expect(isRenderableDynamicComponent(Functional)).toBe(true);
  });
});
