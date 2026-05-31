import { describe, expect, it, vi } from 'vitest';
import { Operation } from '@sora-substrate/sdk';

import { historyElementsFilter } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/queries/historyElements';
import { ModuleMethods, ModuleNames } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';

describe('Polkaswap historyElementsFilter', () => {
  it('maps swap operations to the live pi.soramitsu.io liquidityProxy.swap rows', () => {
    expect(
      historyElementsFilter({
        address: 'sora-address',
        operations: [Operation.Swap],
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
              module: { equalTo: ModuleNames.LiquidityProxy },
              method: { equalTo: ModuleMethods.LiquidityProxySwap },
            },
          ],
        },
      ],
    });
  });

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

  it('ignores blank owner, asset, and search values instead of emitting broad empty filters', () => {
    expect(
      historyElementsFilter({
        address: '   ',
        assetAddress: '\n',
        query: {
          accountAddress: ' ',
          hexAddress: '\t',
          assetsAddresses: ['', '   '],
        },
      })
    ).toEqual({ and: [] });
  });

  it('trims account and asset search filters before building indexer criteria', () => {
    expect(
      historyElementsFilter({
        address: ' sora-address ',
        assetAddress: ' 0xasset ',
        query: {
          accountAddress: ' cnAccount ',
          hexAddress: ' 0xhash ',
          assetsAddresses: [' 0xasset2 ', ''],
        },
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
        { dataAssets: { contains: '0xasset' } },
        {
          or: [
            { address: { equalTo: 'cnAccount' } },
            { dataFrom: { equalTo: 'cnAccount' } },
            { dataTo: { equalTo: 'cnAccount' } },
            { dataAssets: { contains: '0xhash' } },
            { blockHash: { includesInsensitive: '0xhash' } },
            { dataAssets: { contains: '0xasset2' } },
          ],
        },
      ],
    });
  });

  it('ignores malformed query containers instead of throwing or widening the filter', () => {
    expect(
      historyElementsFilter({
        address: ' sora-address ',
        operations: [Operation.Swap],
        query: null as never,
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
              module: { equalTo: ModuleNames.LiquidityProxy },
              method: { equalTo: ModuleMethods.LiquidityProxySwap },
            },
          ],
        },
      ],
    });
    expect(historyElementsFilter(null as never)).toEqual({ and: [] });
    expect(historyElementsFilter({ query: [] as never })).toEqual({ and: [] });
  });

  it('ignores malformed array-like filters instead of iterating attacker-controlled strings', () => {
    expect(
      historyElementsFilter({
        operations: 'Swap' as never,
        ids: 'tx-id' as never,
        query: {
          operationNames: 'Swap' as never,
          assetsAddresses: '0xasset' as never,
        },
      })
    ).toEqual({ and: [] });
  });

  it('does not call attacker-controlled toString hooks while normalizing filters', () => {
    const hostile = {
      toString: vi.fn(() => {
        throw new Error('toString should not be called');
      }),
    };

    expect(
      historyElementsFilter({
        address: hostile as never,
        assetAddress: hostile as never,
        operations: [hostile as never, Operation.Swap],
        ids: [hostile as never, ' tx-a '],
        query: {
          accountAddress: hostile as never,
          hexAddress: hostile as never,
          assetsAddresses: [hostile as never, ' 0xasset '],
        },
      })
    ).toEqual({
      and: [
        {
          or: [
            {
              module: { equalTo: ModuleNames.LiquidityProxy },
              method: { equalTo: ModuleMethods.LiquidityProxySwap },
            },
          ],
        },
        {
          id: {
            in: ['tx-a'],
          },
        },
        {
          or: [{ dataAssets: { contains: '0xasset' } }],
        },
      ],
    });
    expect(hostile.toString).not.toHaveBeenCalled();
  });

  it('trims ids and drops blank or non-string id filters', () => {
    expect(
      historyElementsFilter({
        ids: [' tx-a ', '', '   ', 'tx-b', 42 as never, null as never],
      })
    ).toEqual({
      and: [
        {
          id: {
            in: ['tx-a', 'tx-b'],
          },
        },
      ],
    });
  });

  it('treats explicit malformed query operation names as restrictive instead of falling back', () => {
    expect(
      historyElementsFilter({
        address: 'sora-address',
        operations: [Operation.Swap],
        query: {
          operationNames: null as never,
        },
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

  it('drops malformed query operation entries while preserving valid ones', () => {
    expect(
      historyElementsFilter({
        operations: [Operation.EvmIncoming],
        query: {
          operationNames: [Operation.Swap, null as never, 42 as never, Operation.EvmOutgoing],
        },
      })
    ).toEqual({
      and: [
        {
          or: [
            {
              module: { equalTo: ModuleNames.LiquidityProxy },
              method: { equalTo: ModuleMethods.LiquidityProxySwap },
            },
            {
              module: { equalTo: ModuleNames.BridgeProxy },
              method: { equalTo: ModuleMethods.BridgeProxyBurn },
            },
          ],
        },
      ],
    });
  });

  it('keeps a valid zero timestamp restrictive only when it is not supplied as a positive filter', () => {
    expect(
      historyElementsFilter({
        timestamp: 0,
        ids: [' tx-a '],
      })
    ).toEqual({
      and: [
        {
          id: {
            in: ['tx-a'],
          },
        },
      ],
    });
  });

  it.each([
    ['negative timestamp', -1],
    ['NaN timestamp', Number.NaN],
    ['infinite timestamp', Number.POSITIVE_INFINITY],
    ['string timestamp', '123' as never],
  ])('ignores %s filters', (_case, timestamp) => {
    expect(historyElementsFilter({ timestamp })).toEqual({ and: [] });
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

  it('maps Substrate bridge operations to bridgeProxy burn and mint calls for indexer-backed history', () => {
    expect(
      historyElementsFilter({
        address: 'sora-address',
        operations: [Operation.SubstrateOutgoing, Operation.SubstrateIncoming],
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

  it('drops unsupported operation names while keeping supported swap filters', () => {
    expect(
      historyElementsFilter({
        address: 'sora-address',
        operations: ['UnsupportedOperation' as Operation, Operation.Swap],
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
              module: { equalTo: ModuleNames.LiquidityProxy },
              method: { equalTo: ModuleMethods.LiquidityProxySwap },
            },
          ],
        },
      ],
    });
  });

  it('does not fall back to broad operation filters when query operationNames is explicitly empty', () => {
    expect(
      historyElementsFilter({
        address: 'sora-address',
        operations: [Operation.Swap],
        query: {
          operationNames: [],
        },
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
