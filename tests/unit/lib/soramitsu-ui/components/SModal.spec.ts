import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

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
});
