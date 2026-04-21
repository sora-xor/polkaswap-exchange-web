import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const allowanceMock = vi.fn();
const gasPriceMock = vi.fn();
const isNativeTokenMock = vi.fn();

vi.mock('@sora-substrate/sdk', () => {
  class MockFPNumber {
    static DEFAULT_PRECISION = 18;

    value: number;
    precision: number;

    constructor(value: number | string, precision = MockFPNumber.DEFAULT_PRECISION) {
      this.value = Number(value);
      this.precision = precision;
    }

    static fromCodecValue(value: string, decimals = MockFPNumber.DEFAULT_PRECISION) {
      const divisor = 10 ** decimals;
      return new MockFPNumber(Number(value) / divisor, decimals);
    }

    static isLessThan(a: MockFPNumber, b: MockFPNumber): boolean {
      return a.value < b.value;
    }

    sub(other: MockFPNumber): MockFPNumber {
      return new MockFPNumber(this.value - other.value, this.precision);
    }

    div(other: MockFPNumber): MockFPNumber {
      return new MockFPNumber(this.value / other.value, this.precision);
    }

    mul(other: MockFPNumber): MockFPNumber {
      return new MockFPNumber(this.value * other.value, this.precision);
    }

    toString(): string {
      return this.value.toString();
    }
  }

  class MockStorage {
    constructor(_: string) {}
    set() {}
    get() {
      return null;
    }
    remove() {}
  }

  return {
    FPNumber: MockFPNumber,
    Storage: MockStorage,
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
  };
});
vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeTxStatus: { Ready: 'Ready', Pending: 'Pending', Failed: 'Failed' },
  BridgeNetworkType: { Eth: 'Eth', Evm: 'Evm', Sub: 'Sub' },
  BridgeTxDirection: { Outgoing: 'Outgoing', Incoming: 'Incoming' },
  EthCurrencyType: { TokenAddress: 'tokenAddress' },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/eth/consts', () => ({
  EthAssetKind: { SidechainOwned: 'SidechainOwned', Thischain: 'Thischain', Sidechain: 'Sidechain' },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/evm/consts', () => ({ EvmNetworkId: { EthereumMainnet: 1 } }));
vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = createWalletMock();

  return withWalletMock(wallet, {
    WALLET_CONSTS: {
      ...wallet.WALLET_CONSTS,
      ETH_BRIDGE_STATES: {
        ...(wallet.WALLET_CONSTS?.ETH_BRIDGE_STATES ?? {}),
        INITIAL: 0,
      },
    },
  });
});
vi.mock('@/utils/bridge/eth/api', () => ({ ethBridgeApi: {} }));
vi.mock('@/utils', () => ({ asZeroValue: (value: string) => Number(value) === 0 }));
vi.mock('@/utils/ethers-util', () => ({
  default: {
    getAllowance: allowanceMock,
    getEvmGasPrice: gasPriceMock,
    isNativeEvmTokenAddress: isNativeTokenMock,
    calcEvmFee: (price: bigint, limit: bigint) => (price * limit).toString(),
  },
}));

let ethUtils: typeof import('@/utils/bridge/eth/utils');
let EthAssetKind: typeof import('@sora-substrate/sdk/build/bridgeProxy/eth/consts').EthAssetKind;

beforeAll(async () => {
  ethUtils = await import('@/utils/bridge/eth/utils');
  ({ EthAssetKind } = await import('@sora-substrate/sdk/build/bridgeProxy/eth/consts'));
});

afterEach(() => {
  vi.restoreAllMocks();
  allowanceMock.mockReset();
  gasPriceMock.mockReset();
  isNativeTokenMock.mockReset();
});

describe('getEthNetworkFee edge cases', () => {
  it('uses outgoing gas limit constants and multiplies by gas price', async () => {
    gasPriceMock.mockResolvedValue(100n);

    const result = await ethUtils.getEthNetworkFee(
      {
        externalAddress: '0x123',
        externalDecimals: 18,
      } as any,
      EthAssetKind.SidechainOwned,
      () => '0xBridge',
      '1',
      true,
      'sora',
      'evm'
    );

    expect(result).toBe((211000n * 100n).toString());
  });

  it('falls back to predefined gas limit when estimation fails for incoming transfer', async () => {
    allowanceMock.mockResolvedValue('0');
    isNativeTokenMock.mockReturnValue(false);
    gasPriceMock.mockResolvedValue(50n);

    const estimateGas = vi.fn().mockRejectedValue(new Error('fail'));
    vi.spyOn(ethUtils, 'getIncomingEvmTransactionData').mockResolvedValue({
      contract: {
        runner: { estimateGas },
        sendERC20ToSidechain: { populateTransaction: vi.fn().mockResolvedValue({}) },
      },
      method: 'sendERC20ToSidechain',
      args: [],
    } as any);

    const result = await ethUtils.getEthNetworkFee(
      {
        externalAddress: '0xabc',
        externalDecimals: 18,
      } as any,
      EthAssetKind.Sidechain,
      () => '0xBridge',
      '1',
      false,
      'sora',
      '0xuser'
    );

    expect(result).toBe(((53000n + 45000n) * 50n).toString());
  });
});
