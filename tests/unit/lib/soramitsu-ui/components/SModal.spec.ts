import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import SModal from '@/lib/soramitsu-ui/components/Modal/SModal.vue';

const Host = defineComponent({
  components: { SModal },
  setup() {
    const show = ref(true);
    return { show };
  },
  template: `
    <SModal v-model:show="show" :teleport-to="null" :eager="true" :focus-trap="false">
      <button type="button">content</button>
    </SModal>
  `,
});

const HostWithoutOutsideClose = defineComponent({
  components: { SModal },
  setup() {
    const show = ref(true);
    return { show };
  },
  template: `
    <SModal
      v-model:show="show"
      :teleport-to="null"
      :eager="true"
      :focus-trap="false"
      :close-on-overlay-click="false"
    >
      <button type="button">content</button>
    </SModal>
  `,
});

const HostWithComponentAttrs = defineComponent({
  components: { SModal },
  setup() {
    const show = ref(true);
    return { show };
  },
  template: `
    <SModal v-model:show="show" class="legacy-modal" :teleport-to="null" :eager="true" :focus-trap="false">
      <button type="button">content</button>
    </SModal>
  `,
});

describe('SModal', () => {
  it('updates the root open-state marker with show model changes', async () => {
    const wrapper = mount(Host);

    const root = wrapper.get('[data-testid="root"]');
    expect(root.attributes('data-open')).toBe('true');

    wrapper.vm.show = false;
    await nextTick();
    expect(root.attributes('data-open')).toBe('false');

    wrapper.vm.show = true;
    await nextTick();
    expect(root.attributes('data-open')).toBe('true');

    wrapper.unmount();
  });

  it('closes when the overlay is clicked', async () => {
    const wrapper = mount(Host);

    await wrapper.get('[data-testid="overlay"]').trigger('click');
    await nextTick();

    expect(wrapper.vm.show).toBe(false);

    wrapper.unmount();
  });

  it('closes when modal root is clicked directly but not when clicking modal content', async () => {
    const wrapper = mount(Host);

    await wrapper.get('[data-testid="modal"]').trigger('click');
    await nextTick();
    expect(wrapper.vm.show).toBe(false);

    wrapper.vm.show = true;
    await nextTick();
    await wrapper.get('button[type="button"]').trigger('click');
    await nextTick();
    expect(wrapper.vm.show).toBe(true);

    wrapper.unmount();
  });

  it('does not close on modal root click when outside close is disabled', async () => {
    const wrapper = mount(HostWithoutOutsideClose);

    await wrapper.get('[data-testid="modal"]').trigger('click');
    await nextTick();

    expect(wrapper.vm.show).toBe(true);

    wrapper.unmount();
  });

  it('does not warn about extraneous attrs when used through a teleport root', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const wrapper = mount(HostWithComponentAttrs);

    expect(warnSpy.mock.calls.some(([message]) => String(message).includes('Extraneous non-props attributes'))).toBe(
      false
    );

    warnSpy.mockRestore();
    wrapper.unmount();
  });
});
