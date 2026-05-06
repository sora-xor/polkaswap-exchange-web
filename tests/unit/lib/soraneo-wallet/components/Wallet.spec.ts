import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const resetTxDetailsId = vi.hoisted(() => vi.fn());
const walletStore = vi.hoisted(() => ({
  permissions: {},
  isMSTAvailable: false,
  isExternal: false,
  isMST: false,
  isMstAddressExist: false,
  selectedTransaction: null as null | { id: string },
  account: { address: 'sender' },
  resetTxDetailsId,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStore,
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => ({
    currentParams: {},
    navigate: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useAccountActions', () => ({
  useAccountActions: () => ({
    loading: ref(false),
    account: ref({ address: 'sender' }),
    accountRenameVisibility: ref(false),
    accountExportVisibility: ref(false),
    accountDeleteVisibility: ref(false),
    handleAccountAction: vi.fn(),
    handleAccountRename: vi.fn(),
    handleAccountExport: vi.fn(),
    handleAccountDelete: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useOperations', () => ({
  useOperations: () => ({
    t: (key: string) => key,
    getTitle: vi.fn(() => ''),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useQrCodeParser', () => ({
  useQrCodeParser: () => ({
    parseQrCodeValue: vi.fn(),
    receiveByQrCode: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/WalletAssets.vue', () => ({
  default: { name: 'WalletAssetsStub' },
}));

vi.mock('@/lib/soraneo-wallet/src/components/WalletHistory.vue', () => ({
  default: { name: 'WalletHistoryStub' },
}));

import Wallet from '@/lib/soraneo-wallet/src/components/Wallet.vue';
import { WalletTabs } from '@/lib/soraneo-wallet/src/consts';
import walletSource from '@/lib/soraneo-wallet/src/components/Wallet.vue?raw';

describe('Wallet Wallet', () => {
  it('resolves the selected wallet tab to a Vue component instead of a raw string tag', () => {
    const state = (Wallet as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.currentTabComponent.value).toMatchObject({ name: 'WalletAssetsStub' });

    state.currentTab.value = WalletTabs.History;

    expect(state.currentTabComponent.value).toMatchObject({ name: 'WalletHistoryStub' });
  });

  it('opens the multisig onboarding when no MST account is available', () => {
    walletStore.isMST = false;
    walletStore.isMstAddressExist = false;
    walletStore.isMSTAvailable = false;
    walletStore.selectedTransaction = null;
    const state = (Wallet as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.handleMST();

    expect(state.dialogMSTNameChange.value).toBe(false);
    expect(state.mstOnboardingDialog.value).toBe(true);
  });

  it('resets selected transaction details when navigating back from the details view', () => {
    walletStore.selectedTransaction = { id: 'tx-1' };
    const state = (Wallet as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.handleBack();

    expect(resetTxDetailsId).toHaveBeenCalledTimes(1);
  });

  it('uses the connected-wallet dashboard layout without local icon dimming overrides', () => {
    expect(walletSource).toContain(':class="{ \'wallet-dashboard\': !selectedTransaction }"');
    expect(walletSource).toContain('class="wallet-account-actions"');
    expect(walletSource).toContain('class="wallet-tabs"');
    expect(walletSource).not.toContain('opacity: 0.7');
  });

  it('renders the active wallet tab panel outside the tab header container', () => {
    expect(walletSource).toMatch(/<\/s-tabs>\s*<component :is="currentTabComponent" @swap="handleSwap"><\/component>/);
  });
});
