import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidatorsListMode } from '@/modules/staking/sora/consts';

let setValidatorsTypeMock: ReturnType<typeof vi.fn>;
let routerPushMock: ReturnType<typeof vi.fn>;
let loadingRef: ReturnType<typeof ref<boolean>>;

vi.mock('vue-i18n', () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
  createI18n: () => ({
    global: {
      t: (key: string) => key,
      te: () => false,
      tm: () => ({}),
      locale: { value: 'en' },
    },
  }),
}));

vi.mock('vue-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/modules/staking/sora/components/StakingHeader.vue', () => ({
  __esModule: true,
  default: {
    name: 'StakingHeaderStub',
    props: {
      previousPage: { type: String, default: '' },
    },
    template: '<header class="staking-header-stub"><slot /></header>',
  },
}));

vi.mock('@/modules/staking/sora/components/ValidatorsAttentionDialog.vue', () => ({
  __esModule: true,
  default: {
    name: 'ValidatorsAttentionDialogStub',
    props: {
      visible: { type: Boolean, default: false },
      parentLoading: { type: Boolean, default: false },
    },
    emits: ['update:visible', 'proceed'],
    template:
      '<div class="validators-dialog-stub" :data-visible="String(visible)" :data-parent-loading="String(parentLoading)" @click="$emit(\'proceed\')">dialog</div>',
  },
}));

vi.mock('@/modules/staking/sora/components/SelectValidatorsMode.vue', () => ({
  __esModule: true,
  default: {
    name: 'SelectValidatorsModeStub',
    emits: ['recommended', 'selected'],
    template: `
      <div class="validators-mode-stub">
        <button class="recommended-button" @click="$emit('recommended')">recommended</button>
        <button class="selected-button" @click="$emit('selected')">selected</button>
      </div>
    `,
  },
}));

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    setValidatorsType: (mode: ValidatorsListMode) => setValidatorsTypeMock(mode),
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  __esModule: true,
  useLoading: () => ({
    loading: loadingRef,
  }),
}));

import ValidatorsType from '@/features/staking/pages/SoraValidatorsTypePage.vue';

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(ValidatorsType, {
    props,
  });

describe('ValidatorsType.vue', () => {
  beforeEach(() => {
    setValidatorsTypeMock = vi.fn();
    routerPushMock = vi.fn();
    loadingRef = ref(false);
  });

  it('opens dialog with recommended validators and sets mode', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.findComponent({ name: 'SelectValidatorsModeStub' }).vm.$emit('recommended');
    await flushPromises();

    expect(setValidatorsTypeMock).toHaveBeenCalledWith(ValidatorsListMode.RECOMMENDED);
    expect((wrapper.vm as unknown as { showValidatorsAttentionDialog: boolean }).showValidatorsAttentionDialog).toBe(
      true
    );
  });

  it('opens dialog with manual selection and sets mode', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.findComponent({ name: 'SelectValidatorsModeStub' }).vm.$emit('selected');
    await flushPromises();

    expect(setValidatorsTypeMock).toHaveBeenCalledWith(ValidatorsListMode.SELECT);
    expect((wrapper.vm as unknown as { showValidatorsAttentionDialog: boolean }).showValidatorsAttentionDialog).toBe(
      true
    );
  });

  it('navigates to select validators on proceed and uses parent loading flag', async () => {
    const wrapper = mountComponent({ parentLoading: true });
    await flushPromises();

    await wrapper.findComponent({ name: 'SelectValidatorsModeStub' }).vm.$emit('recommended');
    await flushPromises();

    const dialog = wrapper.find('.validators-dialog-stub');
    expect(dialog.attributes('data-parent-loading')).toBe('true');

    await wrapper.findComponent({ name: 'ValidatorsAttentionDialogStub' }).vm.$emit('proceed');
    await flushPromises();

    expect(routerPushMock).toHaveBeenCalledWith({ name: 'SelectValidators' });
    expect((wrapper.vm as unknown as { showValidatorsAttentionDialog: boolean }).showValidatorsAttentionDialog).toBe(
      false
    );
  });
});
