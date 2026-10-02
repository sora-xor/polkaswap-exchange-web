import { describe, expect, it } from 'vitest';

import source from '@/utils/bridge/eth/index.ts?raw';

describe('Ethereum bridge transaction source selection', () => {
  it('passes the UI snapshot only as a fallback to authoritative persisted history', () => {
    expect(source).toContain(
      'getEthBridgeTransaction(id, resolveBridgeStore().getHistoryTransaction(id) as EthHistory | null)'
    );
    expect(source).not.toContain('resolveBridgeStore().getHistoryTransaction(id) || getEthBridgeTransaction(id)');
  });

  it('forwards durable pre-broadcast evidence from reducers into both EVM signing actions', () => {
    expect(source).toContain('signEthBridgeOutgoingEvm(id, recordSubmission)');
    expect(source).toContain('signEthBridgeIncomingEvm(id, recordSubmission)');
  });
});
