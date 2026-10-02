import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength } from '@polkadot/util';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  assertGoalTargetRuntimeState,
  createGoalTargetRuntimeStateCodec,
  GOAL_TARGET_STATE_PROFILES,
  type GoalTargetStateReceipt,
} from '../../../../scripts/bots/goal-target-runtime-state';
import { acquireGoalTargetRuntimeState } from '../../../../scripts/bots/goal-target-runtime-transport';

const directory = new URL(
  '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/',
  import.meta.url
);
const original = (name: string) => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const encode = (bytes: Uint8Array) => `0x${Buffer.from(bytes).toString('hex')}`;
const metadataHex = (version: 130 | 131) =>
  new TypeRegistry()
    .createType('Bytes', Buffer.from(original(`metadata-${version}.json`).actualExport.resultHex.slice(2), 'hex'))
    .toHex();
const pinned = { sourceMetadataHex: metadataHex(130), targetMetadataHex: metadataHex(131) };
const codec = createGoalTargetRuntimeStateCodec(pinned);
const block = { hash: `0x${'ab'.repeat(32)}`, height: 100 };
const network = vi.fn(() => {
  throw new Error('No network in state verification');
});
const binaryPath =
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm';
const require = createRequire(import.meta.url);
beforeAll(() => vi.stubGlobal('fetch', network));
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

/** Invent RPC receipts around synthetic state; real retained metadata is the codec oracle only. */
function fixture(count = 0) {
  const registry = new TypeRegistry();
  const metadata = new Metadata(registry, pinned.sourceMetadataHex);
  registry.setMetadata(metadata);
  const entry = expandMetadata(registry, metadata).query.xstPool.enabledSynthetics;
  const members = Array.from({ length: count }, (_, index) => {
    const asset = `0x${(BigInt(index) + 100n).toString(16).padStart(64, '0')}`;
    return {
      key: encode(compactStripLength(entry({ code: asset }))[1]),
      value: registry
        .createType(registry.createLookupType(entry.meta.type.asMap.value), {
          referenceSymbol: 'TEST',
          feeRatio: { inner: '1000000000000000' },
        })
        .toHex(),
    };
  }).sort((a, b) => a.key.localeCompare(b.key, 'en'));
  const declarations = original('dispatch-130-kusd-xor-success.json').declarations as {
    key: string;
    value: string | null;
  }[];
  const properties = declarations.find((d) => d.key === codec.fixedKeys.properties)!.value;
  const pool = codec.derivePoolKeys(properties);
  const keys = [...Object.values(codec.fixedKeys), pool.poolXor, pool.poolKusd];
  const receipts: GoalTargetStateReceipt[] = [];
  const add = (method: GoalTargetStateReceipt['method'], params: unknown[], result: unknown) => {
    const id = receipts.length + 1;
    const responseBody = JSON.stringify({ jsonrpc: '2.0', id, result });
    receipts.push({
      id,
      method,
      params,
      requestBody: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      requestedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:00.001Z',
      httpStatus: 200,
      responseBody,
      responseSha256: sha(responseBody),
    });
  };
  for (const key of keys) add('state_getStorage', [key, block.hash], declarations.find((d) => d.key === key)!.value);
  let cursor: string | null = null;
  for (let offset = 0; offset < count; offset += 64) {
    const page = members.slice(offset, offset + 64).map((m) => m.key);
    add('state_getKeysPaged', [codec.xstPrefix, 64, cursor, block.hash], page);
    cursor = page.at(-1)!;
  }
  add('state_getKeysPaged', [codec.xstPrefix, 64, cursor, block.hash], []);
  for (const member of members) add('state_getStorage', [member.key, block.hash], member.value);
  const after = keys
    .filter((key) => key > (cursor ?? codec.xstPrefix) && declarations.find((d) => d.key === key)!.value !== null)
    .sort()[0];
  add('state_getKeysPaged', [null, 1, cursor ?? codec.xstPrefix, block.hash], after ? [after] : []);
  return { evidence: { sourceBlock: block, receipts }, receipts, pool, properties, members, add };
}
function alterResult(receipt: GoalTargetStateReceipt, result: unknown) {
  const responseBody = JSON.stringify({ jsonrpc: '2.0', id: receipt.id, result });
  return { ...receipt, responseBody, responseSha256: sha(responseBody) };
}
function alterParams(receipt: GoalTargetStateReceipt, params: unknown[]) {
  return {
    ...receipt,
    params,
    requestBody: JSON.stringify({ jsonrpc: '2.0', id: receipt.id, method: receipt.method, params }),
  };
}

describe('genuine-state declaration codec for exact target runtime quote/fees', () => {
  it.skipIf(!existsSync(binaryPath))(
    'composes bounded acquisition, original receipts, state verification and exact target WASM',
    async () => {
      const f = fixture(1);
      const retained: unknown[] = [];
      const responses = new Map(
        f.receipts.map((r) => [JSON.stringify([r.method, r.params]), JSON.parse(r.responseBody).result])
      );
      const transport = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        const request = JSON.parse(init!.body as string);
        const key = JSON.stringify([request.method, request.params]);
        if (!responses.has(key)) throw new Error('Unspecified synthetic RPC');
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: responses.get(key) }), {
          status: 200,
        });
      });
      const acquired = await acquireGoalTargetRuntimeState({
        blockHash: block.hash,
        pointKeys: [...Object.values(codec.fixedKeys), f.pool.poolXor, f.pool.poolKusd],
        prefix: codec.xstPrefix,
        fetch: transport as typeof fetch,
        retain: async (receipt) => {
          retained.push(receipt);
        },
      });
      expect(acquired.requests).toBe(11);
      expect(retained).toEqual(acquired.receipts);
      expect(transport).toHaveBeenCalledTimes(11);
      expect(acquired.financialActions).toBe(false);
      const verified = codec.verify({ sourceBlock: block, receipts: acquired.receipts });
      expect(verified.hostState).toEqual(codec.verify(f.evidence).hostState);
      const { createGoalTargetRuntimeHost } = require('../../../../scripts/bots/goal-target-runtime-host.cjs');
      const host = createGoalTargetRuntimeHost(readFileSync(binaryPath));
      for (const direction of ['kusd-xor', 'xor-kusd']) {
        const quote = original(`quote-131-${direction}.json`);
        const fees = original(`dispatch-131-${direction}-success.json`).feeMethods;
        for (const [api, inputHex, expected] of [
          ['LiquidityProxyAPI_quote', quote.inputHex, quote.actualExport.resultHex],
          ['TransactionPaymentApi_query_info', fees.inputHex, fees.info.resultHex],
          ['TransactionPaymentApi_query_fee_details', fees.inputHex, fees.details.resultHex],
        ])
          expect(host.invoke({ api, inputHex, state: verified.hostState })).toMatchObject({
            success: true,
            resultHex: expected,
            storageWrites: 0,
            transactionExecution: false,
            admissionGranted: false,
          });
      }
    },
    30000
  );
  it.skipIf(!existsSync(binaryPath))(
    'feeds verified source state to exact131 quote and both fee APIs in both directions',
    () => {
      const { createGoalTargetRuntimeHost } = require('../../../../scripts/bots/goal-target-runtime-host.cjs');
      const host = createGoalTargetRuntimeHost(readFileSync(binaryPath));
      for (const count of [0, 1]) {
        const state = codec.verify(fixture(count).evidence).hostState;
        for (const direction of ['kusd-xor', 'xor-kusd']) {
          const quote = original(`quote-131-${direction}.json`);
          const fees = original(`dispatch-131-${direction}-success.json`).feeMethods;
          for (const [api, inputHex, expected] of [
            ['LiquidityProxyAPI_quote', quote.inputHex, quote.actualExport.resultHex],
            ['TransactionPaymentApi_query_info', fees.inputHex, fees.info.resultHex],
            ['TransactionPaymentApi_query_fee_details', fees.inputHex, fees.details.resultHex],
          ]) {
            const result = host.invoke({ api, inputHex, state });
            expect(result).toMatchObject({
              success: true,
              resultHex: expected,
              storageWrites: 0,
              transactionExecution: false,
              admissionGranted: false,
            });
          }
        }
      }
    },
    30000
  );
  it('matches both actual metadata layouts and derives known synthetic pool keys without reading prices', () => {
    const f = fixture();
    const result = codec.verify(f.evidence);
    expect(result.profiles).toEqual(GOAL_TARGET_STATE_PROFILES);
    expect(result.poolAccount).toBe('0x54734f90f971a02c609b2d684e61b5571d2066ef8ca0b87f8f663f9c6a074b65');
    expect(Object.keys(result.hostState.entries)).toHaveLength(7);
    expect(result.hostState.prefix).toEqual({
      prefix: codec.xstPrefix,
      complete: true,
      entries: {},
      after: f.pool.poolKusd,
    });
    expect(result.provenance).toBe('rpc-storage-claims-only');
    expect(Object.isFrozen(result.hostState.entries)).toBe(true);
    expect(() => assertGoalTargetRuntimeState(result)).not.toThrow();
    expect(() => assertGoalTargetRuntimeState(JSON.parse(JSON.stringify(result)))).toThrow('unowned');
    expect(result.stateSha256).toBe(sha(JSON.stringify(result.hostState)));
  });
  it('verifies a complete nonempty map across pages with genuine global successor', () => {
    const f = fixture(65);
    const result = codec.verify(f.evidence);
    expect(result.prefixKeys).toBe(65);
    expect(Object.keys(result.hostState.prefix.entries)).toEqual(f.members.map((m) => m.key));
    expect(result.receiptCount).toBe(76);
  });
  it('supports the full declared 256-key limit and explicit global exhaustion', () => {
    const f = fixture(256);
    for (const [i, r] of f.receipts.entries()) {
      if (
        r.method === 'state_getStorage' &&
        typeof r.params[0] === 'string' &&
        !r.params[0].startsWith(codec.xstPrefix) &&
        r.params[0] > codec.xstPrefix
      )
        f.receipts[i] = alterResult(r, null);
    }
    f.receipts[f.receipts.length - 1] = alterResult(f.receipts.at(-1)!, []);
    const result = codec.verify(f.evidence);
    expect(result.receiptCount).toBe(269);
    expect(result.hostState.prefix.after).toBeNull();
  });
  it.each(['skipped', 'false-end', 'absent'])('rejects global successor contradicting known state: %s', (kind) => {
    const f = fixture();
    const last = f.receipts.length - 1;
    if (kind === 'skipped') f.receipts[last] = alterResult(f.receipts[last], [`0x${'ff'.repeat(32)}`]);
    if (kind === 'false-end') f.receipts[last] = alterResult(f.receipts[last], []);
    if (kind === 'absent') {
      const i = f.receipts.findIndex((r) => r.params[0] === f.pool.poolKusd);
      f.receipts[i] = alterResult(f.receipts[i], null);
    }
    expect(() => codec.verify(f.evidence)).toThrow('global successor');
  });
  it('preserves explicit null without converting missing source values to fallbacks', () => {
    const f = fixture();
    const i = f.receipts.findIndex((r) => r.params[0] === codec.fixedKeys.multiplier);
    f.receipts[i] = alterResult(f.receipts[i], null);
    expect(codec.verify(f.evidence).hostState.entries[codec.fixedKeys.multiplier]).toBeNull();
    f.receipts.splice(i, 1);
    expect(() => codec.verify(f.evidence)).toThrow('missing point');
  });
  it('does not infer a pool account from missing or explicit absent Properties', () => {
    const f = fixture();
    const i = f.receipts.findIndex((r) => r.params[0] === codec.fixedKeys.properties);
    f.receipts[i] = alterResult(f.receipts[i], null);
    expect(() => codec.verify(f.evidence)).toThrow('absent pool');
    f.receipts.splice(i, 1);
    expect(() => codec.verify(f.evidence)).toThrow('missing Properties');
  });
  it('derives a different pool account from Properties and refuses the former balance keys', () => {
    const f = fixture();
    const changed = `0x${'11'.repeat(32)}${(f.properties as string).slice(66)}`;
    expect(codec.derivePoolKeys(changed).poolAccount).toBe(`0x${'11'.repeat(32)}`);
    const i = f.receipts.findIndex((r) => r.params[0] === codec.fixedKeys.properties);
    f.receipts[i] = alterResult(f.receipts[i], changed);
    expect(() => codec.verify(f.evidence)).toThrow('missing point');
  });
  it.each(['sourceMetadataHex', 'targetMetadataHex'] as const)(
    'rejects changed %s and cannot use schema equality as a pin',
    (field) => {
      expect(() => createGoalTargetRuntimeStateCodec({ ...pinned, [field]: `${pinned[field]}00` })).toThrow(
        'metadata pin'
      );
      expect(() =>
        createGoalTargetRuntimeStateCodec({
          ...pinned,
          [field]: pinned[field === 'sourceMetadataHex' ? 'targetMetadataHex' : 'sourceMetadataHex'],
        })
      ).toThrow('metadata pin');
    }
  );
  it.each(['trailing', 'truncated', 'empty'])('rejects %s SCALE bytes', (kind) => {
    const f = fixture();
    const i = f.receipts.findIndex((r) => r.params[0] === codec.fixedKeys.multiplier);
    const value = JSON.parse(f.receipts[i].responseBody).result as string;
    f.receipts[i] = alterResult(
      f.receipts[i],
      kind === 'trailing' ? `${value}00` : kind === 'truncated' ? value.slice(0, -2) : '0x'
    );
    expect(() => codec.verify(f.evidence)).toThrow();
  });
  it.each(['request', 'response', 'block', 'hash', 'http', 'failure', 'duplicate'])(
    'rejects corrupt RPC %s binding',
    (kind) => {
      const f = fixture();
      const r = f.receipts[0];
      if (kind === 'request')
        f.receipts[0] = { ...r, requestBody: r.requestBody.replace('state_getStorage', 'state_getKeysPaged') };
      if (kind === 'response') f.receipts[0] = { ...r, responseBody: r.responseBody.replace('"id":1', '"id":2') };
      if (kind === 'block') f.receipts[0] = alterParams(r, [r.params[0], `0x${'cd'.repeat(32)}`]);
      if (kind === 'hash') f.receipts[0] = { ...r, responseSha256: '0'.repeat(64) };
      if (kind === 'http') f.receipts[0] = { ...r, httpStatus: 502 };
      if (kind === 'failure') Object.assign(f.receipts[0], { failure: 'timeout' });
      if (kind === 'duplicate') f.receipts.push(r);
      expect(() => codec.verify(f.evidence)).toThrow();
    }
  );
  it.each(['terminal', 'successor', 'member', 'member-null', 'extra'])('rejects missing/extra %s evidence', (kind) => {
    const f = fixture(2);
    if (kind === 'terminal')
      f.receipts.splice(
        f.receipts.findIndex(
          (r) => r.method === 'state_getKeysPaged' && JSON.parse(r.responseBody).result.length === 0
        ),
        1
      );
    if (kind === 'successor') f.receipts.pop();
    if (kind === 'member')
      f.receipts.splice(
        f.receipts.findIndex((r) => r.params[0] === f.members[0].key),
        1
      );
    if (kind === 'member-null') {
      const i = f.receipts.findIndex((r) => r.params[0] === f.members[0].key);
      f.receipts[i] = alterResult(f.receipts[i], null);
    }
    if (kind === 'extra') f.add('state_getStorage', [`0x${'12'.repeat(32)}`, block.hash], null);
    expect(() => codec.verify(f.evidence)).toThrow();
  });
  it.each(['order', 'duplicate', 'cursor', 'hash', 'global-inside', 'global-backward'])(
    'rejects invalid prefix %s',
    (kind) => {
      const f = fixture(2);
      const i = f.receipts.findIndex((r) => r.method === 'state_getKeysPaged');
      if (kind === 'order') f.receipts[i] = alterResult(f.receipts[i], f.members.map((m) => m.key).reverse());
      if (kind === 'duplicate') f.receipts[i] = alterResult(f.receipts[i], [f.members[0].key, f.members[0].key]);
      if (kind === 'cursor')
        f.receipts[i] = alterParams(f.receipts[i], [codec.xstPrefix, 64, codec.xstPrefix, block.hash]);
      if (kind === 'hash') f.receipts[i] = alterResult(f.receipts[i], [`${codec.xstPrefix}${'00'.repeat(48)}`]);
      if (kind === 'global-inside')
        f.receipts[f.receipts.length - 1] = alterResult(f.receipts.at(-1)!, [f.members.at(-1)!.key]);
      if (kind === 'global-backward')
        f.receipts[f.receipts.length - 1] = alterResult(f.receipts.at(-1)!, [codec.xstPrefix]);
      expect(() => codec.verify(f.evidence)).toThrow();
    }
  );
  it('rejects getters without executing them', () => {
    const getter = vi.fn();
    expect(() =>
      createGoalTargetRuntimeStateCodec(
        Object.defineProperty({ targetMetadataHex: pinned.targetMetadataHex }, 'sourceMetadataHex', {
          enumerable: true,
          get: getter,
        })
      )
    ).toThrow();
    const f = fixture();
    Object.defineProperty(f.receipts[0], 'responseBody', { enumerable: true, get: getter });
    expect(() => codec.verify(f.evidence)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it('rejects excess prefix pages even when every short page is individually valid', () => {
    const f = fixture(5);
    const pointReceipts = f.receipts.filter((r) => r.method === 'state_getStorage');
    f.receipts.length = 0;
    for (const r of pointReceipts) f.add(r.method, [...r.params], JSON.parse(r.responseBody).result);
    let cursor: string | null = null;
    for (const member of f.members) {
      f.add('state_getKeysPaged', [codec.xstPrefix, 64, cursor, block.hash], [member.key]);
      cursor = member.key;
    }
    f.add('state_getKeysPaged', [codec.xstPrefix, 64, cursor, block.hash], []);
    f.add('state_getKeysPaged', [null, 1, cursor, block.hash], []);
    expect(() => codec.verify(f.evidence)).toThrow('prefix pagination');
  });
});
