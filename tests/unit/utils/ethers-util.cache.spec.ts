import { Contract, JsonRpcProvider, JsonRpcSigner } from 'ethers';
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
import { IPFS_GATEWAY_BASE_URL } from '@/utils/ipfs';

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

  it.each([
    ['ipfs://QmToken/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipfs/QmToken/logo.png`],
    ['https://dweb.link/ipfs/QmToken/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipfs/QmToken/logo.png`],
    ['https://dedicated.example/ipfs/QmToken/logo.png', 'https://dedicated.example/ipfs/QmToken/logo.png'],
  ])('addToken passes the migrated or maintained logo URL to the wallet: %s', async (image, expected) => {
    const request = vi.fn().mockResolvedValue(true);
    ethersUtil.__setTestEthersProvider(testProvider, { request });

    await ethersUtil.addToken('0xToken', 'TOKEN', 18, image);

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: { address: '0xToken', symbol: 'TOKEN', decimals: 18, image: expected },
      },
    });
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

  it('binds ERC20 approval to the selected account after an account switch', async () => {
    const firstAddress = '0x00000000000000000000000000000000000000a1';
    const selectedAddress = '0x00000000000000000000000000000000000000b2';
    const token = '0x00000000000000000000000000000000000000c3';
    const spender = '0x00000000000000000000000000000000000000d4';
    const firstSigner = new JsonRpcSigner(testProvider, firstAddress);
    const selectedSigner = new JsonRpcSigner(testProvider, selectedAddress);
    const abi = ['function approve(address spender,uint256 amount) returns (bool)'];
    ethersUtil.__setContractFactory((address, _, signer) => new Contract(address, abi, signer));
    testProvider.getSigner.mockResolvedValue(firstSigner);
    const first = await ethersUtil.getTokenContract(token);
    testProvider.getSigner.mockResolvedValue(selectedSigner);
    const selected = await ethersUtil.getTokenContract(token);
    expect(selected).not.toBe(first);
    expect(selected.runner).toBe(selectedSigner);
    // Retain ethers' real from-address validation while keeping all RPCs mocked.
    testProvider.estimateGas = vi.fn(async () => 100000n);
    testProvider.getRpcTransaction = JsonRpcProvider.prototype.getRpcTransaction;
    testProvider.send.mockResolvedValueOnce(`0x${'ab'.repeat(32)}`);
    const prepared = await selected.approve.populateTransaction(spender, 100n, { from: selectedAddress, chainId: 1 });
    await expect(selectedSigner.sendUncheckedTransaction(prepared)).resolves.toBe(`0x${'ab'.repeat(32)}`);
    expect(testProvider.send).toHaveBeenLastCalledWith('eth_sendTransaction', [
      expect.objectContaining({
        from: selectedAddress,
        to: token,
        chainId: '0x1',
      }),
    ]);
  });

  it('binds fresh ERC20 contracts to a replacement provider', async () => {
    const firstSigner = { getAddress: vi.fn(async () => 'first') };
    const replacementSigner = { getAddress: vi.fn(async () => 'replacement') };
    testProvider.getSigner.mockResolvedValue(firstSigner);
    const factory = vi.fn((address, _abi, signer) => ({ address, runner: signer }));
    ethersUtil.__setContractFactory(factory as never);
    const first = await ethersUtil.getTokenContract('0xToken');
    ethersUtil.__setTestEthersProvider({ getSigner: async () => replacementSigner } as never);
    const replacement = await ethersUtil.getTokenContract('0xToken');
    expect(replacement).not.toBe(first);
    expect(replacement.runner).toBe(replacementSigner);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('keeps ordinary same-account ERC20 requests available without retaining signer state', async () => {
    const signer = { getAddress: vi.fn(async () => 'account') };
    testProvider.getSigner.mockResolvedValue(signer);
    const factory = vi.fn((address, _abi, currentSigner) => ({ address, runner: currentSigner }));
    ethersUtil.__setContractFactory(factory as never);
    const first = await ethersUtil.getTokenContract('0xToken');
    const second = await ethersUtil.getTokenContract('0xToken');
    expect(first.runner).toBe(signer);
    expect(second.runner).toBe(signer);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('falls back safely when the selected network cache is corrupt', () => {
    localStorage.setItem('dexSettings.evmNetwork', '{');
    expect((ethersUtil as any).getSelectedNetwork()).toBeNull();

    localStorage.setItem('dexSettings.evmNetwork', '[]');
    expect((ethersUtil as any).getSelectedNetwork()).toBeNull();

    localStorage.setItem('dexSettings.evmNetwork', '8453');
    expect((ethersUtil as any).getSelectedNetwork()).toBe(8453);

    localStorage.removeItem('dexSettings.evmNetwork');
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
