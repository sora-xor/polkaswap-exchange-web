import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ValidatorsAttentionDialog from '@/modules/staking/sora/components/ValidatorsAttentionDialog.vue';

const { descriptionMessagesRef } = vi.hoisted(() => ({
  descriptionMessagesRef: {
    value: ['line-1', 'line-2'] as unknown,
  },
}));

const tMock = vi.fn((key: string) => {
  switch (key) {
    case 'soraStaking.validatorsAttentionDialog.title':
      return 'Attention Title';
    case 'soraStaking.validatorsAttentionDialog.confirm':
      return 'Confirm';
    default:
      return key;
  }
});

let routerPushMock: ReturnType<typeof vi.fn>;

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: defineComponent({
        name: 'DialogBaseStub',
        props: {
          visible: { type: Boolean, default: false },
        },
        emits: ['update:visible'],
        setup(props, { slots, emit }) {
          return () =>
            h(
              'div',
              {
                class: 'dialog-base-stub',
                'data-visible': String(props.visible),
                onClick: () => emit('update:visible', !props.visible),
              },
              slots.default?.()
            );
        },
      }),
    },
  });
});

vi.mock('vue-i18n', () => ({
  __esModule: true,
  useI18n: () => ({
    t: tMock,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: tMock,
  }),
}));

vi.mock('@/lang', () => ({
  __esModule: true,
  default: {
    global: {
      locale: {
        value: 'en',
      },
      getLocaleMessage: () => ({
        soraStaking: {
          validatorsAttentionDialog: {
            description: descriptionMessagesRef.value,
          },
        },
      }),
    },
  },
}));

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    push: (...args: unknown[]) => routerPushMock(...args),
  },
  lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
}));

const mountComponent = (
  overrideProps: Partial<{ visible: boolean; parentLoading: boolean; isRecommended: boolean }> = {}
) =>
  mount(ValidatorsAttentionDialog, {
    props: {
      visible: true,
      parentLoading: false,
      isRecommended: true,
      ...overrideProps,
    },
    global: {
      stubs: {
        's-button': {
          template: `<button class="s-button-stub" @click="$emit('click', $event)"><slot /></button>`,
        },
      },
    },
  });

describe('ValidatorsAttentionDialog.vue', () => {
  beforeEach(() => {
    routerPushMock = vi.fn();
    tMock.mockClear();
    descriptionMessagesRef.value = ['line-1', 'line-2'];
  });

  it('renders description lines and confirm button', () => {
    const wrapper = mountComponent();
    const lines = wrapper.findAll('.description p');

    expect(lines).toHaveLength(2);
    expect(lines.at(0)?.text()).toBe('line-1');
    expect(lines.at(1)?.text()).toBe('line-2');
    expect(wrapper.text()).toContain('Confirm');
  });

  it('renders object-based translation payloads in numeric order', () => {
    descriptionMessagesRef.value = {
      1: 'line-2',
      0: 'line-1',
      2: 'line-3',
    };

    const wrapper = mountComponent();
    const lines = wrapper.findAll('.description p');

    expect(lines.map((line) => line.text())).toEqual(['line-1', 'line-2', 'line-3']);
  });

  it('emits proceed and navigates when recommended', async () => {
    const wrapper = mountComponent({ isRecommended: true });

    (wrapper.vm as unknown as { handleConfirm: () => void }).handleConfirm();
    await flushPromises();

    expect(wrapper.emitted('proceed')).toBeTruthy();
    expect(routerPushMock).toHaveBeenCalledWith({ name: 'SelectValidators' });
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);
  });

  it('emits proceed without navigation when not recommended', async () => {
    const wrapper = mountComponent({ isRecommended: false });

    (wrapper.vm as unknown as { handleConfirm: () => void }).handleConfirm();
    await flushPromises();

    expect(wrapper.emitted('proceed')).toBeTruthy();
    expect(routerPushMock).not.toHaveBeenCalled();
  });
});
