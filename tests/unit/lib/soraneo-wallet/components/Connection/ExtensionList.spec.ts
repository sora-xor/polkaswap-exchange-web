import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import ExtensionListStep from '@/lib/soraneo-wallet/src/components/Connection/Step/ExtensionList.vue';

describe('Wallet ExtensionListStep', () => {
  it('re-emits wallet selection and disconnection events', () => {
    const emit = vi.fn();
    const wallet = { extensionName: 'sora' };
    const state = (ExtensionListStep as any).setup({}, { attrs: {}, emit, expose: vi.fn(), slots: {} });

    state.handleSelectWallet(wallet);
    state.handleDisconnectWallet(wallet);

    expect(emit).toHaveBeenNthCalledWith(1, 'select', wallet);
    expect(emit).toHaveBeenNthCalledWith(2, 'disconnect', wallet);
  });
});
