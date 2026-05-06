import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { mountSetup } from '@stubs/mountSetup';

const resetTxDetailsId = vi.hoisted(() => vi.fn());
const handleAccountAction = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const walletStore = vi.hoisted(() => ({
  permissions: {},
  isMSTAvailable: false,
  isExternal: false,
  isMST: false,
  isMstAddressExist: false,
  selectedTransaction: null as null | { id: string },
  account: { address: 'sender' },
  navigate,
  resetTxDetailsId,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStore,
}));

vi.mock('@/platform/wallet/navigation', () => ({
  getWalletCurrentParams: () => ({}),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useAccountActions', () => ({
  useAccountActions: () => ({
    loading: ref(false),
    accountRenameVisibility: ref(false),
    accountExportVisibility: ref(false),
    accountDeleteVisibility: ref(false),
    handleAccountAction,
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
import { AccountActionTypes, WalletTabs } from '@/lib/soraneo-wallet/src/consts';
import walletSource from '@/lib/soraneo-wallet/src/components/Wallet.vue?raw';

describe('Wallet Wallet', () => {
  it('resolves the selected wallet tab to a Vue component instead of a raw string tag', () => {
    const { state } = mountSetup(Wallet as any, {}, { emit: vi.fn() });

    expect(state.currentTabComponent.value).toMatchObject({ name: 'WalletAssetsStub' });

    state.currentTab.value = WalletTabs.History;

    expect(state.currentTabComponent.value).toMatchObject({ name: 'WalletHistoryStub' });
  });

  it('opens the multisig onboarding when no MST account is available', () => {
    walletStore.isMST = false;
    walletStore.isMstAddressExist = false;
    walletStore.isMSTAvailable = false;
    walletStore.selectedTransaction = null;
    const { state } = mountSetup(Wallet as any, {}, { emit: vi.fn() });

    state.handleMST();

    expect(state.dialogMSTNameChange.value).toBe(false);
    expect(state.mstOnboardingDialog.value).toBe(true);
  });

  it('resets selected transaction details when navigating back from the details view', () => {
    walletStore.selectedTransaction = { id: 'tx-1' };
    const { state } = mountSetup(Wallet as any, {}, { emit: vi.fn() });

    state.handleBack();

    expect(resetTxDetailsId).toHaveBeenCalledTimes(1);
  });

  it('uses the connected-wallet dashboard layout without local icon dimming overrides', () => {
    expect(walletSource).toContain(':class="{ \'wallet-dashboard\': !selectedTransaction }"');
    expect(walletSource).toContain('class="wallet-account-panel"');
    expect(walletSource).toContain('class="wallet-account-actions"');
    expect(walletSource).toContain('class="wallet-tabs"');
    expect(walletSource).not.toContain('opacity: 0.7');
  });

  it('routes account switching through the wallet store navigation boundary', () => {
    navigate.mockClear();
    walletStore.selectedTransaction = null;
    const { state } = mountSetup(Wallet as any, {}, { emit: vi.fn() });

    state.handleSwitchAccount();

    expect(navigate).toHaveBeenCalledWith({ name: 'WalletConnection' });
  });

  it('routes wallet account actions through the connected wallet account', () => {
    handleAccountAction.mockClear();
    walletStore.account = { address: 'sender' };
    const { state } = mountSetup(Wallet as any, {}, { emit: vi.fn() });

    state.handleAccountActionType(AccountActionTypes.Rename);

    expect(handleAccountAction).toHaveBeenCalledWith(AccountActionTypes.Rename, walletStore.account);
  });

  it('renders the active wallet tab panel outside the tab header container', () => {
    expect(walletSource).toMatch(/<\/s-tabs>\s*<component :is="currentTabComponent" @swap="handleSwap"><\/component>/);
  });
});
