/** Entirely invented chain/indexer replies passed through the real original archive source and evaluator. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { types } from '@/lib/substrate/type-definitions';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  createHistoricalFeeMetadataFixture,
  feeBytes,
  hex,
} from '../../unit/scripts/bots/fixtures/historical-goal-bound-fee-fixture';
import {
  createGoalBundleMetadataFixture,
  metadataFixtureCanonical,
  metadataFixtureDigest,
} from './goal-bundle-metadata';
import {
  verifyGoalBundleMetadata,
  verifyGoalBundleCatalogMetadata,
} from '../../../src/features/bot-trading/goal-bundle-metadata';
import { createGoalBundleCatalogMetadataFixture } from './goal-bundle-catalog-metadata';
import { createHistoricalExecutionPoolCodec } from '../../../src/features/bot-trading/execution-codecs/pool';
import {
  createGoalQualificationArchiveSourceV2,
  createGoalQualificationArchiveSourceV3,
} from '../../../scripts/bots/goal-qualification-archive-reader';
import {
  createGoalEpisodeEvaluatorV2,
  createGoalEpisodeEvaluatorV3,
} from '../../../src/features/bot-trading/goal-episode-evaluator';
import { createGoalTargetRuntimeStateCodec } from '../../../scripts/bots/goal-target-runtime-state';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  GOAL_TARGET_RUNTIME_CATALOG_SHA256,
} from '../../../src/features/bot-trading/goal-target-model';
import { syntheticQualificationPlan } from '../../unit/features/bot-trading/goal-qualification-fixtures';
import {
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  GOAL_QUALIFICATION_POLICY_V3,
  GOAL_QUALIFICATION_POLICY_CATALOG_V3,
  goalQualificationDigest,
  type GoalQualificationSelection,
} from '../../../src/features/bot-trading/goal-qualification';
import { GOAL_EXACT_KUSD as KUSD, GOAL_EXACT_XOR as XOR } from '../../../src/features/bot-trading/goal-exact-ledger';
import type {
  GoalBundleTrainingInput,
  GoalBundleEpisodeInput,
  GoalBundleEpisodeReceipt,
  GoalBundleArchiveManifest,
} from '../../../src/features/bot-trading/goal-bundle-episode';

const HOUR = 3600000,
  START = 201 * HOUR,
  STEP = 60000;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const le = (number: number | bigint, bytes: number) => {
  const b = Buffer.alloc(bytes);
  let value = BigInt(number);
  for (let i = 0; i < bytes; i++) {
    b[i] = Number(value & 255n);
    value >>= 8n;
  }
  return b;
};

/** Combine the existing real fee-layout fixture with synthetic pool storage definitions. */
function codecs() {
  const fixture = createHistoricalFeeMetadataFixture(),
    registry = new TypeRegistry();
  const decoded = new Metadata(registry, fixture.identity.metadataHex as `0x${string}`);
  const body = decoded.asV14.toJSON() as unknown as { lookup: { types: unknown[] }; pallets: unknown[] };
  for (const [id, tuple] of [
    [33, [4, 4]],
    [34, [11, 11]],
    [35, [2, 2]],
  ] as const)
    body.lookup.types.push({ id, type: { path: [], params: [], docs: [], def: { tuple } } });
  body.pallets.push({
    name: 'PoolXYK',
    calls: null,
    events: null,
    errors: null,
    constants: [],
    index: 6,
    storage: {
      prefix: 'PoolXYK',
      items: [
        {
          name: 'Properties',
          modifier: 'Optional',
          type: { map: { hashers: ['Blake2_128Concat', 'Blake2_128Concat'], key: 33, value: 34 } },
          fallback: '0x00',
          docs: [],
        },
        {
          name: 'Reserves',
          modifier: 'Default',
          type: { map: { hashers: ['Blake2_128Concat', 'Blake2_128Concat'], key: 33, value: 35 } },
          fallback: `0x${'00'.repeat(32)}`,
          docs: [],
        },
      ],
    },
  });
  const metadata = new Metadata(registry, { magicNumber: 0x6174656d, metadata: { V14: body } });
  fixture.identity.metadataHex = metadata.toHex();
  fixture.registry.setMetadata(metadata, undefined, undefined, true);
  const proof = {
    ...fixture.proof,
    properties: `${hash(800)}${hash(801).slice(2)}`,
    reserves: hex(Buffer.concat([le(1000000n * 10n ** 18n, 16), le(1000000n * 10n ** 18n, 16)])),
  };
  return { ...fixture, proof };
}

/** Real private metadata capability and complete original semantic wrappers; never uses a live fetch. */
export async function createGoalBundleEpisodeFixture(
  cancelAtDeadline = false,
  startAtMs = START,
  targetRuntime = false,
  catalogRuntime = false,
  onProgress: (stage: string) => void = () => undefined
) {
  if (catalogRuntime && !targetRuntime) throw Error('Catalog fixture requires target runtime');
  const codec = codecs(),
    firstHeight = 20000,
    lastHeight = firstHeight + 1443,
    endAtMs = startAtMs + 24 * HOUR;
  let targetBinary: Uint8Array | undefined;
  let targetCodec: ReturnType<typeof createGoalTargetRuntimeStateCodec> | undefined;
  let targetDeclarations: Map<string, string | null> | undefined;
  if (targetRuntime) {
    const directory = new URL(
      '../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/',
      import.meta.url
    );
    const synthetic = (name: string) => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
    const metadata = (version: number) =>
      new TypeRegistry()
        .createType('Bytes', Buffer.from(synthetic(`metadata-${version}.json`).actualExport.resultHex.slice(2), 'hex'))
        .toHex();
    codec.identity.metadataHex = metadata(130);
    targetBinary = readFileSync(
      '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
    );
    targetCodec = createGoalTargetRuntimeStateCodec({
      sourceMetadataHex: codec.identity.metadataHex,
      targetMetadataHex: metadata(131),
    });
    targetDeclarations = new Map(
      (synthetic('dispatch-130-kusd-xor-success.json').declarations as { key: string; value: string | null }[]).map(
        (r) => [r.key, r.value]
      )
    );
    const poolKeys = createHistoricalExecutionPoolCodec(codec.identity).storageKeys();
    for (const key of ['kusd', 'xor', 'dex0', 'properties', 'reserves'] as const) {
      const value = targetDeclarations.get(poolKeys[key]);
      if (!value) throw Error('Missing invented exact-runtime pool declaration');
      codec.proof[key] = value as never;
    }
    if (catalogRuntime) {
      // Match the invented history's balanced pool so the real .21 XOR fee cap
      // can exercise fills within the unchanged 5% drawdown limit.
      const registry = new TypeRegistry();
      registry.register(types);
      const metadata = new Metadata(registry, codec.identity.metadataHex as `0x${string}`);
      registry.setMetadata(metadata, undefined, undefined, true);
      const query = expandMetadata(registry, metadata).query;
      const valueType = (entry: typeof query.system.account) =>
        registry.createLookupType(entry.meta.type.isPlain ? entry.meta.type.asPlain : entry.meta.type.asMap.value);
      const pool = targetCodec.derivePoolKeys(codec.proof.properties);
      const balance = (1000000n * 10n ** 18n).toString();
      const xorType = valueType(query.system.account);
      const kusdType = valueType(query.tokens.accounts);
      const xorAccount = registry.createType(xorType, targetDeclarations.get(pool.poolXor)).toJSON() as unknown as {
        data: { free: string };
      };
      const kusdAccount = registry.createType(kusdType, targetDeclarations.get(pool.poolKusd)).toJSON() as unknown as {
        free: string;
      };
      xorAccount.data.free = balance;
      kusdAccount.free = balance;
      targetDeclarations.set(pool.poolXor, registry.createType(xorType, xorAccount).toHex());
      targetDeclarations.set(pool.poolKusd, registry.createType(kusdType, kusdAccount).toHex());
      codec.proof.reserves = registry.createType(valueType(query.poolXYK.reserves), [balance, balance]).toHex();
      targetDeclarations.set(poolKeys.reserves, codec.proof.reserves);
    }
  }
  const timestampOffsetMs = startAtMs - firstHeight * STEP - (cancelAtDeadline ? 120100 : 120000);
  const versionAt = (height: number): 128 | 129 | 130 =>
    height < firstHeight + 60 ? 128 : height < firstHeight + 120 ? 129 : 130;
  const catalogFixture = catalogRuntime
    ? await createGoalBundleCatalogMetadataFixture('training', {
        firstHeight,
        lastHeight,
        blockIntervalMs: STEP,
        timestampOffsetMs,
        startAtMs,
        endAtMs,
        versionAt,
        schemaAnchorHeights: [firstHeight, firstHeight + 90, firstHeight + 180],
        onProgress,
      })
    : undefined;
  onProgress('metadata-collected');
  const metadataFixture =
    catalogFixture ??
    (await createGoalBundleMetadataFixture({
      firstHeight,
      lastHeight,
      blockIntervalMs: STEP,
      timestampOffsetMs,
      startAtMs,
      endAtMs,
      metadataHex: codec.identity.metadataHex,
      ...(targetRuntime ? { codeHash: GOAL_TARGET_MODEL_PROFILES.source.codeHash } : {}),
    }));
  const metadata = catalogFixture
    ? await verifyGoalBundleCatalogMetadata(catalogFixture.binding, {
        catalog: catalogFixture.catalog,
        readArtifact: catalogFixture.readArtifact,
      })
    : await verifyGoalBundleMetadata(metadataFixture.binding, { readArtifact: metadataFixture.readArtifact });
  onProgress('metadata-verified');
  const at = (height: number) => ({
    height,
    hash: hash(height),
    parentHash: hash(height - 1),
    timestampMs: timestampOffsetMs + height * STEP,
  });
  const keys = createHistoricalExecutionPoolCodec(codec.identity).storageKeys();
  const plan = syntheticQualificationPlan();
  plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
  plan.policy = GOAL_QUALIFICATION_POLICY_V2;
  if (targetRuntime) {
    const hashFile = (name: string) =>
      createHash('sha256')
        .update(readFileSync(new URL(`../../../scripts/bots/${name}`, import.meta.url)))
        .digest('hex');
    plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V3;
    plan.policy = GOAL_QUALIFICATION_POLICY_V3;
    plan.executionModel = {
      protocol: GOAL_TARGET_MODEL_PROTOCOL,
      sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source,
      targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
      targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
      implementation: {
        hostSha256: hashFile('goal-target-runtime-host.cjs'),
        stateCodecSha256: hashFile('goal-target-runtime-state.ts'),
        quoteCodecSha256: hashFile('goal-target-runtime-quote.ts'),
      },
      stateModel: 'source130-exact-storage-complete-xst-v1',
      fillModel: 'minimum-output-hypothetical-no-market-feedback',
      costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '2000000000000000' },
    };
    if (catalogFixture) {
      const original = plan.executionModel;
      plan.policy = GOAL_QUALIFICATION_POLICY_CATALOG_V3;
      plan.executionModel = {
        protocol: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
        sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
        catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
        targetRuntimeProfile: original.targetRuntimeProfile,
        targetCompressedSha256: original.targetCompressedSha256,
        implementation: {
          ...original.implementation,
          catalogCodecSha256: createHash('sha256')
            .update(
              readFileSync(
                new URL('../../../src/features/bot-trading/execution-codecs/runtime-catalog.ts', import.meta.url)
              )
            )
            .digest('hex'),
        },
        stateModel: 'catalog-source-exact-storage-complete-xst-v1',
        fillModel: original.fillModel,
        costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '210000000000000000' },
      };
    }
  }
  plan.training = { ...plan.training, startAtMs, endAtMs: startAtMs + 116 * HOUR };
  plan.validation = { ...plan.validation, startAtMs: startAtMs + 118 * HOUR, endAtMs: startAtMs + 167 * HOUR };
  const { signalTiming: _timing, ...strategy } = plan.candidates[0].strategy;
  plan.candidates = [{ ...plan.candidates[0], strategy: { ...strategy, kind: 'dca' } }];
  plan.runtimeProfiles = catalogFixture
    ? [...GOAL_CATALOG_TARGET_SOURCE_PROFILES]
    : [
        {
          specVersion: 130,
          transactionVersion: 130,
          metadataSha256:
            'metadataSha256' in metadata.provenance.schema ? metadata.provenance.schema.metadataSha256 : '',
          codeHash: 'codeHash' in metadata.provenance.schema ? metadata.provenance.schema.codeHash : '',
        },
      ];
  const partition = {
    identitySha256: plan.training.identitySha256,
    blocksSha256: metadataFixture.binding.blocksSha256,
    receiptSha256: metadataFixture.binding.verificationSha256,
    source: metadata.provenance.source,
  };
  const manifest: GoalBundleArchiveManifest = {
    protocol: targetRuntime ? 'goal-qualification-archive-source-v3' : 'goal-qualification-archive-source-v2',
    sourceId: plan.source.sourceId,
    genesisHash: codec.identity.genesisHash,
    denominator: '1',
    warmupHours: 200,
    captureModel: {
      kind: 'fixed-pinned-capture-delays-v1',
      historyReadMs: 1000,
      indexerPublicationDelayMs: 0,
      markReadMs: 100,
      quoteAndFeeReadMs: 100,
    },
    partitions: { training: partition, validation: { ...partition, identitySha256: plan.validation.identitySha256 } },
    accessAuditSha256: 'c'.repeat(64),
    operationalIngestionSha256: ['d'.repeat(64)],
    maximumHttpRequests: 10000,
    maximumResponseBytes: 256 * 1024 * 1024,
  };
  plan.source = { ...plan.source, manifestSha256: goalQualificationDigest(manifest) };
  const request: GoalBundleTrainingInput['request'] = {
    planSha256: goalQualificationDigest(plan),
    candidate: plan.candidates[0],
    candidateSha256: goalQualificationDigest(plan.candidates[0]),
    phase: 'training',
    partitionIdentitySha256: plan.training.identitySha256,
    startAtMs,
    endAtMs,
    episodeIndex: 0,
  };
  const registration: GoalBundleTrainingInput['registration'] = {
    planSha256: request.planSha256,
    registrationSha256: 'e'.repeat(64),
    trainingIdentitySha256: plan.training.identitySha256,
    validationIdentitySha256: plan.validation.identitySha256,
    kind: 'preregistered-unopened-validation',
  };
  const fetcher: typeof fetch = async (url, init) => {
    if (String(url) === 'https://pi.soramitsu.io/graphql') {
      const { variables } = JSON.parse(String(init!.body)),
        asset = variables.filter.assetId.equalTo;
      const from = variables.filter.timestamp.greaterThanOrEqualTo * 1000,
        until = variables.filter.timestamp.lessThan * 1000;
      const count = (until - from) / HOUR,
        start = variables.after ? Number(variables.after) : 0,
        end = Math.min(count, start + 100);
      const edges = Array.from({ length: end - start }, (_, i) => {
        const openedAtMs = from + (start + i) * HOUR,
          completedAtMs = openedAtMs + HOUR;
        const height = Math.floor((completedAtMs - 1 - timestampOffsetMs) / STEP),
          closing = at(height),
          successor = at(height + 1);
        const timestamp = Math.floor(closing.timestampMs / 1000);
        return {
          node: {
            id: `asset-${asset}-HOUR-${openedAtMs / 1000}`,
            assetId: asset,
            type: 'HOUR',
            timestamp,
            denominator: '1',
            closeEvidence: {
              kind: 'finalized-hour-close',
              genesisHash: codec.identity.genesisHash,
              completedAt: completedAtMs / 1000,
              timestamp,
              blockHeight: height,
              nextBlockHeight: height + 1,
              blockHash: closing.hash,
              nextBlockHash: successor.hash,
              nextTimestamp: Math.floor(successor.timestampMs / 1000),
              requestedSymbol: asset === XOR ? 'XOR' : 'KUSD',
              symbol: asset === XOR ? 'XOR' : 'KUSD',
              decimals: 18,
              xorPool:
                asset === XOR
                  ? null
                  : {
                      baseAssetId: XOR,
                      targetAssetId: KUSD,
                      baseDecimals: 18,
                      targetDecimals: 18,
                      baseAssetReserves: '1000000000000000000000000',
                      targetAssetReserves: '1000000000000000000000000',
                    },
            },
          },
        };
      });
      return new Response(
        JSON.stringify({
          data: {
            assetSnapshots: {
              edges,
              pageInfo: { hasNextPage: end < count, endCursor: end < count ? String(end) : null },
            },
          },
        })
      );
    }
    if (String(url) !== 'https://mof2.sora.org/') throw Error('Unexpected synthetic endpoint');
    const { id, method, params } = JSON.parse(String(init!.body)) as { id: number; method: string; params: unknown[] };
    let result: unknown;
    if (method === 'chain_getBlockHash')
      result = params[0] === 0 ? codec.identity.genesisHash : hash(Number(params[0]));
    else if (method === 'chain_getFinalizedHead') result = hash(lastHeight + 1100);
    else if (method === 'chain_getHeader') {
      const height = Number(BigInt(String(params[0])));
      result = {
        number: `0x${height.toString(16)}`,
        parentHash: hash(height - 1),
        stateRoot: hash(3),
        extrinsicsRoot: hash(4),
        digest: { logs: [] },
      };
    } else if (method === 'state_getRuntimeVersion') {
      const version = catalogFixture ? versionAt(Number(BigInt(String(params[0])))) : 130;
      result = { specName: 'sora-substrate', specVersion: version, transactionVersion: version, apis: [] };
    } else if (method === 'state_getStorageHash')
      result = catalogFixture
        ? catalogFixture.catalog.entries.find(
            (entry) => entry.profile.specVersion === versionAt(Number(BigInt(String(params[1]))))
          )!.profile.codeHash
        : 'codeHash' in metadata.provenance.schema
          ? metadata.provenance.schema.codeHash
          : undefined;
    else if (method === 'state_getMetadata')
      result = catalogFixture
        ? catalogFixture.catalog.entries.find(
            (entry) => entry.profile.specVersion === versionAt(Number(BigInt(String(params[0]))))
          )!.metadataHex
        : codec.identity.metadataHex;
    else if (method === 'state_getStorage' || method === 'state_queryStorageAt') {
      const height = Number(BigInt(String(params[1]))),
        proof = { ...codec.proof, timestamp: hex(le(at(height).timestampMs, 8)) };
      const valuesByKey = Object.fromEntries(
        Object.entries(keys).map(([label, key]) => [key, proof[label as keyof typeof proof]])
      );
      result =
        method === 'state_getStorage'
          ? Object.hasOwn(valuesByKey, String(params[0]))
            ? valuesByKey[String(params[0])]
            : targetDeclarations?.get(String(params[0]))
          : [{ block: params[1], changes: (params[0] as string[]).map((key) => [key, valuesByKey[key]]) }];
    } else if (method === 'state_getKeysPaged' && targetCodec && targetDeclarations) {
      if (params[0] === targetCodec.xstPrefix) result = [];
      else {
        const pool = targetCodec.derivePoolKeys(codec.proof.properties);
        result = [...Object.values(targetCodec.fixedKeys), pool.poolXor, pool.poolKusd]
          .filter((k) => k > String(params[2]) && targetDeclarations!.get(k) !== null)
          .sort()
          .slice(0, 1);
      }
    } else if (method === 'liquidityProxy_quote')
      result = {
        amount: params[3],
        amount_without_impact: params[3],
        route: [params[1], params[2]],
        fee: { [XOR]: '1' },
      };
    else if (method === 'state_call')
      result =
        params[0] === 'TransactionPaymentApi_query_info'
          ? hex(
              codec.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '11' }).toU8a()
            )
          : feeBytes(1, 7, 3);
    else throw Error('Unexpected synthetic RPC');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }));
  };
  /** Reuse the identical invented wire oracle under another pinned original request/selection. */
  const runOriginal = async (
    input: Omit<GoalBundleEpisodeInput, 'receipts'>,
    selection?: Readonly<GoalQualificationSelection>
  ) => {
    const { plan, manifest, registration, request, metadata } = input;
    const values = new Map<string, unknown>(),
      receipts: GoalBundleEpisodeReceipt[] = [],
      artifacts = new Map<string, Uint8Array>();
    const retain = (name: string, value: unknown) => {
      if (values.has(name)) throw Error('Duplicate synthetic episode artifact');
      const detached = JSON.parse(JSON.stringify(value));
      values.set(name, detached);
      const sha256 = metadataFixtureDigest(detached),
        bytes = Buffer.byteLength(metadataFixtureCanonical(detached));
      receipts.push({ name, sha256, bytes });
      artifacts.set(
        name,
        new TextEncoder().encode(
          metadataFixtureCanonical({
            kind: 'goal-study-raw-evidence-v1',
            requestSha256: goalQualificationDigest(request),
            name,
            sha256,
            value: detached,
          }) + '\n'
        )
      );
      if (receipts.length % 500 === 0) onProgress(`original-artifacts-${receipts.length}`);
      return { sha256, bytes };
    };
    const source = (targetRuntime ? createGoalQualificationArchiveSourceV3 : createGoalQualificationArchiveSourceV2)(
      { plan, manifest, registration, request, blocks: metadata.blocks },
      {
        fetch: fetcher,
        sink: { retainEvidence: async (name, value) => retain(name, value) },
        ...(targetBinary ? { targetCompressedBytes: targetBinary } : {}),
        ...(catalogFixture ? { catalog: catalogFixture.catalog } : {}),
      }
    );
    const trace = await (targetRuntime ? createGoalEpisodeEvaluatorV3 : createGoalEpisodeEvaluatorV2)({
      plan,
      source,
    }).evaluate(request, selection);
    onProgress('original-complete');
    return {
      input: { ...input, receipts },
      trace,
      artifacts,
      values,
      retain,
      readArtifact: async (name: string) => {
        const value = artifacts.get(name);
        if (!value) throw Error('Missing synthetic episode artifact');
        return new Uint8Array(value);
      },
    };
  };
  const original = await runOriginal({
    plan,
    manifest,
    registration,
    request,
    metadataBinding: metadataFixture.binding,
    metadata,
  });
  return {
    ...original,
    metadataFixture,
    metadataHex: codec.identity.metadataHex,
    runOriginal,
    catalog: catalogFixture?.catalog,
  };
}
