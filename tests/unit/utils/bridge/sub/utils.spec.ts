import { beforeEach, describe, expect, it, vi } from 'vitest';

const subBridgeApiMock = vi.hoisted(() => ({
  getHistory: vi.fn(),
  isEvmAccount: vi.fn(),
  isRelayChain: vi.fn(),
  isSoraParachain: vi.fn(),
  isStandalone: vi.fn(),
  saveHistory: vi.fn(),
}));

vi.mock('@sora-substrate/sdk', () => ({
  Operation: {
    SubstrateIncoming: 'SubstrateIncoming',
    SubstrateOutgoing: 'SubstrateOutgoing',
  },
  FPNumber: class MockFPNumber {
    private value: number;

    constructor(value: string | number) {
      this.value = Number(value);
    }

    static fromCodecValue(value: string | number) {
      return new MockFPNumber(value);
    }

    sub(other: MockFPNumber) {
      return new MockFPNumber(this.value - other.value);
    }

    toCodecString() {
      return `${this.value}:codec`;
    }

    toString() {
      return String(this.value);
    }
  },
}));

vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: subBridgeApiMock,
}));

import { SubTransferType } from '@/utils/bridge/sub/types';
import {
  determineTransferType,
  getBridgeProxyHash,
  getDepositedBalance,
  getMessageAcceptedNonces,
  getMessageDispatchedNonces,
  getParachainSystemMessageHash,
  getReceivedAmount,
  getTransaction,
  isAssetAddedToChannel,
  isBridgeProxyHash,
  isBridgeProxyUpdate,
  isEvent,
  isMessageDispatchedNonces,
  isOutgoingTx,
  isParaInclusion,
  isQueueMessage,
  isSoraBridgeAppBurned,
  isTransactionFeePaid,
  isUnsignedTx,
  isXcmPalletAttempted,
  updateTransaction,
} from '@/utils/bridge/sub/utils';

const codec = (value: unknown) => ({
  toNumber: () => Number(value),
  toString: () => String(value),
});

const event = (section: string, method: string, data: any = []) => ({
  event: {
    data,
    method,
    section,
  },
});

const chainApi = {
  formatAddress: (address: string) => `fmt:${address.toLowerCase()}`,
};

describe('Substrate bridge utils', () => {
  beforeEach(() => {
    Object.values(subBridgeApiMock).forEach((mock) => mock.mockReset());
  });

  it('detects outgoing substrate bridge transactions', () => {
    expect(isOutgoingTx({ type: 'SubstrateOutgoing' } as any)).toBe(true);
    expect(isOutgoingTx({ type: 'SubstrateIncoming' } as any)).toBe(false);
  });

  it('detects unsigned transactions using txId or externalHash depending on account type', () => {
    subBridgeApiMock.isEvmAccount.mockReturnValue(false);

    expect(isUnsignedTx({ type: 'SubstrateOutgoing', externalNetwork: 'para' } as any)).toBe(true);
    expect(isUnsignedTx({ type: 'SubstrateOutgoing', blockId: '0xblock', externalNetwork: 'para' } as any)).toBe(false);
    expect(isUnsignedTx({ type: 'SubstrateOutgoing', externalNetwork: 'para', txId: '0xtx' } as any)).toBe(false);

    subBridgeApiMock.isEvmAccount.mockReturnValue(true);

    expect(isUnsignedTx({ type: 'SubstrateIncoming', externalNetwork: 'evm' } as any)).toBe(true);
    expect(isUnsignedTx({ type: 'SubstrateIncoming', externalHash: '0xexternal', externalNetwork: 'evm' } as any)).toBe(
      false
    );
  });

  it('loads and updates persisted substrate bridge history', () => {
    const tx = { id: 'sub-1', type: 'SubstrateOutgoing', txId: '0xtx' };
    subBridgeApiMock.getHistory.mockReturnValue(tx);

    expect(getTransaction('sub-1')).toBe(tx);

    updateTransaction('sub-1', { blockId: '0xblock' });

    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledWith({
      id: 'sub-1',
      type: 'SubstrateOutgoing',
      txId: '0xtx',
      blockId: '0xblock',
    });
  });

  it('throws when persisted substrate bridge history cannot be found', () => {
    subBridgeApiMock.getHistory.mockReturnValue(null);

    expect(() => getTransaction('missing')).toThrow('[Bridge]: Transaction is not exists: missing');
  });

  it('determines transfer type using sub bridge network classifiers', () => {
    subBridgeApiMock.isSoraParachain.mockReturnValueOnce(true);
    expect(determineTransferType('sora-para' as any)).toBe(SubTransferType.SoraParachain);

    subBridgeApiMock.isSoraParachain.mockReturnValue(false);
    subBridgeApiMock.isRelayChain.mockReturnValueOnce(true);
    expect(determineTransferType('relay' as any)).toBe(SubTransferType.Relaychain);

    subBridgeApiMock.isRelayChain.mockReturnValue(false);
    subBridgeApiMock.isStandalone.mockReturnValueOnce(true);
    expect(determineTransferType('standalone' as any)).toBe(SubTransferType.Standalone);

    subBridgeApiMock.isStandalone.mockReturnValue(false);
    expect(determineTransferType('parachain' as any)).toBe(SubTransferType.Parachain);
  });

  it('matches bridge-related event classifiers', () => {
    expect(isEvent(event('balances', 'Deposit'), 'balances', 'Deposit')).toBe(true);
    expect(isQueueMessage(event('messageQueue', 'Processed'))).toBe(true);
    expect(isQueueMessage(event('xcmpQueue', 'Success'))).toBe(true);
    expect(isQueueMessage(event('xcmpQueue', 'Fail'))).toBe(true);
    expect(isQueueMessage(event('dmpQueue', 'ExecutedDownward'))).toBe(true);
    expect(isQueueMessage(event('system', 'ExtrinsicSuccess'))).toBe(false);
    expect(isParaInclusion(event('paraInclusion', 'CandidateIncluded'))).toBe(true);
    expect(isXcmPalletAttempted(event('xcmPallet', 'Attempted'))).toBe(true);
    expect(isTransactionFeePaid(event('transactionPayment', 'TransactionFeePaid'))).toBe(true);
    expect(isBridgeProxyUpdate(event('bridgeProxy', 'RequestStatusUpdate'))).toBe(true);
  });

  it('extracts and compares bridge proxy hashes', () => {
    const bridgeEvent = event('bridgeProxy', 'RequestStatusUpdate', [codec('0xhash')]);

    expect(getBridgeProxyHash([event('system', 'ExtrinsicSuccess'), bridgeEvent])).toBe('0xhash');
    expect(isBridgeProxyHash(bridgeEvent, '0xhash')).toBe(true);
    expect(isBridgeProxyHash(bridgeEvent, '0xother')).toBe(false);
    expect(isBridgeProxyHash(event('system', 'ExtrinsicSuccess'), '0xhash')).toBe(false);
    expect(() => getBridgeProxyHash([])).toThrow('Unable to find "bridgeProxy.RequestStatusUpdate" event');
  });

  it('finds deposited balances from native and assets pallet event shapes', () => {
    expect(
      getDepositedBalance(
        [event('balances', 'Deposit', { amount: codec('10'), who: codec('Recipient') })],
        'recipient',
        chainApi as any
      )
    ).toEqual(['10', 0]);

    const transferData = Object.assign([codec('asset'), codec('Recipient'), codec('from'), codec('25')], {});

    expect(getDepositedBalance([event('assets', 'Transfer', transferData)], 'recipient', chainApi as any)).toEqual([
      '25',
      0,
    ]);

    const issuedData = Object.assign([codec('asset'), codec('unused'), codec('unused'), codec('40')], {
      owner: codec('Recipient'),
    });

    expect(getDepositedBalance([event('assets', 'Issued', issuedData)], 'recipient', chainApi as any)).toEqual([
      '40',
      0,
    ]);
    expect(() => getDepositedBalance([event('system', 'ExtrinsicSuccess')], 'recipient', chainApi as any)).toThrow(
      'Unable to find balance deposit like event'
    );
  });

  it('calculates received amount and transfer fee from codec values', () => {
    expect(getReceivedAmount('100', '80' as any)).toEqual({
      amount: '80',
      transferFee: '20:codec',
    });
  });

  it('extracts parachain system message hashes', () => {
    expect(getParachainSystemMessageHash([event('parachainSystem', 'UpwardMessageSent', [codec('0xup')])])).toBe(
      '0xup'
    );
    expect(getParachainSystemMessageHash([event('xcmpQueue', 'XcmpMessageSent', [codec('0xxcmp')])])).toBe('0xxcmp');
    expect(() => getParachainSystemMessageHash([])).toThrow('Unable to find "parachainSystem.UpwardMessageSent" event');
  });

  it('extracts accepted and dispatched message nonces', () => {
    expect(
      getMessageAcceptedNonces([
        event('substrateBridgeOutboundChannel', 'MessageAccepted', [codec(0), codec(7), codec(9)]),
      ])
    ).toEqual([7, 9]);
    expect(() => getMessageAcceptedNonces([])).toThrow(
      'Unable to find "substrateBridgeOutboundChannel.MessageAccepted" event'
    );

    const dispatchedPayload = {
      batchNonce: { unwrap: () => codec(4) },
      messageNonce: codec(6),
    };

    expect(getMessageDispatchedNonces([event('substrateDispatch', 'MessageDispatched', [dispatchedPayload])])).toEqual([
      4, 6,
    ]);
    expect(() => getMessageDispatchedNonces([])).toThrow('Unable to find "substrateDispatch.MessageDispatched" event');
  });

  it('checks dispatched message nonces and guards against impossible batch ordering', () => {
    const dispatchedPayload = {
      batchNonce: { unwrap: () => codec(4) },
      messageNonce: codec(6),
    };
    const dispatchedEvent = event('substrateDispatch', 'MessageDispatched', [dispatchedPayload]);

    expect(isMessageDispatchedNonces(4, 6, dispatchedEvent)).toBe(true);
    expect(isMessageDispatchedNonces(4, 7, dispatchedEvent)).toBe(false);
    expect(isMessageDispatchedNonces(4, 6, event('system', 'ExtrinsicSuccess'))).toBe(false);
    expect(() => isMessageDispatchedNonces(3, 6, dispatchedEvent)).toThrow(
      'Parachain channel batch nonce 4 is larger than tx batch nonce 3'
    );
  });

  it('matches xcmApp AssetAddedToChannel transfer payloads', () => {
    const transfer = {
      amount: codec('100'),
      assetId: codec('asset-id'),
      recipient: codec('Recipient'),
    };
    const addedEvent = event('xcmApp', 'AssetAddedToChannel', [{ asTransfer: transfer }]);

    expect(
      isAssetAddedToChannel(addedEvent, { address: 'asset-id' } as any, 'recipient', '100' as any, chainApi as any)
    ).toBe(true);
    expect(
      isAssetAddedToChannel(event('system', 'ExtrinsicSuccess'), {} as any, 'recipient', '100' as any, chainApi as any)
    ).toBe(false);
    expect(
      isAssetAddedToChannel(addedEvent, { address: 'other' } as any, 'recipient', '100' as any, chainApi as any)
    ).toBe(false);
    expect(
      isAssetAddedToChannel(addedEvent, { address: 'asset-id' } as any, 'recipient', '99' as any, chainApi as any)
    ).toBe(false);
  });

  it('matches Liberland burn payloads for SORA recipients', () => {
    const burnEvent = event('soraBridgeApp', 'Burned', [
      { isMainnet: true },
      { asAsset: codec('external-asset'), isLld: false },
      codec('Sender'),
      { asSora: codec('Recipient'), isSora: true },
      codec('100'),
    ]);

    expect(
      isSoraBridgeAppBurned(
        burnEvent,
        { externalAddress: 'external-asset' } as any,
        'sender',
        'recipient',
        '100' as any,
        chainApi as any
      )
    ).toBe(true);
    expect(
      isSoraBridgeAppBurned(
        event('system', 'ExtrinsicSuccess'),
        { externalAddress: 'external-asset' } as any,
        'sender',
        'recipient',
        '100' as any,
        chainApi as any
      )
    ).toBe(false);
    expect(
      isSoraBridgeAppBurned(
        burnEvent,
        { externalAddress: 'external-asset' } as any,
        'sender',
        'recipient',
        '99' as any,
        chainApi as any
      )
    ).toBe(false);
  });
});
