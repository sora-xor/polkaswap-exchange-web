/** Invented combined fee/pool metadata for offline accumulation evidence tests; no chain observations. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { createHistoricalFeeMetadataFixture, hex, le } from './historical-goal-bound-fee-fixture';

/**
 * Extend the synthetic signed-extension fixture without replacing any of its lookup definitions.
 * The returned registry uses the combined metadata, and proof contains the seven raw storage
 * fields accepted by createHistoricalExecutionPoolCodec. Every balance/account/time is invented.
 */
export function createAccumulationEvidenceFixture(timestampMs = 1_000_000) {
  if (!Number.isSafeInteger(timestampMs) || timestampMs <= 0) throw new Error('Invalid synthetic timestamp');
  const original = createHistoricalFeeMetadataFixture();
  const registry = new TypeRegistry(original.identity.blockHash);
  const metadata = new Metadata(registry, original.identity.metadataHex);
  const json = metadata.asV14.toJSON() as unknown as {
    lookup: { types: { id: number; type: unknown }[] };
    pallets: unknown[];
  };
  const first = Math.max(...json.lookup.types.map(({ id }) => id)) + 1;
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
  registry.register({
    Address: 'AccountId',
    ExtrinsicSignature: 'MultiSignature',
    AssetId: { code: 'H256' },
    Balance: 'u128',
    ChargeFeeInfo: { tip: 'Compact<Balance>', target_asset_id: 'AssetId' },
  });
  registry.setMetadata(combined, undefined, undefined, true);
  const identity = { ...original.identity, metadataHex: combined.toHex() };
  const proof = {
    ...original.proof,
    timestamp: hex(le(timestampMs, 8)),
    properties: `0x${'66'.repeat(32)}${'77'.repeat(32)}`,
    reserves: hex(Buffer.concat([le(1000n * 10n ** 18n), le(1000n * 10n ** 18n)])),
  };
  return { identity, registry, proof };
}
