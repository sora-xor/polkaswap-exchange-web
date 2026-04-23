import { mount } from '@vue/test-utils';
import type { PropType } from 'vue';
import { computed, defineComponent, h, nextTick, onUnmounted, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui/composables/passive-model', () => ({
  usePassiveModel: <T>(model: { value: T }) => model,
}));

import SAccordion from '@/lib/soramitsu-ui/components/Accordion/SAccordion.vue';
import { useAccordionApi } from '@/lib/soramitsu-ui/components/Accordion/api';

const AccordionItemProbe = defineComponent({
  name: 'AccordionItemProbe',
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  setup(props, { slots }) {
    const api = useAccordionApi();
    const isActive = ref(false);
    const toggleCount = ref(0);

    const toggle = (expand?: boolean) => {
      toggleCount.value += 1;
      isActive.value = expand ?? !isActive.value;
    };

    const item = computed(() => ({
      name: props.name,
      isActive: isActive.value,
      toggle,
    }));

    api?.register(item);
    onUnmounted(() => {
      api?.unregister(item);
    });

    return () =>
      h(
        'button',
        {
          'data-testid': `accordion-item-${props.name}`,
          'data-active': String(isActive.value),
          'data-toggle-count': String(toggleCount.value),
          onClick: () => toggle(),
        },
        slots.default?.() ?? props.name
      );
  },
});

const AccordionHarness = defineComponent({
  name: 'AccordionHarness',
  props: {
    modelValue: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    items: {
      type: Array as PropType<string[]>,
      default: () => ['one', 'two'],
    },
  },
  setup(props) {
    return () =>
      h(
        SAccordion,
        {
          modelValue: props.modelValue,
          multiple: props.multiple,
        },
        () => props.items.map((name) => h(AccordionItemProbe, { key: name, name }, () => name))
      );
  },
});

const mountAccordion = (props: Record<string, unknown> = {}) =>
  mount(AccordionHarness, {
    props,
  });

const item = (wrapper: ReturnType<typeof mountAccordion>, name: string) =>
  wrapper.get(`[data-testid="accordion-item-${name}"]`);

describe('SAccordion', () => {
  it('opens only the first model-selected item in single-select mode', async () => {
    const wrapper = mountAccordion({
      modelValue: ['one', 'two'],
    });
    await nextTick();

    expect(wrapper.getComponent(SAccordion).classes()).toContain('s-accordion');
    expect(item(wrapper, 'one').attributes('data-active')).toBe('true');
    expect(item(wrapper, 'two').attributes('data-active')).toBe('false');
  });

  it('syncs registered items when modelValue changes', async () => {
    const wrapper = mountAccordion({
      modelValue: ['one'],
    });
    await nextTick();

    await wrapper.setProps({ modelValue: ['two'] });
    await nextTick();

    expect(item(wrapper, 'one').attributes('data-active')).toBe('false');
    expect(item(wrapper, 'two').attributes('data-active')).toBe('true');
  });

  it('closes peer items when a new item is selected in single-select mode', async () => {
    const wrapper = mountAccordion({
      modelValue: ['one'],
    });
    await nextTick();

    await item(wrapper, 'two').trigger('click');
    await nextTick();

    expect(item(wrapper, 'one').attributes('data-active')).toBe('false');
    expect(item(wrapper, 'two').attributes('data-active')).toBe('true');
  });

  it('keeps peer items open when multiple mode is enabled', async () => {
    const wrapper = mountAccordion({
      modelValue: ['one'],
      multiple: true,
    });
    await nextTick();

    await item(wrapper, 'two').trigger('click');
    await nextTick();

    expect(item(wrapper, 'one').attributes('data-active')).toBe('true');
    expect(item(wrapper, 'two').attributes('data-active')).toBe('true');
  });

  it('unregisters removed descendants before later model syncs', async () => {
    const wrapper = mountAccordion({
      modelValue: ['one'],
      items: ['one', 'two'],
    });
    await nextTick();

    await wrapper.setProps({ items: ['two'] });
    await nextTick();
    await wrapper.setProps({ modelValue: ['two'] });
    await nextTick();

    expect(wrapper.find('[data-testid="accordion-item-one"]').exists()).toBe(false);
    expect(item(wrapper, 'two').attributes('data-active')).toBe('true');
  });
});
