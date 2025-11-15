import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Links } from '@/consts';
import { VerificationStatus } from '@/types/card';
import ConfirmationInfo from '@/components/pages/SoraCard/ConfirmationInfo.vue';

import type { Nullable } from '@/types/common';

const shared = vi.hoisted(() => ({
  ctx: null as Nullable<Awaited<ReturnType<typeof createContext>>>,
}));

async function createContext() {
  const { reactive, computed } = await import('vue');

  const state = reactive({
    settings: {
      language: 'en',
      isWalletLoaded: true,
    },
    soraCard: {
      fees: { retry: '10' },
      attemptCounter: { freeAttemptsLeft: '2', hasFreeAttempts: true },
      rejectReasons: ['<script>alert(1)</script>Invalid'],
    },
  });

  const getters = {
    soraCard: {
      currentStatus: VerificationStatus.Pending as VerificationStatus,
    },
  };

  const dispatch = {
    soraCard: {
      getUserStatus: vi.fn(async () => undefined),
      getUserKycAttempt: vi.fn(async () => undefined),
    },
  };

  const commit = {
    soraCard: {
      setWillToPassKycAgain: vi.fn(),
    },
  };

  const store = {
    state,
    getters,
    dispatch,
    commit,
  };

  const reset = () => {
    state.soraCard.fees.retry = '10';
    state.soraCard.attemptCounter = { freeAttemptsLeft: '2', hasFreeAttempts: true };
    state.soraCard.rejectReasons = ['<script>alert(1)</script>Invalid'];
    getters.soraCard.currentStatus = VerificationStatus.Pending;
    dispatch.soraCard.getUserStatus.mockClear();
    dispatch.soraCard.getUserKycAttempt.mockClear();
    commit.soraCard.setWillToPassKycAgain.mockClear();
  };

  return {
    state,
    store,
    reset,
    computed,
  };
}

async function getContext() {
  if (!shared.ctx) {
    shared.ctx = await createContext();
  }
  return shared.ctx;
}

vi.mock('@/store', async () => {
  const ctx = await getContext();
  return {
    default: ctx.store,
  };
});

const sImageStub = vi.hoisted(() => ({
  name: 'SImageStub',
  props: ['src'],
  template: '<img :src="src" />',
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      SImage: sImageStub,
    },
  });
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'card.statusRejectReasonMultiple') return 'Multiple reasons';
      if (key === 'card.statusRejectReason') return 'Reason';
      if (key === 'card.statusRejectText') return 'Rejected';
      if (key === 'card.statusRejectTitle') return 'RejectedTitle';
      if (key === 'card.statusAcceptTitle') return 'AcceptedTitle';
      if (key === 'card.statusAcceptText') return 'AcceptedText';
      if (key === 'card.statusPendingTitle') return 'PendingTitle';
      if (key === 'card.statusPendingText') return 'PendingText';
      return key.replace('{0}', String(params?.[0] ?? ''));
    },
    tc: (key: string, _count: number, params?: Record<string, unknown>) => `${key}:${String(params?.count ?? 0)}`,
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => {
    const loading = ref(false);
    return {
      loading,
      withApi: async (handler: () => Promise<void> | void) => {
        loading.value = true;
        try {
          await handler();
        } finally {
          loading.value = false;
        }
      },
    };
  },
}));

vi.mock('@/utils/sanitize', () => ({
  escapeHtml: (value: string) => value.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  sanitizeHtml: (value: string) => value,
}));

const mountComponent = (options: { emits?: Record<string, vi.Mock> } = {}) =>
  mount(ConfirmationInfo, {
    global: {
      stubs: {
        's-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        's-icon': { template: '<i />' },
        's-image': { template: '<img />' },
      },
      directives: {
        loading: () => undefined,
      },
    },
    attrs: options.emits ?? {},
  });

beforeEach(async () => {
  const ctx = await getContext();
  ctx.reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ConfirmationInfo.vue', () => {
  it('sanitizes reject reasons and renders safe HTML', async () => {
    const ctx = await getContext();
    ctx.store.getters.soraCard.currentStatus = VerificationStatus.Rejected;

    const wrapper = mountComponent();
    const { nextTick } = await import('vue');
    await nextTick();

    const safeText = (wrapper.vm as unknown as { safeText: string }).safeText;
    expect(safeText).toContain('&lt;script&gt;alert(1)&lt;/script&gt;Invalid');
  });

  it('requests KYC attempt details when status is rejected', async () => {
    const ctx = await getContext();
    ctx.store.getters.soraCard.currentStatus = VerificationStatus.Rejected;

    mountComponent();
    const { nextTick } = await import('vue');
    await nextTick();

    expect(ctx.store.dispatch.soraCard.getUserStatus).toHaveBeenCalled();
    expect(ctx.store.dispatch.soraCard.getUserKycAttempt).toHaveBeenCalled();
  });

  it('emits confirm-apply after requesting retry', async () => {
    const ctx = await getContext();
    ctx.store.getters.soraCard.currentStatus = VerificationStatus.Rejected;
    const wrapper = mountComponent();
    const { nextTick } = await import('vue');
    await nextTick();

    (wrapper.vm as unknown as { handleKycRetry: () => void }).handleKycRetry();

    expect(ctx.store.commit.soraCard.setWillToPassKycAgain).toHaveBeenCalledWith(true);
    expect(wrapper.emitted('confirm-apply')?.[0]).toEqual([true]);
  });

  it('opens support channel on request', async () => {
    type WindowWithOptionalOpen = typeof window & { open?: typeof window.open };
    const win = window as WindowWithOptionalOpen;
    const originalOpen = win.open;
    const openMock = vi.fn();
    Object.defineProperty(win, 'open', {
      configurable: true,
      writable: true,
      value: openMock,
    });

    const wrapper = mountComponent();
    (wrapper.vm as unknown as { openSupportChannel: () => void }).openSupportChannel();

    expect(openMock).toHaveBeenCalledWith(Links.soraCardSupportChannel, '_blank');

    if (originalOpen) {
      Object.defineProperty(win, 'open', {
        configurable: true,
        writable: true,
        value: originalOpen,
      });
    } else {
      delete win.open;
    }
  });
});
