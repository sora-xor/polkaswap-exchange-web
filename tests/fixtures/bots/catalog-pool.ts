/** Genuine schema bytes with entirely invented chain headers and pool storage; no market observations. */
import { readFile } from 'node:fs/promises';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { types } from '@/lib/substrate/type-definitions';
import {
  createGoalRuntimeCatalog,
  type GoalRuntimeCatalog,
} from '@/features/bot-trading/execution-codecs/runtime-catalog';
import { HISTORICAL_EXECUTION_XOR as XOR } from '@/features/bot-trading/execution-codecs/execution';

export const catalogPoolHash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
export const CATALOG_POOL_DENOMINATOR = '100000000000000000000000000000000000000';
/** Read only the four retained public metadata files and establish the real private catalog capability. */
export async function loadCatalogPoolFixture() {
  const schemas = await Promise.all(
    [128, 129, 130].map(
      async (version) =>
        JSON.parse(
          await readFile(
            `output/go-history/partial-target-window-metadata-20260921/source-schemas/source${version}-unverified-schema.json`,
            'utf8'
          )
        ).metadataHex as string
    )
  );
  const target = JSON.parse(
    await readFile(
      'output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/metadata-131.json',
      'utf8'
    )
  );
  return createGoalRuntimeCatalog({
    source128MetadataHex: schemas[0],
    source129MetadataHex: schemas[1],
    source130MetadataHex: schemas[2],
    target131MetadataHex: new TypeRegistry()
      .createType('Bytes', Buffer.from(target.actualExport.resultHex.slice(2), 'hex'))
      .toHex(),
  });
}
/** Encode arbitrary invented values through the selected genuine storage schema. */
export function catalogPoolStorageFixture(catalog: GoalRuntimeCatalog, version: number) {
  const entry = catalog.entries.find((item) => item.profile.specVersion === version)!;
  const registry = new TypeRegistry();
  registry.register(types);
  const metadata = new Metadata(registry, hexToU8a(entry.metadataHex));
  registry.setMetadata(metadata, undefined, undefined, true);
  const query = expandMetadata(registry, metadata).query;
  const entries = {
    timestamp: query.timestamp.now,
    denominator: query.denomination.denominator,
    kusd: query.assets.assetInfosV2,
    xor: query.assets.assetInfosV2,
    dex0: query.dexManager.dexInfos,
    properties: query.poolXYK.properties,
    reserves: query.poolXYK.reserves,
  };
  type Label = keyof typeof entries;
  const encode = (label: Label, value: unknown) => {
    const type = entries[label].meta.type;
    return u8aToHex(
      registry.createType(registry.createLookupType(type.isPlain ? type.asPlain : type.asMap.value), value).toU8a()
    );
  };
  const proof = (height = 124): Record<Label, string | null> => ({
    timestamp: encode('timestamp', height * 6000),
    denominator: encode('denominator', CATALOG_POOL_DENOMINATOR),
    kusd: encode('kusd', {
      symbol: 'KUSD',
      name: 'Invented KUSD',
      precision: 18,
      isMintable: true,
      contentSource: null,
      description: null,
    }),
    xor: encode('xor', {
      symbol: 'XOR',
      name: 'Invented XOR',
      precision: 18,
      isMintable: true,
      contentSource: null,
      description: null,
    }),
    dex0: encode('dex0', { baseAssetId: { code: XOR }, syntheticBaseAssetId: { code: XOR }, isPublic: true }),
    properties: encode('properties', [catalogPoolHash(8000), catalogPoolHash(8001)]),
    reserves: encode('reserves', ['3000000000000000000', '2000000000000000000']),
  });
  return { entry, encode, proof };
}
