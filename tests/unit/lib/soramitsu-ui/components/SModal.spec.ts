import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, provide, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SModal from '@/lib/soramitsu-ui/components/Modal/SModal.vue';
import { OVERLAY_TARGET_KEY } from '@/lib/soramitsu-ui/composables/overlayTarget';

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
  afterEach(() => {
    document.body.innerHTML = '';
  });

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

  it('uses a provided overlay target for body-level teleports', async () => {
    const overlayTarget = document.createElement('div');
    document.body.appendChild(overlayTarget);

    const HostWithOverlayTarget = defineComponent({
      components: { SModal },
      setup() {
        const show = ref(true);
        provide(OVERLAY_TARGET_KEY, ref(overlayTarget));
        return { show };
      },
      template: `
        <SModal v-model:show="show" :eager="true" :focus-trap="false">
          <button type="button">content</button>
        </SModal>
      `,
    });

    const wrapper = mount(HostWithOverlayTarget, { attachTo: document.body });
    await nextTick();

    expect(overlayTarget.querySelector('[data-testid="root"]')).not.toBeNull();
    expect(overlayTarget.textContent).toContain('content');

    wrapper.unmount();
  });
});
