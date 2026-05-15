import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui/composables/passive-model', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { computed } = await import('vue');

  return {
    ...actual,
    usePassiveModel: <T>(model: { value: T }) => model,
    usePropTypeFilter:
      <T extends Record<string, unknown>>(props: T) =>
      <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
        computed(() => (values.includes(props[key]) ? props[key] : fallback)),
  };
});

vi.mock('@soramitsu-ui/ui/composables/prop-type-filter', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { computed } = await import('vue');

  return {
    ...actual,
    usePassiveModel: <T>(model: { value: T }) => model,
    usePropTypeFilter:
      <T extends Record<string, unknown>>(props: T) =>
      <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
        computed(() => (values.includes(props[key]) ? props[key] : fallback)),
  };
});

import SRadio from '@/lib/soramitsu-ui/components/Radio/SRadio.vue';
import SRadioGroup from '@/lib/soramitsu-ui/components/Radio/SRadioGroup.vue';

const mountRadioHarness = () =>
  mount(
    defineComponent({
      components: { SRadio, SRadioGroup },
      data: () => ({
        value: 'one',
      }),
      template: `
        <SRadioGroup v-model="value" labelled-by="group-label" described-by="group-description">
          <SRadio value="one">One</SRadio>
          <SRadio value="two" type="bordered-with-description" size="lg">
            Two
            <template #description>Second option</template>
          </SRadio>
          <SRadio value="three" disabled>Three</SRadio>
        </SRadioGroup>
      `,
    }),
    {
      attachTo: document.body,
    }
  );

describe('SRadioGroup', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders radio semantics and checks a clicked radio', async () => {
    const wrapper = mountRadioHarness();
    const group = wrapper.find('[role="radiogroup"]');
    const radios = wrapper.findAll('[role="radio"]');

    expect(group.attributes('aria-labelledby')).toBe('group-label');
    expect(group.attributes('aria-describedby')).toBe('group-description');
    expect(radios).toHaveLength(3);
    expect(radios[0].attributes('aria-checked')).toBe('true');
    expect(radios[0].attributes('tabindex')).toBe('0');
    expect(radios[1].attributes('aria-checked')).toBe('false');
    expect(radios[1].attributes('tabindex')).toBe('-1');
    expect(radios[2].attributes('aria-disabled')).toBe('true');

    await radios[1].trigger('click');
    await nextTick();

    expect((wrapper.vm as unknown as { value: string }).value).toBe('two');
    expect(radios[1].attributes('aria-checked')).toBe('true');
    expect(radios[1].attributes('tabindex')).toBe('0');
  });

  it('moves focus with arrow keys and skips disabled radios', async () => {
    const wrapper = mountRadioHarness();
    const group = wrapper.find('[role="radiogroup"]');
    const radios = wrapper.findAll('[role="radio"]');

    await nextTick();
    await radios[0].trigger('focus');
    await nextTick();
    await group.trigger('keydown', { code: 'ArrowRight' });
    await nextTick();

    expect((wrapper.vm as unknown as { value: string }).value).toBe('two');
    expect(document.activeElement).toBe(radios[1].element);

    await radios[0].trigger('blur');
    await radios[1].trigger('focus');
    await nextTick();
    await group.trigger('keydown', { code: 'ArrowRight' });
    await nextTick();

    expect((wrapper.vm as unknown as { value: string }).value).toBe('one');
    expect(document.activeElement).toBe(radios[0].element);

    await radios[1].trigger('blur');
    await radios[0].trigger('focus');
    await nextTick();
    await group.trigger('keydown', { code: 'ArrowLeft' });
    await nextTick();

    expect((wrapper.vm as unknown as { value: string }).value).toBe('two');
    expect(document.activeElement).toBe(radios[1].element);
  });

  it('checks the focused radio with the Space key', async () => {
    const wrapper = mountRadioHarness();
    const group = wrapper.find('[role="radiogroup"]');
    const radios = wrapper.findAll('[role="radio"]');

    await radios[1].trigger('click');
    await radios[0].trigger('focus');
    await group.trigger('keydown', { code: 'Space' });
    await nextTick();

    expect((wrapper.vm as unknown as { value: string }).value).toBe('one');
  });

  it('uses the legacy label prop as the option value when value is absent', async () => {
    const wrapper = mount(
      defineComponent({
        components: { SRadio, SRadioGroup },
        data: () => ({
          value: 'legacy-one',
        }),
        template: `
          <SRadioGroup v-model="value">
            <SRadio label="legacy-one" size="small">Legacy One</SRadio>
            <SRadio label="legacy-two">Legacy Two</SRadio>
          </SRadioGroup>
        `,
      })
    );
    const radios = wrapper.findAll('[role="radio"]');

    expect(radios[0].attributes('aria-checked')).toBe('true');
    expect(radios[0].attributes('data-size')).toBe('md');

    await radios[1].trigger('click');
    await nextTick();

    expect((wrapper.vm as unknown as { value: string }).value).toBe('legacy-two');
    expect(radios[1].attributes('aria-checked')).toBe('true');
  });
});
