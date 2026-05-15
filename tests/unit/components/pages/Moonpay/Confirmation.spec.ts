import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MoonpayConfirmation from '@/features/deposit/components/moonpay/Confirmation.vue';

import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import { ETH } from '@sora-substrate/sdk/build/assets/consts';

const hoisted = vi.hoisted(() => {
  const moonpayStore = {
    confirmationVisibility: true,
  };
  const settingsStore = {
    libraryTheme: 'light',
  };
  const bridgeTransactionRef: { value: EthHistory | null } = { value: null };
  const getAssetMock = vi.fn();
  const startBridgeMock = vi.fn();
  const setConfirmationVisibilityMock = vi.fn();

  return {
    moonpayStore,
    settingsStore,
    bridgeTransactionRef,
    getAssetMock,
    startBridgeMock,
    setConfirmationVisibilityMock,
    reset() {
      moonpayStore.confirmationVisibility = true;
      bridgeTransactionRef.value = null;
      getAssetMock.mockReset();
      startBridgeMock.mockReset();
      setConfirmationVisibilityMock.mockReset();
    },
  };
});

const moonpayStoreMock = hoisted.moonpayStore;
const bridgeTransactionRef = hoisted.bridgeTransactionRef;
const getAssetMock = hoisted.getAssetMock;
const startBridgeMock = hoisted.startBridgeMock;
const setConfirmationVisibilityMock = hoisted.setConfirmationVisibilityMock;

vi.mock('@/stores/moonpay', () => ({
  useMoonpayStore: () => hoisted.moonpayStore,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => hoisted.settingsStore,
}));

vi.mock('@/components/shared/Dialog/ConfirmBridgeTransaction.vue', () => ({
  default: {
    name: 'ConfirmBridgeTransactionDialogStub',
    props: {
      visible: {
        type: Boolean,
        default: false,
      },
      confirmButtonText: {
        type: String,
        default: '',
      },
      isSoraToEvm: {
        type: Boolean,
        default: false,
      },
      amount: String,
      amount2: String,
      asset: Object,
      nativeAsset: Object,
      network: String,
      networkType: String,
      externalNetworkFee: String,
      soraNetworkFee: String,
    },
    emits: ['update:visible', 'confirm'],
    template: `
      <div class="confirm-bridge-dialog-stub">
        <button class="emit-confirm" @click="$emit('confirm')" />
        <button class="emit-visible" @click="$emit('update:visible', false)" />
        <slot name="title" />
        <slot name="content-title" />
      </div>
    `,
  },
}));

vi.mock('@/composables/useMoonpayBridge', () => ({
  useMoonpayBridge: () => ({
    bridgeTransactionData: hoisted.bridgeTransactionRef,
    getAsset: hoisted.getAssetMock,
    startBridgeForMoonpayTransaction: hoisted.startBridgeMock,
    setConfirmationVisibility: hoisted.setConfirmationVisibilityMock,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/shared/Logo/Moonpay.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'MoonpayLogoStub',
    template: '<div class="moonpay-logo-stub" />',
  },
}));

const assetData = {
  address: '0x-asset',
  symbol: 'TKN',
};
const nativeAssetData = {
  address: ETH.address,
  symbol: 'ETH',
};

const createWrapper = () =>
  mount(MoonpayConfirmation, {
    attrs: {},
  });

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.reset();
  moonpayStoreMock.confirmationVisibility = true;
  bridgeTransactionRef.value = {
    type: 'EthBridgeIncoming',
    amount: '10',
    amount2: '10',
    assetAddress: assetData.address,
    externalNetwork: 'Ethereum',
    externalNetworkType: 'eth',
    externalNetworkFee: '5',
    soraNetworkFee: '3',
    payload: {
      moonpayId: 'tx-1',
    },
  } as unknown as EthHistory;

  getAssetMock.mockImplementation((address: string) => {
    if (address === assetData.address) return assetData;
    if (address === ETH.address) return nativeAssetData;
    return null;
  });
  startBridgeMock.mockResolvedValue(undefined);
});

describe('MoonpayConfirmation.vue', () => {
  it('derives modal data from bridge transaction state', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as unknown as {
      modalData: Record<string, unknown>;
    };

    expect(vm.modalData).toMatchObject({
      isSoraToEvm: false,
      amount: '10',
      amount2: '10',
      network: 'Ethereum',
      externalNetworkFee: '5',
      soraNetworkFee: '3',
    });
    expect(vm.modalData.asset).toBe(assetData);
    expect(vm.modalData.nativeAsset).toBe(nativeAssetData);
    expect(getAssetMock).toHaveBeenCalledWith(assetData.address);
    expect(getAssetMock).toHaveBeenCalledWith(ETH.address);
  });

  it('starts bridge transfer and emits confirm event', async () => {
    const wrapper = createWrapper();

    await (wrapper.vm as unknown as { handleConfirm: () => Promise<void> }).handleConfirm();

    expect(startBridgeMock).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('updates visibility via Moonpay bridge composable', () => {
    const wrapper = createWrapper();

    (wrapper.vm as unknown as { visibility: boolean }).visibility = false;

    expect(setConfirmationVisibilityMock).toHaveBeenCalledWith(false);
  });
});
