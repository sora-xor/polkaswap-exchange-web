import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Guidance from '@/components/pages/SoraCard/steps/Guidance.vue';

const dispatchMocks = vi.hoisted(() => ({
  getUserKycAttempt: vi.fn(async () => undefined),
}));

const stateMocks = vi.hoisted(() => ({
  fees: { retry: '12.34' },
  attemptCounter: { totalFreeAttempts: '5' },
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      soraCard: stateMocks,
    },
    dispatch: {
      soraCard: dispatchMocks,
    },
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`,
  }),
}));

const mountComponent = () =>
  mount(Guidance, {
    global: {
      directives: {
        loading: () => undefined,
      },
      stubs: {
        's-button': { template: '<button class="s-button" @click="$emit(\'click\')"><slot /></button>' },
        's-icon': { template: '<i />' },
      },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  stateMocks.fees.retry = '12.34';
  stateMocks.attemptCounter.totalFreeAttempts = '5';
});

describe('Guidance.vue', () => {
  it('formats retry fee using SDK delimiter', async () => {
    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as unknown as { retryFee: string }).retryFee).toBe('12.34');
    expect(dispatchMocks.getUserKycAttempt).toHaveBeenCalled();
  });

  it('emits confirm event', async () => {
    const wrapper = mountComponent();
    (wrapper.vm as unknown as { handleConfirm: () => void }).handleConfirm();

    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('falls back to default total when attempts missing', () => {
    stateMocks.attemptCounter.totalFreeAttempts = '' as never;
    const wrapper = mountComponent();

    expect((wrapper.vm as unknown as { total: string }).total).toBe('4');
  });
});
