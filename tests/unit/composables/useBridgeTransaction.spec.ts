import { computed } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';

import { useBridgeTransaction } from '@/composables/useBridgeTransaction';

const mocks = vi.hoisted(() => {
  const soraExplorerLinksMock = vi.fn(() => ['sora-link']);
  const getNetworkExplorerLinksMock = vi.fn(() => ['network-link']);
  const getNetworkNameMock = vi.fn(() => 'Ethereum');
  const isOutgoingTxMock = vi.fn(() => true);

  return {
    soraExplorerLinksMock,
    getNetworkExplorerLinksMock,
    getNetworkNameMock,
    isOutgoingTxMock,
  };
});

vi.mock('@/utils', () => ({
  soraExplorerLinks: mocks.soraExplorerLinksMock,
}));

vi.mock('@/composables/useNetworkFormatter', () => ({
  useNetworkFormatter: () => ({
    soraNetwork: computed(() => 'testnet'),
    getNetworkExplorerLinks: mocks.getNetworkExplorerLinksMock,
    getNetworkName: mocks.getNetworkNameMock,
    isOutgoingTx: mocks.isOutgoingTxMock,
    TranslationConsts: {
      Sora: 'Sora',
      Max: '≈',
    },
  }),
}));

const { soraExplorerLinksMock, getNetworkExplorerLinksMock, getNetworkNameMock, isOutgoingTxMock } = mocks;

type BridgeTransactionMock = {
  from?: string;
  to?: string;
  txId?: string;
  hash?: string;
  blockHeight?: number;
  blockId?: string;
  payload?: { eventIndex?: number };
  externalHash?: string;
  externalBlockHeight?: number;
  externalBlockId?: string;
  externalEventIndex?: number;
  externalNetworkType?: BridgeNetworkType;
  externalNetwork?: number;
};

const baseTx: BridgeTransactionMock = {
  from: 'sora-address',
  to: 'external-address',
  txId: 'tx-1',
  hash: 'hash-1',
  blockHeight: 42,
  blockId: 'block-1',
  payload: { eventIndex: 3 },
  externalHash: '0xabc',
  externalBlockHeight: 128,
  externalBlockId: '0xblock',
  externalEventIndex: 7,
  externalNetworkType: BridgeNetworkType.Evm,
  externalNetwork: 1,
};

const createComposable = (overrides: Partial<BridgeTransactionMock> = {}) => {
  const tx = computed(() => ({
    ...baseTx,
    ...overrides,
  }));

  return useBridgeTransaction(tx);
};

describe('useBridgeTransaction', () => {
  beforeEach(() => {
    soraExplorerLinksMock.mockClear();
    getNetworkExplorerLinksMock.mockClear();
    getNetworkNameMock.mockClear();
    isOutgoingTxMock.mockClear();
    isOutgoingTxMock.mockReturnValue(true);
  });

  it('derives core explorer metadata for outgoing transactions', () => {
    const bridgeTx = createComposable();

    expect(bridgeTx.isOutgoing.value).toBe(true);
    expect(bridgeTx.txInternalAccount.value).toBe(baseTx.from);
    expect(bridgeTx.txExternalAccount.value).toBe(baseTx.to);

    expect(bridgeTx.internalExplorerLinks.value).toEqual(['sora-link']);
    expect(soraExplorerLinksMock).toHaveBeenCalledWith(
      'testnet',
      baseTx.txId,
      baseTx.blockHeight,
      baseTx.payload?.eventIndex
    );

    expect(bridgeTx.externalExplorerLinks.value).toEqual(['network-link']);
    expect(getNetworkExplorerLinksMock).toHaveBeenCalledWith({
      networkType: baseTx.externalNetworkType,
      networkId: baseTx.externalNetwork,
      value: baseTx.externalHash,
      blockId: baseTx.externalBlockHeight,
      eventIndex: baseTx.externalEventIndex,
    });

    expect(bridgeTx.externalAccountLinks.value).toEqual(['network-link']);
    expect(getNetworkExplorerLinksMock).toHaveBeenLastCalledWith({
      networkType: baseTx.externalNetworkType,
      networkId: baseTx.externalNetwork,
      value: baseTx.to,
      type: bridgeTx.EvmLinkType.Account,
    });
  });

  it('builds network text with approximate prefix when requested', () => {
    const bridgeTx = createComposable();
    const text = bridgeTx.getNetworkText('pending', baseTx.externalNetwork, { approximate: true });

    expect(text).toBe('≈ Ethereum pending');
    expect(getNetworkNameMock).toHaveBeenCalledWith(baseTx.externalNetworkType, baseTx.externalNetwork);
  });

  it('detects non-evm transaction types and respects direction helper', () => {
    isOutgoingTxMock.mockReturnValueOnce(false);

    const bridgeTx = createComposable({
      externalNetworkType: undefined,
      externalNetwork: undefined,
    });

    expect(bridgeTx.isOutgoing.value).toBe(false);
    expect(bridgeTx.isEvmTxType.value).toBe(false);
    expect(bridgeTx.externalExplorerLinks.value).toEqual([]);
    expect(bridgeTx.externalAccountLinks.value).toEqual([]);
    expect(getNetworkExplorerLinksMock).not.toHaveBeenCalled();
  });
});
