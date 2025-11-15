import { FPNumber } from '@sora-substrate/math';
import { api as walletApi } from '@wallet';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock soraneo wallet api to control getDenominator (avoid hoisting issues)
vi.mock('@wallet', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = createWalletMock();

  return withWalletMock(wallet, {
    api: {
      ...wallet.api,
      system: {
        ...(wallet.api.system ?? {}),
        getDenominator: vi.fn(),
      },
    },
    accountUtils: wallet.accountUtils ?? {},
    WALLET_TYPES: wallet.WALLET_TYPES ?? {},
  });
});
// Stub heavy SDK subpaths referenced by web3 actions module
vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeNetworkType: { Eth: 'Eth', Evm: 'Evm', Sub: 'Sub' },
  BridgeTxDirection: { Outgoing: 'Outgoing', Incoming: 'Incoming' },
  BridgeTxStatus: { Pending: 'Pending', Ready: 'Ready', Failed: 'Failed' },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/types', () => ({ BridgeNetworkId: {} }));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/consts', () => ({ SubNetworkId: {} }));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/eth/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/evm/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/evm/consts', () => ({
  EvmNetworkId: {
    EthereumMainnet: 1,
    EthereumRopsten: 3,
    EthereumRinkeby: 4,
    EthereumGoerli: 5,
    EthereumKovan: 42,
    EthereumSepolia: 11155111,
    BinanceSmartChainMainnet: 56,
    BinanceSmartChainTestnet: 97,
    EthereumClassicMainnet: 61,
    EthereumClassicTestnetMordor: 63,
    PolygonMainnet: 137,
    PolygonTestnetMumbai: 80001,
    KlaytnTestnetBaobab: 1001,
    KlaytnMainnet: 8217,
    AvalancheMainnet: 43114,
    AvalancheTestnetFuji: 43113,
    ArbitrumMainnet: 42161,
    ArbitrumSepoliaTestnet: 421614,
    FantomMainnet: 250,
    FantomTestnet: 4002,
  },
}));
// Avoid importing app utils that pull element-ui and sdk
vi.mock('@/utils', () => ({}));
vi.mock('@/utils/bridge/sub/classes/adapter', () => ({ SubNetworksConnector: class {} }));
vi.mock('@/utils/connection/evm/providers', () => ({ getProvidersList: () => () => {} }));
vi.mock('@/utils/ethers-util', () => ({ default: {} }));
vi.mock('@/consts/evm', () => ({
  KnownEthBridgeAsset: { Other: 'Other', XOR: 'XOR', VAL: 'VAL' },
  SmartContractType: { EthBridge: 'ETH_BRIDGE', ERC20: 'ERC20' },
  SmartContracts: { ETH_BRIDGE: {}, ERC20: {} },
}));

// Make web3ActionContext act as identity – return provided context
vi.mock('@/store/web3', () => ({
  web3ActionContext: (ctx: any) => ctx,
}));

import actions from '@/store/web3/actions';

describe('web3 actions - fetchDenominatorCoefficient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeCtx = () => ({
    commit: {
      setDenominator: vi.fn(),
    },
  });

  it('stores valid chain denominator', async () => {
    const ctx = makeCtx();
    const getDenominatorMock = vi.mocked(walletApi.system.getDenominator as any);
    getDenominatorMock.mockResolvedValueOnce(new FPNumber('1000000'));

    await (actions as any).fetchDenominatorCoefficient(ctx);

    const calledWith = (ctx.commit.setDenominator as any).mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(FPNumber);
    expect(calledWith.toString()).toBe('1000000');
  });

  it('falls back to 1 when denominator is zero or invalid', async () => {
    const ctx = makeCtx();
    const getDenominatorMock = vi.mocked(walletApi.system.getDenominator as any);
    getDenominatorMock.mockResolvedValueOnce(FPNumber.ZERO);

    await (actions as any).fetchDenominatorCoefficient(ctx);

    const calledWith = (ctx.commit.setDenominator as any).mock.calls[0][0];
    expect(calledWith.eq(FPNumber.ONE)).toBe(true);
  });

  it('falls back to 1 on error', async () => {
    const ctx = makeCtx();
    const getDenominatorMock = vi.mocked(walletApi.system.getDenominator as any);
    getDenominatorMock.mockRejectedValueOnce(new Error('network error'));

    await (actions as any).fetchDenominatorCoefficient(ctx);

    const calledWith = (ctx.commit.setDenominator as any).mock.calls[0][0];
    expect(calledWith.eq(FPNumber.ONE)).toBe(true);
  });
});
