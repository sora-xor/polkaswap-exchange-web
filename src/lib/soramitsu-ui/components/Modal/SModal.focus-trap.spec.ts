import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref, shallowRef } from 'vue';
import SModal from './SModal.vue';
import type { FocusTrap } from 'focus-trap';
import { useFocusTrap } from '@soramitsu-ui/ui/composables/focus-trap';

vi.mock('@soramitsu-ui/ui/composables/focus-trap', () => ({
  useFocusTrap: vi.fn(),
}));

const useFocusTrapMock = vi.mocked(useFocusTrap);

const TestHost = defineComponent({
  components: { SModal },
  setup() {
    const show = ref(false);

    function open() {
      show.value = true;
    }

    return {
      show,
      open,
    };
  },
  template: `
    <SModal v-model:show="show" :teleport-to="null">
      <div />
    </SModal>
  `,
});

describe('SModal focus trap warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs a warning and deactivates focus trap when activation fails', async () => {
    let trap!: FocusTrap;

    const focusTrapError = new Error('focus trap activation failed');
    const activate = vi.fn(() => {
      throw focusTrapError;
    });
    const deactivate = vi.fn(() => trap);
    const pause = vi.fn(() => trap);
    const unpause = vi.fn(() => trap);
    const update = vi.fn(() => trap);

    trap = {
      active: false,
      paused: false,
      activate: activate as FocusTrap['activate'],
      deactivate: deactivate as FocusTrap['deactivate'],
      pause: pause as FocusTrap['pause'],
      unpause: unpause as FocusTrap['unpause'],
      updateContainerElements: update as FocusTrap['updateContainerElements'],
    };

    useFocusTrapMock.mockReturnValueOnce({
      trap: shallowRef(trap),
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const wrapper = mount(TestHost);
    const host = wrapper.vm as unknown as { open: () => void };

    host.open();
    await nextTick();
    await nextTick();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('[SModal] focus-trap activation is failed');
    expect(warnSpy.mock.calls[0][0]).toContain(
      'Tip: you can disable focus-trap completely by setting `focus-trap` prop to `false`'
    );
    expect(warnSpy.mock.calls[0][1]).toBe(focusTrapError);
    expect(deactivate).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    wrapper.unmount();
  });
});
