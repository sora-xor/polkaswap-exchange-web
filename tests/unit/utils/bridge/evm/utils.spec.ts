import { beforeEach, describe, expect, it, vi } from 'vitest';

const evmBridgeApiMock = vi.hoisted(() => ({
  getHistory: vi.fn(),
  saveHistory: vi.fn(),
}));

vi.mock('@sora-substrate/sdk', () => ({
  Operation: {
    EvmOutgoing: 'EvmOutgoing',
    EvmIncoming: 'EvmIncoming',
  },
}));

vi.mock('@/utils/bridge/evm/api', () => ({
  evmBridgeApi: evmBridgeApiMock,
}));

import { getTransaction, isOutgoingTx, isUnsignedTx, updateTransaction } from '@/utils/bridge/evm/utils';

describe('EVM bridge utils', () => {
  beforeEach(() => {
    evmBridgeApiMock.getHistory.mockReset();
    evmBridgeApiMock.saveHistory.mockReset();
  });

  it('detects outgoing EVM bridge transactions', () => {
    expect(isOutgoingTx({ type: 'EvmOutgoing' } as any)).toBe(true);
    expect(isOutgoingTx({ type: 'EvmIncoming' } as any)).toBe(false);
  });

  it('treats outgoing transactions as unsigned only before any SORA block or tx id exists', () => {
    expect(isUnsignedTx({ type: 'EvmOutgoing' } as any)).toBe(true);
    expect(isUnsignedTx({ type: 'EvmOutgoing', blockId: '0xblock' } as any)).toBe(false);
    expect(isUnsignedTx({ type: 'EvmOutgoing', txId: '0xtx' } as any)).toBe(false);
    expect(isUnsignedTx({ type: 'EvmOutgoing', blockId: '0xblock', txId: '0xtx' } as any)).toBe(false);
  });

  it('treats incoming transactions as unsigned until an external hash exists', () => {
    expect(isUnsignedTx({ type: 'EvmIncoming' } as any)).toBe(true);
    expect(isUnsignedTx({ type: 'EvmIncoming', externalHash: '0xexternal' } as any)).toBe(false);
  });

  it('loads and updates persisted EVM bridge history', () => {
    const tx = { id: 'tx-1', type: 'EvmIncoming', externalHash: '0xexternal' };
    evmBridgeApiMock.getHistory.mockReturnValue(tx);

    expect(getTransaction('tx-1')).toBe(tx);

    updateTransaction('tx-1', { externalBlockHeight: 42 });

    expect(evmBridgeApiMock.saveHistory).toHaveBeenCalledWith({
      id: 'tx-1',
      type: 'EvmIncoming',
      externalHash: '0xexternal',
      externalBlockHeight: 42,
    });
  });

  it('throws when persisted EVM bridge history cannot be found', () => {
    evmBridgeApiMock.getHistory.mockReturnValue(null);

    expect(() => getTransaction('missing')).toThrow('[Bridge]: Transaction is not exists: missing');
  });
});
