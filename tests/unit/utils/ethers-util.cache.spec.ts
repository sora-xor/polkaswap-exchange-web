import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { walletOverrides } = vi.hoisted(() => ({
  walletOverrides: {
    WALLET_CONSTS: {
      ETH_BRIDGE_STATES: {
        INITIAL: 0,
      },
    },
    api: {
      assets: {},
    },
    storage: {
      set: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
    },
    settingsStorage: {
      set: vi.fn(),
      get: vi.fn(() => null),
      remove: vi.fn(),
    },
  },
}));

// Mock polkadot util-crypto to avoid environment-specific imports during tests
vi.mock('@polkadot/util-crypto', () => ({
  decodeAddress: (_: string) => new Uint8Array(0),
}));

vi.mock('@sora-substrate/sdk', () => ({
  FPNumber: { DEFAULT_PRECISION: 18, fromCodecValue: (v: string, _d: number) => ({ toString: () => v }) },
  Storage: class Storage {
    namespace?: string;
    constructor(ns?: string) {
      this.namespace = ns;
    }
    set() {}
    get() {
      return null;
    }
    remove() {}
  },
  api: {
    setStorage: vi.fn(),
    shouldPairBeLocked: false,
    initKeyring: vi.fn(),
  },
  connection: {},
  Operation: {
    SwapAndSend: 'SwapAndSend',
    Transfer: 'Transfer',
    VestedTransfer: 'VestedTransfer',
    SwapTransferBatch: 'SwapTransferBatch',
    Mint: 'Mint',
  },
  TransactionStatus: {
    Finalized: 'Finalized',
    Pending: 'Pending',
    Failed: 'Failed',
  },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeNetworkType: { Eth: 'Eth', Evm: 'Evm', Sub: 'Sub' },
  BridgeTxDirection: { Outgoing: 'Outgoing', Incoming: 'Incoming' },
  BridgeTxStatus: { Pending: 'Pending', Ready: 'Ready', Failed: 'Failed' },
}));
vi.mock('@/utils/connection/evm/providers', () => ({ PredefinedProvider: { WalletConnect: 'WalletConnect' } }));
vi.mock('@/consts/evm', () => ({
  SmartContractType: { EthBridge: 'ETH_BRIDGE', ERC20: 'ERC20' },
  SmartContracts: { ETH_BRIDGE: {}, ERC20: [] },
}));
vi.mock('@tests/stubs/walletRuntime', async () => {
  const walletStub = await vi.importActual<typeof import('@tests/stubs/walletRuntime')>('@tests/stubs/walletRuntime');
  return {
    ...walletStub,
    ...walletOverrides,
    default: {
      ...(walletStub as { default?: Record<string, unknown> }).default,
      ...walletOverrides,
    },
  };
});

import ethersUtil from '@/utils/ethers-util';

const testProvider = {
  send: vi.fn(),
  getBalance: vi.fn(),
  getTransaction: vi.fn(),
  waitForTransaction: vi.fn(),
  getTransactionReceipt: vi.fn(),
  getBlockNumber: vi.fn(),
  getBlock: vi.fn(),
  getSigner: vi.fn(),
  getNetwork: vi.fn(async () => ({ chainId: 1 })),
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  testProvider.send.mockReset();
  (ethersUtil as any).__clearTokenContractCache?.();
  (ethersUtil as any).__clearTokenDecimalsCache?.();
  (ethersUtil as any).__setTestEthersProvider(testProvider, testProvider);
  (ethersUtil as any).__setContractFactory?.((address: string) => ({ __address: address }) as any);
});

describe('ethers-util memoization and TTL', () => {
  afterEach(() => {
    vi.useRealTimers();
    (ethersUtil as any).__resetTestEthersProvider?.();
    (ethersUtil as any).__resetContractFactory?.();
    vi.restoreAllMocks();
  });

  it('getEvmGasPrice caches result within TTL', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    testProvider.send.mockResolvedValue('0x3b9aca00'); // 1e9 wei

    const gp1 = await (ethersUtil as any).getEvmGasPrice();
    const initialCalls = testProvider.send.mock.calls.length;
    const gp2 = await (ethersUtil as any).getEvmGasPrice();
    // No additional provider call should be made within TTL
    expect(testProvider.send).toHaveBeenCalledTimes(initialCalls);
    expect(gp2).toBe(gp1);

    // Advance time beyond TTL (5s) to force refresh
    vi.setSystemTime(new Date(6000));
    const gp3 = await (ethersUtil as any).getEvmGasPrice();
    // After TTL, provider should be called at least one more time
    expect(testProvider.send.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(typeof gp3).toBe('bigint');
  });

  it('getTokenContract is memoized per token address', async () => {
    const firstContract = { __address: '0xABCdef' } as any;
    const factoryMock = vi.fn(() => firstContract);
    (ethersUtil as any).__setContractFactory(factoryMock);

    const a1 = await (ethersUtil as any).getTokenContract('0xABCdef');
    expect(a1).toBe(firstContract);

    const throwingFactory = vi.fn(() => {
      throw new Error('factory should not be used for cached contract');
    });
    (ethersUtil as any).__setContractFactory(throwingFactory);

    const a2 = await (ethersUtil as any).getTokenContract('0xabcdef');

    expect(factoryMock).toHaveBeenCalledTimes(1);
    expect(throwingFactory).not.toHaveBeenCalled();
    expect(a2).toBe(a1);
  });

  it('getTokenDecimals is memoized and avoids extra RPCs', async () => {
    const decimalsFn = vi.fn(async () => BigInt(18));
    const contractRef = { decimals: decimalsFn } as any;
    (ethersUtil as any).__setContractFactory(() => contractRef);

    const d1 = await (ethersUtil as any).getTokenDecimals('0xDeCaf');

    (ethersUtil as any).__setContractFactory(() => {
      throw new Error('decimals should be cached');
    });

    const d2 = await (ethersUtil as any).getTokenDecimals('0xdecaf');

    expect(decimalsFn).toHaveBeenCalledTimes(1);
    expect(d1).toBe(18);
    expect(d2).toBe(18);
  });

  it('disconnectEvmProvider swallows synchronous provider disconnect errors', () => {
    const disconnect = vi.fn(() => {
      throw new Error('Please call connect() before enable()');
    });
    const rawProvider = { ...testProvider, disconnect } as any;
    (ethersUtil as any).__setTestEthersProvider(testProvider, rawProvider);

    expect(() => (ethersUtil as any).disconnectEvmProvider()).not.toThrow();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnectEvmProvider swallows async provider disconnect rejections', async () => {
    const disconnect = vi.fn(async () => {
      throw new Error('Please call connect() before enable()');
    });
    const rawProvider = { ...testProvider, disconnect } as any;
    (ethersUtil as any).__setTestEthersProvider(testProvider, rawProvider);

    expect(() => (ethersUtil as any).disconnectEvmProvider()).not.toThrow();
    await Promise.resolve();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
