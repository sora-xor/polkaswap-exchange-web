import { describe, expect, it } from 'vitest';
import { Operation } from '@sora-substrate/sdk';

import { historyElementsFilter } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/queries/historyElements';
import { ModuleMethods, ModuleNames } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';

describe('Polkaswap historyElementsFilter', () => {
  it('matches account history by signer, dataFrom, or dataTo for the local indexer', () => {
    expect(historyElementsFilter({ address: 'sora-address' })).toEqual({
      and: [
        {
          or: [
            { address: { equalTo: 'sora-address' } },
            { dataFrom: { equalTo: 'sora-address' } },
            { dataTo: { equalTo: 'sora-address' } },
          ],
        },
      ],
    });
  });

  it('maps EVM bridge operations to bridgeProxy burn and mint calls', () => {
    expect(
      historyElementsFilter({
        address: 'sora-address',
        operations: [Operation.EvmOutgoing, Operation.EvmIncoming],
      })
    ).toEqual({
      and: [
        {
          or: [
            { address: { equalTo: 'sora-address' } },
            { dataFrom: { equalTo: 'sora-address' } },
            { dataTo: { equalTo: 'sora-address' } },
          ],
        },
        {
          or: [
            {
              module: { equalTo: ModuleNames.BridgeProxy },
              method: { equalTo: ModuleMethods.BridgeProxyBurn },
            },
            {
              module: { equalTo: ModuleNames.BridgeProxy },
              method: { equalTo: ModuleMethods.BridgeProxyMint },
            },
          ],
        },
      ],
    });
  });

  it('ignores unsupported operation names instead of emitting an empty operation filter', () => {
    expect(
      historyElementsFilter({
        address: 'sora-address',
        operations: ['UnsupportedOperation' as Operation],
      })
    ).toEqual({
      and: [
        {
          or: [
            { address: { equalTo: 'sora-address' } },
            { dataFrom: { equalTo: 'sora-address' } },
            { dataTo: { equalTo: 'sora-address' } },
          ],
        },
      ],
    });
  });

  it('drops unsupported query operation names while keeping supported bridge operations', () => {
    expect(
      historyElementsFilter({
        query: {
          operationNames: [Operation.EvmOutgoing, 'UnsupportedOperation' as Operation],
        },
      })
    ).toEqual({
      and: [
        {
          or: [
            {
              module: { equalTo: ModuleNames.BridgeProxy },
              method: { equalTo: ModuleMethods.BridgeProxyBurn },
            },
          ],
        },
      ],
    });
  });
});
