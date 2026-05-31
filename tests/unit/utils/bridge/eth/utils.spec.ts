import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ethBridgeApiMock = vi.hoisted(() => ({
  getHistory: vi.fn(),
  saveHistory: vi.fn(),
  subscribeOnRequestStatus: vi.fn(),
  subscribeOnRequest: vi.fn(),
  getRequestStatus: vi.fn(),
  getApprovedRequest: vi.fn(),
  getSoraHashByEthereumHash: vi.fn(),
  getSoraBlockHashByRequestHash: vi.fn(),
}));

const ethersUtilMock = vi.hoisted(() => ({
  accountAddressToHex: vi.fn(),
  calcEvmFee: vi.fn(),
  getAllowance: vi.fn(),
  getContract: vi.fn(),
  getEvmGasPrice: vi.fn(),
  isNativeEvmTokenAddress: vi.fn(),
}));

vi.mock('@sora-substrate/sdk', () => ({
  Operation: {
    EthBridgeIncoming: 'EthBridgeIncoming',
    EthBridgeOutgoing: 'EthBridgeOutgoing',
  },
  FPNumber: class {
    constructor(
      private value: string,
      private decimals: number
    ) {}

    toCodecString() {
      return `${this.value}:codec:${this.decimals}`;
    }
  },
}));

vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeTxStatus: {
    Broken: 'Broken',
    Done: 'Done',
    Failed: 'Failed',
    Frozen: 'Frozen',
    Ready: 'ApprovalsReady',
  },
}));

vi.mock('@sora-substrate/sdk/build/bridgeProxy/eth/consts', () => ({
  EthAssetKind: {
    Sidechain: 'Sidechain',
    SidechainOwned: 'SidechainOwned',
    Thischain: 'Thischain',
  },
  EthCurrencyType: {
    AssetId: 'AssetId',
    TokenAddress: 'TokenAddress',
  },
}));

vi.mock('@/consts/evm', () => ({
  KnownEthBridgeAsset: {
    Other: 'Other',
    VAL: 'VAL',
    XOR: 'XOR',
  },
  SmartContractType: {
    EthBridge: 'EthBridge',
  },
  SmartContracts: {
    EthBridge: {
      Other: [],
      VAL: [],
      XOR: [],
    },
  },
}));

vi.mock('@/utils', () => ({
  asZeroValue: (value: string) => Number(value) === 0,
}));

vi.mock('@/utils/bridge/eth/api', () => ({
  ethBridgeApi: ethBridgeApiMock,
}));

vi.mock('@/utils/ethers-util', () => ({
  default: ethersUtilMock,
}));

import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EthCurrencyType } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';
import {
  getIncomingEvmTransactionData,
  getOutgoingEvmTransactionData,
  getTransaction,
  isOutgoingTx,
  isUnsignedFromPart,
  isUnsignedToPart,
  isUnsignedTx,
  isWaitingForAction,
  updateTransaction,
  waitForApprovedRequest,
  waitForIncomingRequest,
} from '@/utils/bridge/eth/utils';

describe('ETH bridge utils', () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.values(ethBridgeApiMock).forEach((mock) => mock.mockReset());
    Object.values(ethersUtilMock).forEach((mock) => mock.mockReset());
    ethersUtilMock.accountAddressToHex.mockImplementation((address: string) => `hex:${address}`);
    ethersUtilMock.getContract.mockResolvedValue({ contract: 'mock' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createApprovedRequest = (overrides: Record<string, unknown> = {}) =>
    ({
      currencyType: EthCurrencyType.AssetId,
      from: '0xfrom',
      hash: '0xhash',
      r: ['0xr'],
      s: ['0xs'],
      v: [27],
      ...overrides,
    }) as any;

  const createBridgeAsset = (overrides: Record<string, unknown> = {}) =>
    ({
      address: 'sidechain-asset-id',
      externalAddress: '0xToken',
      externalDecimals: 18,
      symbol: 'TOKEN',
      ...overrides,
    }) as any;

  it('detects outgoing Ethereum bridge transactions', () => {
    expect(isOutgoingTx({ type: 'EthBridgeOutgoing' } as any)).toBe(true);
    expect(isOutgoingTx({ type: 'EthBridgeIncoming' } as any)).toBe(false);
  });

  it('detects unsigned source-side transaction parts', () => {
    expect(isUnsignedFromPart({ type: 'EthBridgeOutgoing' } as any)).toBe(true);
    expect(isUnsignedFromPart({ type: 'EthBridgeOutgoing', blockId: '0xblock' } as any)).toBe(false);
    expect(isUnsignedFromPart({ type: 'EthBridgeOutgoing', txId: '0xtx' } as any)).toBe(false);
    expect(isUnsignedFromPart({ type: 'EthBridgeIncoming' } as any)).toBe(true);
    expect(isUnsignedFromPart({ type: 'EthBridgeIncoming', externalHash: '0xexternal' } as any)).toBe(false);
  });

  it('detects unsigned destination-side transaction parts by direction', () => {
    expect(isUnsignedToPart({ type: 'EthBridgeOutgoing' } as any)).toBe(true);
    expect(isUnsignedToPart({ type: 'EthBridgeOutgoing', externalHash: '0xexternal' } as any)).toBe(false);
    expect(isUnsignedToPart({ type: 'EthBridgeIncoming' } as any)).toBe(false);
    expect(isUnsignedToPart({ type: 'SwapAndSend' } as any)).toBe(true);
  });

  it('uses the source-side state for whole transaction unsigned checks', () => {
    expect(isUnsignedTx({ type: 'EthBridgeIncoming' } as any)).toBe(true);
    expect(isUnsignedTx({ type: 'EthBridgeIncoming', externalHash: '0xexternal' } as any)).toBe(false);
  });

  it('waits for user action only after an EVM rejection with an unsigned destination part', () => {
    expect(
      isWaitingForAction({
        type: 'EthBridgeOutgoing',
        transactionState: ETH_BRIDGE_STATES.EVM_REJECTED,
      } as any)
    ).toBe(true);

    expect(
      isWaitingForAction({
        type: 'EthBridgeOutgoing',
        externalHash: '0xexternal',
        transactionState: ETH_BRIDGE_STATES.EVM_REJECTED,
      } as any)
    ).toBe(false);
    expect(
      isWaitingForAction({ type: 'EthBridgeIncoming', transactionState: ETH_BRIDGE_STATES.EVM_REJECTED } as any)
    ).toBe(false);
    expect(
      isWaitingForAction({ type: 'EthBridgeOutgoing', transactionState: ETH_BRIDGE_STATES.EVM_PENDING } as any)
    ).toBe(false);
  });

  it('loads and updates persisted Ethereum bridge history', async () => {
    const tx = { id: 'tx-1', type: 'EthBridgeOutgoing', txId: '0xtx' };
    ethBridgeApiMock.getHistory.mockReturnValue(tx);

    expect(getTransaction('tx-1')).toBe(tx);

    await updateTransaction('tx-1', { externalHash: '0xexternal' });

    expect(ethBridgeApiMock.saveHistory).toHaveBeenCalledWith({
      id: 'tx-1',
      type: 'EthBridgeOutgoing',
      txId: '0xtx',
      externalHash: '0xexternal',
    });
  });

  it('throws when persisted Ethereum bridge history cannot be found', () => {
    ethBridgeApiMock.getHistory.mockReturnValue(null);

    expect(() => getTransaction('missing')).toThrow('[Bridge]: Transaction is not exists: missing');
  });

  it('validates required fields before waiting for approved outgoing requests', async () => {
    await expect(waitForApprovedRequest({ externalNetwork: 0 } as any)).rejects.toThrow(
      '[Bridge]: Tx hash cannot be empty'
    );
    await expect(waitForApprovedRequest({ hash: '0xhash', externalNetwork: Number.NaN } as any)).rejects.toThrow(
      '[Bridge]: Tx externalNetwork should be a number, NaN received'
    );
  });

  it('returns approved outgoing request data after bridge status becomes ready', async () => {
    const unsubscribe = vi.fn();
    const request = { hash: '0xhash', from: '0xfrom' };

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: (observer: { next: (status: string) => void }) => {
        observer.next(BridgeTxStatus.Ready);
        return { unsubscribe };
      },
    });
    ethBridgeApiMock.getApprovedRequest.mockResolvedValueOnce(null).mockResolvedValueOnce(request);

    await expect(waitForApprovedRequest({ hash: '0xhash', externalNetwork: 0 } as any)).resolves.toBe(request);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('uses available outgoing approval data without waiting for another status emission', async () => {
    const request = { hash: '0xhash', from: '0xfrom' };

    ethBridgeApiMock.getApprovedRequest.mockResolvedValue(request);

    await expect(waitForApprovedRequest({ hash: '0xhash', externalNetwork: 0 } as any)).resolves.toBe(request);
    expect(ethBridgeApiMock.getRequestStatus).not.toHaveBeenCalled();
    expect(ethBridgeApiMock.subscribeOnRequestStatus).not.toHaveBeenCalled();
  });

  it('polls approval data when the subscription does not emit approval updates', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const request = { hash: '0xhash', from: '0xfrom' };

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });
    ethBridgeApiMock.getApprovedRequest.mockResolvedValueOnce(null).mockResolvedValueOnce(request);

    const promise = waitForApprovedRequest({ hash: '0xhash', externalNetwork: 0 } as any);

    await vi.advanceTimersByTimeAsync(2_000);

    await expect(promise).resolves.toBe(request);
    expect(ethBridgeApiMock.getApprovedRequest).toHaveBeenCalledTimes(2);
    expect(ethBridgeApiMock.getRequestStatus).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects approved request waiting instead of staying pending forever', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    const promise = waitForApprovedRequest({ hash: '0xhash', externalNetwork: 0 } as any);
    const expectation = expect(promise).rejects.toThrow('[Bridge]: Transaction approval timed out, hash="0xhash"');

    await vi.advanceTimersByTimeAsync(10 * 60_000);

    await expectation;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects approved request waiting when bridge status becomes failed', async () => {
    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: (observer: { next: (status: string) => void }) => {
        observer.next('Failed');
        return { unsubscribe: vi.fn() };
      },
    });

    await expect(waitForApprovedRequest({ hash: '0xhash', externalNetwork: 0 } as any)).rejects.toThrow(
      '[Bridge]: Transaction was failed or canceled'
    );
  });

  it('validates required fields before waiting for incoming requests', async () => {
    await expect(waitForIncomingRequest({ externalNetwork: 0 } as any)).rejects.toThrow(
      '[Bridge]: externalHash cannot be empty!'
    );
    await expect(
      waitForIncomingRequest({ externalHash: '0xexternal', externalNetwork: Number.NaN } as any)
    ).rejects.toThrow('[Bridge]: Tx externalNetwork should be a number, NaN received');
  });

  it('returns SORA transaction data after incoming request completion', async () => {
    const unsubscribe = vi.fn();

    ethBridgeApiMock.subscribeOnRequest.mockReturnValue({
      subscribe: (handler: (request: { status: string }) => void) => {
        handler({ status: 'Done' });
        return { unsubscribe };
      },
    });
    ethBridgeApiMock.getSoraHashByEthereumHash.mockResolvedValue('0xsoraHash');
    ethBridgeApiMock.getSoraBlockHashByRequestHash.mockResolvedValue('0xsoraBlock');

    await expect(waitForIncomingRequest({ externalHash: '0xexternal', externalNetwork: 0 } as any)).resolves.toEqual({
      hash: '0xsoraHash',
      blockId: '0xsoraBlock',
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('builds native incoming EVM transaction data with value override', async () => {
    ethersUtilMock.isNativeEvmTokenAddress.mockReturnValue(true);

    await expect(
      getIncomingEvmTransactionData({
        asset: { externalAddress: '0xnative', externalDecimals: 18 } as any,
        value: '1',
        recipient: 'sora-recipient',
        getContractAddress: (symbol) => `contract:${symbol}`,
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'sendEthToSidechain',
      args: ['hex:sora-recipient', { value: '1:codec:18' }],
    });

    expect(ethersUtilMock.getContract).toHaveBeenCalledWith('contract:Other', []);
  });

  it('builds ERC20 incoming EVM transaction data with token address argument', async () => {
    ethersUtilMock.isNativeEvmTokenAddress.mockReturnValue(false);

    await expect(
      getIncomingEvmTransactionData({
        asset: { externalAddress: '0xtoken', externalDecimals: 6 } as any,
        value: '2',
        recipient: 'sora-recipient',
        getContractAddress: (symbol) => `contract:${symbol}`,
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'sendERC20ToSidechain',
      args: ['hex:sora-recipient', '2:codec:6', '0xtoken', {}],
    });
  });

  it('requires an approved request before building outgoing transaction data', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: { externalAddress: '0xVAL', externalDecimals: 18, symbol: 'VAL' } as any,
        value: '1',
        recipient: '0xbeneficiary',
        getContractAddress: () => 'contract:VAL',
      })
    ).rejects.toThrow('request is required!');
  });

  it('builds VAL/XOR token-address outgoing transaction data with peer minting arguments', async () => {
    const getContractAddress = vi.fn((symbol: string) => `contract:${symbol}`);

    await expect(
      getOutgoingEvmTransactionData({
        asset: { address: 'asset-id', externalAddress: '0xVAL', externalDecimals: 18, symbol: 'VAL' } as any,
        value: '3',
        recipient: '0xbeneficiary',
        getContractAddress,
        request: {
          currencyType: EthCurrencyType.TokenAddress,
          from: '0xfrom',
          hash: '0xhash',
          r: ['0xr'],
          s: ['0xs'],
          v: [27],
        } as any,
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'mintTokensByPeers',
      args: ['0xVAL', '3:codec:18', '0xbeneficiary', '0xhash', [27], ['0xr'], ['0xs'], '0xfrom'],
    });

    expect(getContractAddress).toHaveBeenCalledWith('VAL');
  });

  it('builds XOR asset-id outgoing transaction data through the standard bridge contract', async () => {
    const getContractAddress = vi.fn((symbol: string) => `contract:${symbol}`);

    await expect(
      getOutgoingEvmTransactionData({
        asset: { address: 'xor-asset-id', externalAddress: '0xXOR', externalDecimals: 18, symbol: 'XOR' } as any,
        value: '3',
        recipient: '0xbeneficiary',
        getContractAddress,
        request: {
          currencyType: EthCurrencyType.AssetId,
          from: '0xfrom',
          hash: '0xhash',
          r: ['0xr'],
          s: ['0xs'],
          v: [27],
        } as any,
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'receiveBySidechainAssetId',
      args: ['xor-asset-id', '3:codec:18', '0xbeneficiary', '0xfrom', '0xhash', [27], ['0xr'], ['0xs']],
    });

    expect(getContractAddress).toHaveBeenCalledWith('Other');
  });

  it('builds XOR token-address outgoing transaction data through the XOR legacy contract', async () => {
    const getContractAddress = vi.fn((symbol: string) => `contract:${symbol}`);

    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset({ address: 'xor-asset-id', externalAddress: '0xXOR', symbol: 'XOR' }),
        value: '3',
        recipient: '0xbeneficiary',
        getContractAddress,
        request: createApprovedRequest({ currencyType: EthCurrencyType.TokenAddress }),
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'mintTokensByPeers',
      args: ['0xXOR', '3:codec:18', '0xbeneficiary', '0xhash', [27], ['0xr'], ['0xs'], '0xfrom'],
    });

    expect(getContractAddress).toHaveBeenCalledWith('XOR');
  });

  it('builds VAL asset-id outgoing transaction data through the standard bridge contract', async () => {
    const getContractAddress = vi.fn((symbol: string) => `contract:${symbol}`);

    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset({ address: 'val-asset-id', externalAddress: '0xVAL', symbol: 'VAL' }),
        value: '7',
        recipient: '0xbeneficiary',
        getContractAddress,
        request: createApprovedRequest({ currencyType: EthCurrencyType.AssetId, v: [28], r: ['0xr2'], s: ['0xs2'] }),
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'receiveBySidechainAssetId',
      args: ['val-asset-id', '7:codec:18', '0xbeneficiary', '0xfrom', '0xhash', [28], ['0xr2'], ['0xs2']],
    });

    expect(getContractAddress).toHaveBeenCalledWith('Other');
  });

  it('builds outgoing transaction data for Ethereum-address based assets', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: { address: 'sidechain-asset-id', externalAddress: '0xABC', externalDecimals: 18, symbol: 'ABC' } as any,
        value: '4',
        recipient: '0xbeneficiary',
        getContractAddress: (symbol) => `contract:${symbol}`,
        request: {
          currencyType: EthCurrencyType.TokenAddress,
          from: '0xfrom',
          hash: '0xhash',
          r: ['0xr'],
          s: ['0xs'],
          v: [28],
        } as any,
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'receiveByEthereumAssetAddress',
      args: ['0xABC', '4:codec:18', '0xbeneficiary', '0xfrom', '0xhash', [28], ['0xr'], ['0xs']],
    });
  });

  it('builds outgoing transaction data for sidechain-asset-id based assets', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: { address: 'sidechain-asset-id', externalAddress: '0xABC', externalDecimals: 18, symbol: 'ABC' } as any,
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: (symbol) => `contract:${symbol}`,
        request: {
          currencyType: EthCurrencyType.AssetId,
          from: '0xfrom',
          hash: '0xhash',
          r: ['0xr'],
          s: ['0xs'],
          v: [29],
        } as any,
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'receiveBySidechainAssetId',
      args: ['sidechain-asset-id', '5:codec:18', '0xbeneficiary', '0xfrom', '0xhash', [29], ['0xr'], ['0xs']],
    });
  });

  it('rejects outgoing transaction data with an unsupported currency type', async () => {
    const getContractAddress = vi.fn((symbol: string) => `contract:${symbol}`);

    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset(),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress,
        request: createApprovedRequest({ currencyType: 'SidechainAssetId' }),
      })
    ).rejects.toThrow('[Bridge]: Unsupported Ethereum bridge currency type "SidechainAssetId"');

    expect(getContractAddress).not.toHaveBeenCalled();
    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });

  it('rejects outgoing transaction data when an asset-id approval has no sidechain asset id', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset({ address: '' }),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: vi.fn((symbol: string) => `contract:${symbol}`),
        request: createApprovedRequest({ currencyType: EthCurrencyType.AssetId }),
      })
    ).rejects.toThrow('[Bridge]: Asset is missing required Ethereum bridge address data');

    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });

  it('rejects outgoing transaction data when a token-address approval has no external token address', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset({ externalAddress: '' }),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: vi.fn((symbol: string) => `contract:${symbol}`),
        request: createApprovedRequest({ currencyType: EthCurrencyType.TokenAddress }),
      })
    ).rejects.toThrow('[Bridge]: Asset is missing required Ethereum bridge address data');

    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });

  it('rejects outgoing transaction data when a legacy XOR approval has no external token address', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset({ externalAddress: '', symbol: 'XOR' }),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: vi.fn((symbol: string) => `contract:${symbol}`),
        request: createApprovedRequest({ currencyType: EthCurrencyType.TokenAddress }),
      })
    ).rejects.toThrow('[Bridge]: Asset is missing required Ethereum bridge address data');

    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });

  it.each([
    ['missing from', { from: '' }],
    ['missing hash', { hash: '' }],
  ])('rejects outgoing transaction data with %s in the approved request', async (_, overrides) => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset(),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: vi.fn((symbol: string) => `contract:${symbol}`),
        request: createApprovedRequest(overrides),
      })
    ).rejects.toThrow('[Bridge]: Approved Ethereum bridge request is missing required fields');

    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });

  it.each([
    ['empty signer set', { v: [], r: [], s: [] }],
    ['missing r signature', { v: [27], r: [], s: ['0xs'] }],
    ['missing s signature', { v: [27], r: ['0xr'], s: [] }],
    ['extra r signature', { v: [27], r: ['0xr', '0xr2'], s: ['0xs'] }],
    ['extra s signature', { v: [27], r: ['0xr'], s: ['0xs', '0xs2'] }],
  ])('rejects outgoing transaction data with malformed signatures: %s', async (_, overrides) => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset(),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: vi.fn((symbol: string) => `contract:${symbol}`),
        request: createApprovedRequest(overrides),
      })
    ).rejects.toThrow('[Bridge]: Approved Ethereum bridge request has malformed signatures');

    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });

  it('keeps all peer signatures in order for standard asset-id outgoing transaction data', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset({ address: 'xor-asset-id', externalAddress: '0xXOR', symbol: 'XOR' }),
        value: '11',
        recipient: '0xbeneficiary',
        getContractAddress: (symbol) => `contract:${symbol}`,
        request: createApprovedRequest({
          currencyType: EthCurrencyType.AssetId,
          v: [27, 28, 29],
          r: ['0xr1', '0xr2', '0xr3'],
          s: ['0xs1', '0xs2', '0xs3'],
        }),
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'receiveBySidechainAssetId',
      args: [
        'xor-asset-id',
        '11:codec:18',
        '0xbeneficiary',
        '0xfrom',
        '0xhash',
        [27, 28, 29],
        ['0xr1', '0xr2', '0xr3'],
        ['0xs1', '0xs2', '0xs3'],
      ],
    });
  });
});
