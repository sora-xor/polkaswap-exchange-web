import { Interface } from 'ethers';
import bridgeAbi from '@/abi/ethereum/other/BRIDGE.json';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ethBridgeApiMock = vi.hoisted(() => ({
  history: {} as Record<string, any>,
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

vi.mock('@sora-substrate/sdk', async () => ({
  Operation: {
    EthBridgeIncoming: 'EthBridgeIncoming',
    EthBridgeOutgoing: 'EthBridgeOutgoing',
  },
  FPNumber: (await import('@/lib/substrate/math')).FPNumber,
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
  findTransaction,
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
    Object.values(ethBridgeApiMock).forEach((mock) => {
      if (vi.isMockFunction(mock)) mock.mockReset();
    });
    ethBridgeApiMock.history = {};
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
      currencyId: 'sidechain-asset-id',
      amount: '5000000000000000000',
      to: '0xbeneficiary',
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

  it('prefers authoritative persisted history over a stale UI cache row', () => {
    const persisted = {
      id: 'tx-1',
      type: 'EthBridgeOutgoing',
      txId: '0xsora-tx',
      blockId: '0xsora-block',
      hash: '0xrequest',
    };
    const cached = { id: 'tx-1', type: 'EthBridgeOutgoing' };

    ethBridgeApiMock.history = { 'tx-1': persisted };
    ethBridgeApiMock.getHistory.mockReturnValue(persisted);

    expect(getTransaction('tx-1', cached as any)).toBe(persisted);
  });

  it.each(['local-id', '0xrequest', '0xsora-tx', '0xexternal'])(
    'finds persisted Ethereum history by the %s transaction alias',
    (lookupId) => {
      const persisted = {
        id: 'local-id',
        type: 'EthBridgeIncoming',
        hash: '0xrequest',
        txId: '0xsora-tx',
        externalHash: '0xexternal',
      };

      ethBridgeApiMock.history = { 'storage-key': persisted };
      ethBridgeApiMock.getHistory.mockReturnValue(null);

      expect(findTransaction(lookupId)).toBe(persisted);
    }
  );

  it('uses a UI cache row only when persisted Ethereum history is unavailable', () => {
    const cached = { id: 'cached', type: 'EthBridgeOutgoing' };

    ethBridgeApiMock.getHistory.mockReturnValue(null);

    expect(getTransaction('cached', cached as any)).toBe(cached);
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
    const unsubscribe = vi.fn();

    ethBridgeApiMock.getApprovedRequest.mockResolvedValue(request);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    await expect(waitForApprovedRequest({ hash: '0xhash', externalNetwork: 0 } as any)).resolves.toBe(request);
    expect(ethBridgeApiMock.getRequestStatus).not.toHaveBeenCalled();
    expect(ethBridgeApiMock.subscribeOnRequestStatus).toHaveBeenCalledWith('0xhash');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
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

  it('keeps non-terminal approval tracking automatic and cancels it without leaking timers', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const controller = new AbortController();

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    const promise = waitForApprovedRequest({ hash: '0xhash', externalNetwork: 0 } as any, controller.signal);
    const expectation = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    controller.abort();

    await expectation;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels approval tracking immediately while the first RPC read is still pending', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const controller = new AbortController();

    ethBridgeApiMock.getApprovedRequest.mockReturnValue(new Promise(() => undefined));
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    const promise = waitForApprovedRequest({ hash: '0xhash', externalNetwork: 0 } as any, controller.signal);
    const expectation = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    await Promise.resolve();
    controller.abort();

    await expectation;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
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

  it('returns already completed SORA transaction data without waiting for a new subscription event', async () => {
    const unsubscribe = vi.fn();

    ethBridgeApiMock.getRequestStatus.mockImplementation(async (hash: string) =>
      ['0xexternal', '0xsoraHash'].includes(hash) ? BridgeTxStatus.Done : null
    );
    ethBridgeApiMock.getSoraHashByEthereumHash.mockResolvedValue('0xsoraHash');
    ethBridgeApiMock.getSoraBlockHashByRequestHash.mockResolvedValue('0xsoraBlock');
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    await expect(waitForIncomingRequest({ externalHash: '0xexternal', externalNetwork: 0 } as any)).resolves.toEqual({
      hash: '0xsoraHash',
      blockId: '0xsoraBlock',
    });
    expect(ethBridgeApiMock.subscribeOnRequestStatus).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(ethBridgeApiMock.getSoraBlockHashByRequestHash).toHaveBeenCalledWith('0xexternal');
  });

  it('polls until a silent subscription can be resolved to the finalized SORA transaction', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const zeroHash = `0x${'0'.repeat(64)}`;

    ethBridgeApiMock.getRequestStatus.mockImplementation(async (hash: string) => {
      if (hash === '0xsoraHash') return BridgeTxStatus.Done;
      return BridgeTxStatus.Ready;
    });
    ethBridgeApiMock.getSoraHashByEthereumHash
      .mockResolvedValueOnce(zeroHash)
      .mockRejectedValueOnce(new Error('temporary rpc disconnect'))
      .mockResolvedValue('0xsoraHash');
    ethBridgeApiMock.getSoraBlockHashByRequestHash.mockResolvedValue('0xsoraBlock');
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    const promise = waitForIncomingRequest({ externalHash: '0xexternal', externalNetwork: 0 } as any);

    await vi.advanceTimersByTimeAsync(6_000);

    await expect(promise).resolves.toEqual({ hash: '0xsoraHash', blockId: '0xsoraBlock' });
    expect(ethBridgeApiMock.getSoraHashByEthereumHash).toHaveBeenCalledTimes(3);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('keeps tracking with capped backoff instead of requiring Retry when SORA discovery remains slow', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const zeroHash = `0x${'0'.repeat(64)}`;
    let mappingAvailable = false;

    ethBridgeApiMock.getRequestStatus.mockImplementation(async (hash: string) => {
      return hash === '0xsoraHash' ? BridgeTxStatus.Done : BridgeTxStatus.Ready;
    });
    ethBridgeApiMock.getSoraHashByEthereumHash.mockImplementation(async () =>
      mappingAvailable ? '0xsoraHash' : zeroHash
    );
    ethBridgeApiMock.getSoraBlockHashByRequestHash.mockResolvedValue('0xsoraBlock');
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    const promise = waitForIncomingRequest({ externalHash: '0xexternal', externalNetwork: 0 } as any);

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    mappingAvailable = true;
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(promise).resolves.toEqual({ hash: '0xsoraHash', blockId: '0xsoraBlock' });
    expect(ethBridgeApiMock.subscribeOnRequestStatus).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('cancels incoming tracking without leaving timers or subscriptions behind', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const controller = new AbortController();
    const zeroHash = `0x${'0'.repeat(64)}`;

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(BridgeTxStatus.Ready);
    ethBridgeApiMock.getSoraHashByEthereumHash.mockResolvedValue(zeroHash);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    const promise = waitForIncomingRequest(
      { externalHash: '0xexternal', externalNetwork: 0 } as any,
      controller.signal
    );

    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels incoming tracking while its first RPC read is still pending', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const controller = new AbortController();

    ethBridgeApiMock.getRequestStatus.mockReturnValue(new Promise(() => undefined));
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    const promise = waitForIncomingRequest(
      { externalHash: '0xexternal', externalNetwork: 0 } as any,
      controller.signal
    );
    const expectation = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    await Promise.resolve();
    controller.abort();

    await expectation;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([BridgeTxStatus.Failed, BridgeTxStatus.Frozen, BridgeTxStatus.Broken])(
    'rejects terminal incoming bridge status %s',
    async (status) => {
      ethBridgeApiMock.getRequestStatus.mockResolvedValue(status);

      await expect(waitForIncomingRequest({ externalHash: '0xexternal', externalNetwork: 0 } as any)).rejects.toThrow(
        '[Bridge]: Transaction was failed or canceled'
      );
      expect(ethBridgeApiMock.subscribeOnRequestStatus).toHaveBeenCalledTimes(1);
    }
  );

  it('rejects and cleans up when a terminal status arrives through the subscription', async () => {
    const unsubscribe = vi.fn();
    const zeroHash = `0x${'0'.repeat(64)}`;

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(BridgeTxStatus.Ready);
    ethBridgeApiMock.getSoraHashByEthereumHash.mockResolvedValue(zeroHash);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: (observer: { next: (status: string) => void }) => {
        observer.next(BridgeTxStatus.Failed);
        return { unsubscribe };
      },
    });

    await expect(waitForIncomingRequest({ externalHash: '0xexternal', externalNetwork: 0 } as any)).rejects.toThrow(
      '[Bridge]: Transaction was failed or canceled'
    );
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
      args: ['hex:sora-recipient', { value: '1000000000000000000' }],
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
      args: ['hex:sora-recipient', '2000000', '0xtoken', {}],
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
          currencyId: '0xVAL',
          amount: '3000000000000000000',
          to: '0xbeneficiary',
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
      args: ['0xVAL', '3000000000000000000', '0xbeneficiary', '0xhash', [27], ['0xr'], ['0xs'], '0xfrom'],
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
          currencyId: 'xor-asset-id',
          amount: '3000000000000000000',
          to: '0xbeneficiary',
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
      args: ['xor-asset-id', '3000000000000000000', '0xbeneficiary', '0xfrom', '0xhash', [27], ['0xr'], ['0xs']],
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
        request: createApprovedRequest({
          currencyType: EthCurrencyType.TokenAddress,
          currencyId: '0xXOR',
          amount: '3000000000000000000',
        }),
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'mintTokensByPeers',
      args: ['0xXOR', '3000000000000000000', '0xbeneficiary', '0xhash', [27], ['0xr'], ['0xs'], '0xfrom'],
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
        request: createApprovedRequest({
          currencyType: EthCurrencyType.AssetId,
          currencyId: 'val-asset-id',
          amount: '7000000000000000000',
          v: [28],
          r: ['0xr2'],
          s: ['0xs2'],
        }),
      })
    ).resolves.toEqual({
      contract: { contract: 'mock' },
      method: 'receiveBySidechainAssetId',
      args: ['val-asset-id', '7000000000000000000', '0xbeneficiary', '0xfrom', '0xhash', [28], ['0xr2'], ['0xs2']],
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
          currencyId: '0xABC',
          amount: '4000000000000000000',
          to: '0xbeneficiary',
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
      args: ['0xABC', '4000000000000000000', '0xbeneficiary', '0xfrom', '0xhash', [28], ['0xr'], ['0xs']],
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
          currencyId: 'sidechain-asset-id',
          amount: '5000000000000000000',
          to: '0xbeneficiary',
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
      args: ['sidechain-asset-id', '5000000000000000000', '0xbeneficiary', '0xfrom', '0xhash', [29], ['0xr'], ['0xs']],
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
    ['missing recipient', { to: '' }],
    ['missing currency', { currencyId: '' }],
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
          currencyId: 'xor-asset-id',
          amount: '11000000000000000000',
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
        '11000000000000000000',
        '0xbeneficiary',
        '0xfrom',
        '0xhash',
        [27, 28, 29],
        ['0xr1', '0xr2', '0xr3'],
        ['0xs1', '0xs2', '0xs3'],
      ],
    });
  });

  it.each(['5', '240'])('encodes the approved %s XOR amount unchanged for the canonical bridge', async (value) => {
    const currencyId = '0x0200000000000000000000000000000000000000000000000000000000000000';
    const recipient = `0x${'11'.repeat(20)}`;
    const request = createApprovedRequest({
      currencyId,
      amount: `${value}000000000000000000`,
      to: recipient,
      from: `0x${'22'.repeat(20)}`,
      hash: `0x${'33'.repeat(32)}`,
      r: [`0x${'44'.repeat(32)}`, `0x${'55'.repeat(32)}`, `0x${'66'.repeat(32)}`],
      s: [`0x${'77'.repeat(32)}`, `0x${'88'.repeat(32)}`, `0x${'99'.repeat(32)}`],
      v: [27, 28, 28],
    });
    const bridgeAddress = '0x313416870a4da6f12505a550b67bb73c8e21d5d3';
    const getContractAddress = vi.fn((symbol) => (symbol === 'Other' ? bridgeAddress : 'legacy-xor-contract'));

    const result = await getOutgoingEvmTransactionData({
      asset: createBridgeAsset({ address: currencyId, symbol: 'XOR' }),
      value,
      recipient,
      getContractAddress,
      request,
    });

    expect(result.method).toBe('receiveBySidechainAssetId');
    expect(result.args).toEqual([
      request.currencyId,
      request.amount,
      request.to,
      request.from,
      request.hash,
      request.v,
      request.r,
      request.s,
    ]);
    expect(getContractAddress).toHaveBeenCalledExactlyOnceWith('Other');
    expect(ethersUtilMock.getContract).toHaveBeenCalledWith(bridgeAddress, []);
    const contractInterface = new Interface(bridgeAbi);
    const calldata = contractInterface.encodeFunctionData(result.method, result.args);
    const decoded = contractInterface.decodeFunctionData('receiveBySidechainAssetId', calldata);
    expect(calldata.slice(0, 10)).toBe('0x75273ece');
    expect(decoded[1]).toBe(BigInt(request.amount));
    expect(decoded[0]).toBe(currencyId);
    expect(decoded[2].toLowerCase()).toBe(recipient);
  });

  it.each([
    ['asset id', { currencyId: 'different-asset-id' }, 'currency does not match'],
    ['beneficiary', { to: '0xdifferent' }, 'recipient does not match'],
  ])('rejects a proof for a different %s before preparing a wallet transaction', async (_, overrides, message) => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset(),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: vi.fn(),
        request: createApprovedRequest(overrides),
      })
    ).rejects.toThrow(message);
    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });

  it('rejects a token-address proof for another registered Ethereum token', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset(),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: vi.fn(),
        request: createApprovedRequest({ currencyType: EthCurrencyType.TokenAddress, currencyId: '0xother-token' }),
      })
    ).rejects.toThrow('currency does not match');
    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });

  it.each(['240', `5${'0'.repeat(38)}`, '5.0000000000000000001', 'NaN', '5e0'])(
    'rejects an unreconciled destination amount %s rather than alter the signed amount',
    async (value) => {
      await expect(
        getOutgoingEvmTransactionData({
          asset: createBridgeAsset(),
          value,
          recipient: '0xbeneficiary',
          getContractAddress: vi.fn(),
          request: createApprovedRequest(),
        })
      ).rejects.toThrow('amount does not match the displayed destination amount');
      expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
    }
  );

  it.each(['0', '-1', '1.5', '1e18', 'NaN', '', (1n << 256n).toString()])(
    'rejects an invalid signed uint256 amount %s',
    async (amount) => {
      await expect(
        getOutgoingEvmTransactionData({
          asset: createBridgeAsset(),
          value: '5',
          recipient: '0xbeneficiary',
          getContractAddress: vi.fn(),
          request: createApprovedRequest({ amount }),
        })
      ).rejects.toThrow('invalid amount');
      expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
    }
  );

  it('rejects a missing bridge contract before opening the wallet', async () => {
    await expect(
      getOutgoingEvmTransactionData({
        asset: createBridgeAsset(),
        value: '5',
        recipient: '0xbeneficiary',
        getContractAddress: () => null,
        request: createApprovedRequest(),
      })
    ).rejects.toThrow('contract address is unavailable');
    expect(ethersUtilMock.getContract).not.toHaveBeenCalled();
  });
});
