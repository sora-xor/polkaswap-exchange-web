import { describe, expect, it, vi } from 'vitest';

import ExtensionListStep from '@/lib/soraneo-wallet/src/components/Connection/Step/ExtensionList.vue';

describe('Wallet ExtensionListStep', () => {
  it('re-emits wallet selection and disconnection events', () => {
    const emit = vi.fn();
    const wallet = { extensionName: 'sora' };

    (ExtensionListStep as any).methods.handleSelectWallet.call({ $emit: emit }, wallet);
    (ExtensionListStep as any).methods.handleDisconnectWallet.call({ $emit: emit }, wallet);

    expect(emit).toHaveBeenNthCalledWith(1, 'select', wallet);
    expect(emit).toHaveBeenNthCalledWith(2, 'disconnect', wallet);
  });
});
