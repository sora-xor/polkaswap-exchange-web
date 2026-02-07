import { FPNumber } from '@sora-substrate/sdk';
import { reactive } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageNames } from '@/consts';
import router from '@/router';
import { useBridgeStore } from '@/stores/bridge';

const walletStoreMock = {
  assetsDataTable: {} as Record<string, RegisteredAssetMock>,
};

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/utils/legacy-store', () => ({
  requireLegacyStore: () => storeStub?.store ?? { getters: { bridge: {}, web3: {} }, state: {} },
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    assetDataByAddress: () =>
      ({
        address: 'xor',
        externalAddress: 'xor-external',
        symbol: 'XOR',
        decimals: 12,
        externalDecimals: 18,
      }) as RegisteredAssetMock,
  }),
}));

type RegisteredAssetMock = {
  address: string;
  externalAddress: string;
  symbol: string;
  decimals: number;
  externalDecimals: number;
};

type StoreStub = {
  state: {
    bridge: {
      isSoraToEvm: boolean;
      externalNativeBalance: string;
      assetLockedBalance: FPNumber;
      assetExternalMinBalance: string;
      outgoingMinLimit: FPNumber;
      outgoingMaxLimit: FPNumber;
      incomingMinLimit: FPNumber;
      soraNetworkFee: string;
      externalTransferFee: string;
    };
    web3: {
      networkSelected: number;
      networkType: number;
    };
    assets: Record<string, unknown>;
  };
  getters: {
    bridge: ReturnType<typeof reactive>;
    web3: ReturnType<typeof reactive>;
    assets: ReturnType<typeof reactive>;
  };
  store: {
    state: StoreStub['state'];
    getters: StoreStub['getters'];
  };
};

const createRegisteredAsset = (overrides: Partial<RegisteredAssetMock> = {}): RegisteredAssetMock => ({
  address: '0xasset',
  externalAddress: '0xasset-external',
  symbol: 'VAL',
  decimals: 12,
  externalDecimals: 18,
  ...overrides,
});

const createStoreStub = (): StoreStub => {
  const state = reactive({
    bridge: {
      isSoraToEvm: true,
      externalNativeBalance: '0',
      assetLockedBalance: new FPNumber(50),
      assetExternalMinBalance: '0',
      outgoingMinLimit: new FPNumber(1),
      outgoingMaxLimit: new FPNumber(40),
      incomingMinLimit: new FPNumber('0.5'),
      soraNetworkFee: '1000000000000',
      externalTransferFee: '2000000000000000000',
    },
    web3: {
      networkSelected: 0,
      networkType: 0,
    },
    assets: {},
  });

  const bridgeGetters = reactive({
    asset: createRegisteredAsset(),
    nativeToken: createRegisteredAsset({
      address: '0xnative',
      symbol: 'XOR',
      externalDecimals: 18,
    }),
    sender: 'soraAddress',
    recipient: 'evmAddress',
    isNativeTokenSelected: false,
    isSidechainAsset: true,
    externalNetworkFee: '300000000000000000',
  });

  const getters = {
    bridge: bridgeGetters,
    web3: reactive({
      isValidNetwork: true,
    }),
    assets: reactive({
      xor: createRegisteredAsset({
        address: 'xor',
        symbol: 'XOR',
        decimals: 12,
        externalDecimals: 18,
      }),
    }),
  };

  return {
    state,
    getters,
    store: {
      state,
      getters,
    },
  };
};

let storeStub: StoreStub;
let useBridgeCore: () => ReturnType<(typeof import('@/composables/useBridgeCore'))['useBridgeCore']>;
let routerPush: ReturnType<typeof vi.spyOn>;
let bridgeStore: ReturnType<typeof useBridgeStore>;

const syncBridgeStore = () => {
  if (!bridgeStore) return;

  bridgeStore.$patch({
    form: {
      ...bridgeStore.form,
      isSoraToEvm: storeStub.state.bridge.isSoraToEvm,
      assetAddress: storeStub.getters.bridge.asset.address,
    },
    balances: {
      ...bridgeStore.balances,
      assetSenderBalance: null,
      assetRecipientBalance: null,
      assetLockedBalance: storeStub.state.bridge.assetLockedBalance,
      assetExternalMinBalance: storeStub.state.bridge.assetExternalMinBalance,
      incomingMinLimit: storeStub.state.bridge.incomingMinLimit,
      outgoingMinLimit: storeStub.state.bridge.outgoingMinLimit,
      outgoingMaxLimit: storeStub.state.bridge.outgoingMaxLimit,
    },
    fees: {
      ...bridgeStore.fees,
      externalNativeBalance: storeStub.state.bridge.externalNativeBalance,
      soraNetworkFee: storeStub.state.bridge.soraNetworkFee,
      externalTransferFee: storeStub.state.bridge.externalTransferFee,
      externalNetworkFee: storeStub.getters.bridge.externalNetworkFee,
    },
  });
};

const resetStore = () => {
  Object.assign(storeStub.state.bridge, {
    isSoraToEvm: true,
    externalNativeBalance: '5000000000000000000',
    assetLockedBalance: new FPNumber(50),
    assetExternalMinBalance: '100000000000000000',
    outgoingMinLimit: new FPNumber(1),
    outgoingMaxLimit: new FPNumber(40),
    incomingMinLimit: new FPNumber('0.5'),
    soraNetworkFee: '1000000000000',
    externalTransferFee: '2000000000000000000',
  });

  Object.assign(storeStub.getters.bridge, {
    asset: createRegisteredAsset(),
    nativeToken: createRegisteredAsset({
      address: '0xnative',
      symbol: 'XOR',
      externalDecimals: 18,
    }),
    sender: 'soraAddress',
    recipient: 'evmAddress',
    isNativeTokenSelected: false,
    isSidechainAsset: true,
    externalNetworkFee: '300000000000000000',
  });

  walletStoreMock.assetsDataTable = {
    [storeStub.getters.bridge.asset.address]: storeStub.getters.bridge.asset as RegisteredAssetMock,
    [storeStub.getters.bridge.nativeToken.address]: storeStub.getters.bridge.nativeToken as RegisteredAssetMock,
  };
  syncBridgeStore();
  routerPush.mockClear();
};

beforeEach(async () => {
  storeStub = createStoreStub();
  vi.doMock('@/store', () => ({
    default: storeStub.store,
  }));
  setActivePinia(createPinia());
  bridgeStore = useBridgeStore();
  const module = await import('@/composables/useBridgeCore');
  useBridgeCore = module.useBridgeCore;
  routerPush = vi.spyOn(router, 'push').mockResolvedValue();
  resetStore();
});

afterEach(() => {
  vi.doUnmock('@/store');
  vi.resetModules();
  routerPush.mockRestore();
  bridgeStore.$reset();
});

describe('useBridgeCore', () => {
  it('exposes bridge state and computed limits', () => {
    const core = useBridgeCore();

    expect(core.isSoraToEvm.value).toBe(true);
    expect(core.asset.value?.symbol).toBe('VAL');
    expect(core.nativeTokenSymbol.value).toBe('XOR');
    expect(core.nativeTokenDecimals.value).toBe(18);

    expect(core.outgoingMaxAmount.value?.toString()).toBe('40');
    expect(core.getTransferMaxAmount(true)?.toString()).toBe('40');

    const expectedMin = core.outgoingMinLimit.value?.add(core.externalTransferFeeFP.value);
    expect(core.outgoingMinAmount.value?.toString()).toBe(expectedMin?.toString());

    expect(core.isGreaterThanTransferMaxAmount('55', core.asset.value, true, true)).toBe(true);
    expect(core.isGreaterThanTransferMaxAmount('10', core.asset.value, true, true)).toBe(false);

    expect(core.isLowerThanTransferMinAmount('0.1', core.asset.value, true, true)).toBe(true);
    expect(core.isLowerThanTransferMinAmount('10', core.asset.value, true, true)).toBe(false);
  });

  it('derives incoming limits for non sidechain assets', () => {
    storeStub.getters.bridge.isSidechainAsset = false;

    const core = useBridgeCore();

    expect(core.incomingMaxAmount.value?.toString()).toBe('50');
    expect(core.getTransferMaxAmount(false)?.toString()).toBe('50');
    expect(core.getTransferMinAmount(false)?.toString()).toBe(storeStub.state.bridge.incomingMinLimit.toString());
  });

  it('calculates transfer bounds using FPNumber conversions to prevent rounding regressions', () => {
    storeStub.state.bridge.outgoingMinLimit = new FPNumber('1.2345');
    storeStub.state.bridge.outgoingMaxLimit = new FPNumber('25.6789');
    storeStub.state.bridge.assetLockedBalance = new FPNumber('20.1234');
    storeStub.state.bridge.externalTransferFee = '450000000000000000'; // 0.45 with 18 decimals
    storeStub.state.bridge.incomingMinLimit = new FPNumber('0.75');

    storeStub.getters.bridge.asset = createRegisteredAsset({
      symbol: 'VAL',
      externalDecimals: 18,
    });
    storeStub.getters.bridge.isSidechainAsset = true;

    syncBridgeStore();

    const core = useBridgeCore();

    const expectedFee = FPNumber.fromCodecValue(storeStub.state.bridge.externalTransferFee, 18);
    expect(core.externalTransferFeeFP.value?.eq(expectedFee)).toBe(true);

    const expectedMin = storeStub.state.bridge.outgoingMinLimit.add(expectedFee);
    expect(core.outgoingMinAmount.value?.eq(expectedMin)).toBe(true);

    const expectedMax = FPNumber.min(
      storeStub.state.bridge.outgoingMaxLimit,
      storeStub.state.bridge.assetLockedBalance
    ) as FPNumber;
    expect(core.outgoingMaxAmount.value?.eq(expectedMax)).toBe(true);

    const aboveMax = expectedMax.add(new FPNumber('0.0001')).toString();
    expect(core.isGreaterThanTransferMaxAmount(aboveMax, core.asset.value, true, true)).toBe(true);
    expect(core.isGreaterThanTransferMaxAmount(expectedMax.toString(), core.asset.value, true, true)).toBe(false);

    const belowMin = expectedMin.sub(new FPNumber('0.0001')).toString();
    expect(core.isLowerThanTransferMinAmount(belowMin, core.asset.value, true, true)).toBe(true);
    expect(core.isLowerThanTransferMinAmount(expectedMin.toString(), core.asset.value, true, true)).toBe(false);

    storeStub.getters.bridge.isSidechainAsset = false;
    const incomingMin = core.getTransferMinAmount(false);
    expect(incomingMin?.eq(storeStub.state.bridge.incomingMinLimit)).toBe(true);
  });

  it('navigates to bridge pages via router', () => {
    const core = useBridgeCore();

    core.handleViewTransactionsHistory();
    expect(routerPush).toHaveBeenCalledWith({ name: PageNames.BridgeTransactionsHistory });

    core.navigateToBridge();
    expect(routerPush).toHaveBeenCalledWith({ name: PageNames.Bridge });
  });
});
