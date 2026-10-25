import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FPNumber } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';

const mocks = vi.hoisted(() => ({
  assets: {
    registeredAssets: {} as Record<string, { address: string; decimals: number; kind: string }>,
    getRegisteredAssets: vi.fn(),
  },
  bridge: { updateForm: vi.fn(), setSendedAmount: vi.fn(), setAssetAddress: vi.fn() },
  web3: {
    networkType: 'Eth',
    networkSelected: 1,
    ethBridgeEvmNetwork: 1,
    ethBridgeContractAddress: { OTHER: '0x313416870A4da6F12505a550B67bB73c8E21D5d3' },
    isValidNetwork: true,
    selectExternalNetwork: vi.fn(),
    $patch: vi.fn(),
  },
  api: {
    connection: {
      api: {
        isConnected: true,
        genesisHash: { toString: () => '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5' },
      },
    },
    system: { getDenominator: vi.fn() },
  },
}));
vi.mock('@/stores/assets', () => ({ useAssetsStore: () => mocks.assets }));
vi.mock('@/stores/bridge', () => ({ useBridgeStore: () => mocks.bridge }));
vi.mock('@/stores/web3', () => ({ useWeb3Store: () => mocks.web3 }));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: mocks.api }));

import {
  TONSWAP_ETHEREUM_FUNDING_ASSETS,
  buildTonswapBridgeFundingRoute,
  parseTonswapBridgeFundingQuery,
  useTonswapBridgeFunding,
} from '@/features/misc/composables/useTonswapBridgeFunding';

describe('Tonswap Ethereum bridge preparation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assets.registeredAssets = Object.fromEntries(
      Object.values(TONSWAP_ETHEREUM_FUNDING_ASSETS).map((asset) => [
        asset.assetAddress,
        { address: asset.externalAddress, decimals: asset.externalDecimals, kind: asset.kind },
      ])
    );
    mocks.assets.getRegisteredAssets.mockReset();
    mocks.assets.getRegisteredAssets.mockResolvedValue(undefined);
    mocks.web3.networkType = BridgeNetworkType.Eth;
    mocks.web3.networkSelected = 1;
    mocks.web3.ethBridgeEvmNetwork = 1;
    mocks.web3.isValidNetwork = true;
    mocks.api.connection.api.isConnected = true;
    mocks.web3.selectExternalNetwork.mockImplementation(async ({ id, type }) => {
      mocks.web3.networkSelected = id;
      mocks.web3.networkType = type;
    });
    mocks.api.system.getDenominator.mockReset();
    mocks.api.system.getDenominator.mockResolvedValue(new FPNumber('100000000000000000000000000000000000000'));
  });
  it('accepts only explicit allowlisted campaign queries and builds static router locations', () => {
    for (const symbol of ['XOR', 'DAI', 'ETH', 'USDT'] as const) {
      const route = buildTonswapBridgeFundingRoute(symbol);
      expect(route.path).toBe('/bridge');
      expect(parseTonswapBridgeFundingQuery(route.query)).toBe(symbol);
    }
    for (const query of [
      {},
      { campaign: 'tonswap', getTs: '1', asset: 'USDC' },
      { campaign: 'tonswap', getTs: '1', asset: ['DAI'] },
      { campaign: 'tonswap', getTs: '1', asset: '__proto__' },
      { campaign: 'other', getTs: '1', asset: 'DAI' },
      { campaign: 'tonswap', getTs: true, asset: 'DAI' },
    ])
      expect(parseTonswapBridgeFundingQuery(query)).toBeNull();
  });
  it('selects Ethereum and freshly validates registration before populating an incoming DAI form', async () => {
    mocks.web3.networkType = 'Sub';
    mocks.web3.networkSelected = 42;
    const funding = useTonswapBridgeFunding();
    const result = await funding.prepareEthereumFunding('DAI');
    expect(mocks.web3.selectExternalNetwork).toHaveBeenCalledWith({ id: 1, type: BridgeNetworkType.Eth });
    expect(mocks.assets.getRegisteredAssets).toHaveBeenCalledOnce();
    expect(mocks.bridge.updateForm).toHaveBeenCalledWith({ isSoraToEvm: false });
    expect(mocks.bridge.setSendedAmount).toHaveBeenCalledWith();
    expect(mocks.bridge.setAssetAddress).toHaveBeenCalledWith(TONSWAP_ETHEREUM_FUNDING_ASSETS.DAI.assetAddress);
    expect(result).toMatchObject({ symbol: 'DAI', denominator: '1', externalDecimals: 18 });
    expect(funding.status.value).toBe('ready');
    expect(mocks.api.system.getDenominator).not.toHaveBeenCalled();
  });
  it('rejects missing, wrong-contract, wrong-decimal and wrong-kind registrations before changing the form', async () => {
    const address = TONSWAP_ETHEREUM_FUNDING_ASSETS.USDT.assetAddress;
    const original = mocks.assets.registeredAssets[address];
    for (const entry of [
      undefined,
      { ...original, address: '0x0000000000000000000000000000000000000001' },
      { ...original, decimals: 18 },
      { ...original, kind: 'Thischain' },
    ]) {
      mocks.assets.registeredAssets = entry ? { [address]: entry } : {};
      const funding = useTonswapBridgeFunding();
      expect(await funding.prepareEthereumFunding('USDT')).toBeNull();
      expect(funding.error.value).toBe('asset-unavailable');
    }
    expect(mocks.bridge.updateForm).not.toHaveBeenCalled();
  });
  it('prefills only an exact validated DAI draft after asset metadata is ready', async () => {
    const funding = useTonswapBridgeFunding();
    expect(await funding.prepareEthereumFunding('DAI', '1.000000000000000001')).not.toBeNull();
    expect(mocks.bridge.setSendedAmount).toHaveBeenLastCalledWith('1.000000000000000001');
    expect(mocks.bridge.setAssetAddress.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.bridge.setSendedAmount.mock.invocationCallOrder[1]
    );
    for (const amount of ['-1', '1e3', '0', '0.0000000000000000001'])
      expect(await funding.prepareEthereumFunding('DAI', amount)).toBeNull();
    expect(await funding.prepareEthereumFunding('ETH', '1')).toBeNull();
  });
  it('requires the live XOR coefficient and passes it to the existing bridge amount state', async () => {
    const funding = useTonswapBridgeFunding();
    const result = await funding.prepareEthereumFunding('XOR');
    expect(result?.denominator).toBe('100000000000000000000000000000000000000');
    expect(mocks.web3.$patch).toHaveBeenCalledWith({ denominator: expect.any(FPNumber) });
    mocks.api.system.getDenominator.mockResolvedValueOnce(new FPNumber('0'));
    expect(await funding.prepareEthereumFunding('XOR')).toBeNull();
    expect(funding.error.value).toBe('denomination-unavailable');
    mocks.api.system.getDenominator.mockRejectedValueOnce(new Error('offline'));
    expect(await funding.prepareEthereumFunding('XOR')).toBeNull();
    expect(funding.status.value).toBe('unavailable');
  });
  it('fails closed on disconnected SORA, wrong Ethereum config, missing XOR wallet and changed selection', async () => {
    const funding = useTonswapBridgeFunding();
    mocks.api.connection.api.isConnected = false;
    expect(await funding.prepareEthereumFunding('ETH')).toBeNull();
    expect(funding.error.value).toBe('connection-unavailable');
    mocks.api.connection.api.isConnected = true;
    mocks.web3.ethBridgeEvmNetwork = 11155111;
    expect(await funding.prepareEthereumFunding('ETH')).toBeNull();
    expect(funding.error.value).toBe('wrong-network');
    mocks.web3.ethBridgeEvmNetwork = 1;
    mocks.web3.isValidNetwork = false;
    expect(await funding.prepareEthereumFunding('XOR')).toBeNull();
    expect(funding.error.value).toBe('ethereum-wallet-required');
    mocks.assets.getRegisteredAssets.mockImplementationOnce(async () => {
      mocks.web3.networkSelected = 56;
    });
    expect(await funding.prepareEthereumFunding('DAI')).toBeNull();
    expect(funding.error.value).toBe('selection-changed');
    expect(mocks.bridge.updateForm).not.toHaveBeenCalled();
  });
  it('cancels stale work before it can change a user form', async () => {
    let resume!: () => void;
    mocks.assets.getRegisteredAssets.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        })
    );
    const funding = useTonswapBridgeFunding();
    const pending = funding.prepareEthereumFunding('DAI');
    expect(funding.isPreparing.value).toBe(true);
    funding.cancelPreparation();
    resume();
    expect(await pending).toBeNull();
    expect(funding.status.value).toBe('idle');
    expect(mocks.bridge.updateForm).not.toHaveBeenCalled();
  });
  it('parses a generic DAI review and rejects mixed or malformed purchase purposes', () => {
    expect(buildTonswapBridgeFundingRoute('DAI', 'xor')).toEqual({
      path: '/bridge',
      query: { buyXor: '1', asset: 'DAI' },
    });
    expect(parseTonswapBridgeFundingQuery({ buyXor: '1', asset: 'DAI' })).toBe('DAI');
    for (const query of [
      { buyXor: ['1'], asset: 'DAI' },
      { buyXor: '1', getTs: '1', asset: 'DAI' },
      { buyXor: '1', campaign: 'tonswap', asset: 'DAI' },
    ])
      expect(parseTonswapBridgeFundingQuery(query)).toBeNull();
  });
});
