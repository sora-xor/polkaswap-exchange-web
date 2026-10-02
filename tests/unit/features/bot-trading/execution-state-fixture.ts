/** Entirely invented metadata/storage for browser execution-state tests; no retained chain observations. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import {
  createHistoricalFeeMetadataFixture,
  hex,
  le,
} from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';
import { createHistoricalExecutionPoolCodec } from '../../../../src/features/bot-trading/execution-codecs/pool';

/** Extend the existing synthetic fee metadata with the two exact XYK storage declarations. */
export function createExecutionStateFixture(now = 1_000_000) {
  const original = createHistoricalFeeMetadataFixture();
  const registry = new TypeRegistry();
  const metadata = new Metadata(registry, original.identity.metadataHex);
  const json = metadata.asV14.toJSON() as unknown as {
    lookup: { types: { id: number; type: unknown }[] };
    pallets: unknown[];
  };
  const first = json.lookup.types.length;
  json.lookup.types.push(
    { id: first, type: { path: [], params: [], def: { tuple: [4, 4] }, docs: [] } },
    { id: first + 1, type: { path: [], params: [], def: { tuple: [11, 11] }, docs: [] } },
    { id: first + 2, type: { path: [], params: [], def: { tuple: [2, 2] }, docs: [] } }
  );
  json.pallets.push({
    name: 'PoolXYK',
    index: 6,
    calls: null,
    events: null,
    errors: null,
    constants: [],
    storage: {
      prefix: 'PoolXYK',
      items: [
        {
          name: 'Properties',
          modifier: 'Optional',
          type: { map: { hashers: ['Blake2_128Concat', 'Blake2_128Concat'], key: first, value: first + 1 } },
          fallback: '0x00',
          docs: [],
        },
        {
          name: 'Reserves',
          modifier: 'Default',
          type: { map: { hashers: ['Blake2_128Concat', 'Blake2_128Concat'], key: first, value: first + 2 } },
          fallback: `0x${'00'.repeat(32)}`,
          docs: [],
        },
      ],
    },
  });
  const combined = new Metadata(registry, { magicNumber: 0x6174656d, metadata: { V14: json } });
  const identity = { ...original.identity, metadataHex: combined.toHex() };
  const codec = createHistoricalExecutionPoolCodec(identity);
  const proof = {
    ...original.proof,
    timestamp: hex(le(now - 6000, 8)),
    properties: `0x${'66'.repeat(32)}${'77'.repeat(32)}`,
    reserves: hex(Buffer.concat([le(1000n * 10n ** 18n), le(1000n * 10n ** 18n)])),
  };
  return {
    identity,
    proof,
    keys: codec.storageKeys(),
    now,
    pool: codec.decodeStorage(proof),
    registry: original.registry,
  };
}
