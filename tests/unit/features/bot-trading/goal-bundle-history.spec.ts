// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { verifyGoalHistoryArtifact, type GoalHistoryArtifactContext } from '@/features/bot-trading/goal-bundle-history';
import { goalRawEvidenceDigest, goalRawBytesSha256 } from '@/features/bot-trading/goal-raw-envelope';
import { readGoalQualificationHistory } from '../../../../scripts/bots/goal-qualification-history-reader';
import type { GoalQualificationClockBlock } from '@/features/bot-trading/goal-qualification-clock';
vi.unmock('@polkadot/util-crypto');
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
}));
const HOUR = 3600000,
  START = Date.UTC(2026, 0, 1),
  HOURS = 201;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
function row(assetId: string, index: number) {
  const open = START / 1000 + index * 3600,
    height = 100 + index * 600;
  return {
    id: `asset-${assetId}-HOUR-${open}`,
    assetId,
    type: 'HOUR',
    timestamp: open + 3590,
    denominator: '100',
    closeEvidence: {
      kind: 'finalized-hour-close',
      genesisHash: GENESIS,
      completedAt: open + 3600,
      timestamp: open + 3590,
      blockHeight: height,
      nextBlockHeight: height + 1,
      blockHash: hash(height),
      nextBlockHash: hash(height + 1),
      nextTimestamp: open + 3601,
      requestedSymbol: assetId === XOR ? 'XOR' : 'KUSD',
      symbol: assetId === XOR ? 'XOR' : 'KUSD',
      decimals: 18,
      xorPool:
        assetId === XOR
          ? null
          : {
              baseAssetId: XOR,
              targetAssetId: KUSD,
              baseDecimals: 18,
              targetDecimals: 18,
              baseAssetReserves: '1000000000000000000',
              targetAssetReserves: '7000000000000000001',
            },
    },
  };
}
async function fixture() {
  const calls = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const { variables } = JSON.parse(init!.body as string),
      asset = variables.filter.assetId.equalTo,
      start = variables.after ? Number(variables.after) : 0,
      end = Math.min(HOURS, start + 100);
    return new Response(
      JSON.stringify({
        data: {
          assetSnapshots: {
            edges: Array.from({ length: end - start }, (_, i) => ({ node: row(asset, start + i) })),
            pageInfo: { hasNextPage: end < HOURS, endCursor: end < HOURS ? String(end) : null },
          },
        },
      })
    );
  });
  const result = await readGoalQualificationHistory(
    { startAtMs: START, endAtMs: START + HOURS * HOUR, genesisHash: GENESIS, denominator: '100' },
    { fetch: calls as typeof fetch }
  );
  const value = JSON.parse(JSON.stringify(result)) as typeof result;
  const binding = { name: 'history-1.json', requestSha256: 'a'.repeat(64), valueSha256: goalRawEvidenceDigest(value) };
  const context: GoalHistoryArtifactContext = {
    checkId: 1,
    checkedAtMs: START + HOURS * HOUR + 18000,
    cutoffAtMs: START + HOURS * HOUR + 24000,
    completedAtMs: START + HOURS * HOUR,
    genesisHash: GENESIS,
    denominator: '100',
    historyReadMs: 10,
    finalityDelayMs: 12000,
    indexerPublicationDelayMs: 2000,
  };
  const blocks = new Map<number, GoalQualificationClockBlock>();
  for (let i = 0; i < HOURS; i++) {
    const height = 100 + i * 600,
      opening = START + i * HOUR;
    blocks.set(height, { height, hash: hash(height), parentHash: hash(height - 1), timestampMs: opening + 3590001 });
    blocks.set(height + 1, {
      height: height + 1,
      hash: hash(height + 1),
      parentHash: hash(height),
      timestampMs: opening + 3601001,
    });
  }
  const metadata = {
    firstHeight: 100,
    lastHeight: 100 + (HOURS - 1) * 600 + 1,
    blockAtHeight: (height: number) => blocks.get(height),
  };
  const encode = () => {
    binding.valueSha256 = goalRawEvidenceDigest(value);
    return new TextEncoder().encode(
      canonical({
        kind: 'goal-study-raw-evidence-v1',
        name: binding.name,
        requestSha256: binding.requestSha256,
        sha256: binding.valueSha256,
        value,
      }) + '\n'
    );
  };
  const verify = () => verifyGoalHistoryArtifact(encode(), binding, context, metadata);
  const mutatePage = (index: number, edit: (value: any) => void) => {
    const receipt = value.rpcEvidence[index] as Record<string, unknown>,
      page = JSON.parse(receipt.responseBody as string);
    edit(page);
    receipt.responseBody = JSON.stringify(page);
    const bytes = new TextEncoder().encode(receipt.responseBody as string);
    receipt.responseSha256 = goalRawBytesSha256(bytes);
    receipt.bytes = bytes.length;
  };
  return { value, binding, context, blocks, metadata, encode, verify, mutatePage, calls };
}
describe('browser original history artifact verification', () => {
  it('reconstructs all201 exact paired hours from original reader receipts, joins metadata and returns original value SHA', async () => {
    const f = await fixture(),
      network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('no network'));
    try {
      const result = f.verify();
      expect(result.history).toEqual(f.value.history);
      expect(result.history).not.toBe(f.value.history);
      expect(result.history.history.candles).toHaveLength(201);
      expect(result.history.history.candles[0].close).toBe('7.000000000000000001');
      expect(result.evidenceSha256).toBe(f.binding.valueSha256);
      expect(result.availableAtMs).toBe(f.context.checkedAtMs + 10);
      expect(Object.isFrozen(result.history.history.candles)).toBe(true);
      expect(Object.isFrozen(result.history.history.candles[0])).toBe(true);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
  it('preserves original reader warmup attestations before the collected range and requires latest canonical publication', async () => {
    const f = await fixture(),
      full = f.verify();
    f.metadata.firstHeight = 100 + (HOURS - 1) * 600;
    for (const height of f.blocks.keys()) if (height < f.metadata.firstHeight) f.blocks.delete(height);
    const bounded = f.verify();
    expect(bounded).toEqual(full);
    expect(bounded.history).toEqual(f.value.history);
    expect(bounded.history.boundaries).toHaveLength(201);
    f.blocks.delete(f.metadata.firstHeight);
    expect(f.verify).toThrow();
  });
  it('rejects a latest boundary outside coverage, later out-of-range attestations and false coverage', async () => {
    const f = await fixture();
    f.metadata.firstHeight = f.metadata.lastHeight;
    expect(f.verify).toThrow('latest-metadata-coverage');
    f.metadata.firstHeight = 100;
    f.metadata.lastHeight--;
    expect(f.verify).toThrow('metadata-coverage');
    f.metadata.firstHeight = 0;
    expect(f.verify).toThrow('metadata');
  });
  it('checks the canonical successor parent when the warmup boundary straddles coverage', async () => {
    const f = await fixture();
    f.metadata.firstHeight = 101;
    f.blocks.delete(100);
    expect(f.verify().history).toEqual(f.value.history);
    f.blocks.get(101)!.parentHash = hash(9999);
    expect(f.verify).toThrow('metadata-adjacency');
  });
  it('uses modeled metadata availability while keeping volatile acquisition times only in the original digest', async () => {
    const f = await fixture(),
      first = f.verify();
    f.value.rpcEvidence.forEach((r, i) => Object.assign(r, { requestedAtMs: 42 + i * 2, completedAtMs: 43 + i * 2 }));
    const shifted = f.verify();
    expect(shifted.history).toEqual(first.history);
    expect(shifted.availableAtMs).toBe(first.availableAtMs);
    expect(shifted.evidenceSha256).not.toBe(first.evidenceSha256);
    expect(shifted.history.boundaries[0].arrivalTimeKnown).toBe(false);
  });
  it('does not accept saved normalized prices without independently matching raw receipts', async () => {
    const f = await fixture();
    f.value.history.history.candles[0].close = '999';
    expect(f.verify).toThrow('projection');
  });
  it('rejects corrupt body bytes even when the enclosing original value digest is recomputed', async () => {
    const f = await fixture();
    Object.assign(f.value.rpcEvidence[0], { responseBody: f.value.rpcEvidence[0].responseBody + ' ' });
    expect(f.verify).toThrow('body-hash');
  });
  it.each([
    'asset',
    'timestamp',
    'denominator',
    'boundary',
    'missing-hour',
    'duplicate-hour',
    'precision',
    'symbol',
    'genesis',
  ])('rejects corrupted raw %s instead of trusting saved projection', async (kind) => {
    const f = await fixture();
    f.mutatePage(0, (page) => {
      const rows = page.data.assetSnapshots.edges,
        node = rows[0].node;
      if (kind === 'asset') node.assetId = XOR;
      if (kind === 'timestamp') node.timestamp = START / 1000 - 1;
      if (kind === 'denominator') node.denominator = '1';
      if (kind === 'boundary') node.closeEvidence.nextBlockHash = hash(9999);
      if (kind === 'missing-hour') rows.shift();
      if (kind === 'duplicate-hour') rows[1] = rows[0];
      if (kind === 'precision') node.closeEvidence.xorPool.targetDecimals = 6;
      if (kind === 'symbol') node.closeEvidence.requestedSymbol = 'DAI';
      if (kind === 'genesis') node.closeEvidence.genesisHash = hash(0);
    });
    expect(f.verify).toThrow();
  });
  it.each(['query', 'range', 'cursor', 'type'])('rejects changed exact GraphQL request %s', async (kind) => {
    const f = await fixture(),
      r = f.value.rpcEvidence[1],
      request = JSON.parse(r.requestBody);
    if (kind === 'query') request.query += ' ';
    if (kind === 'range') request.variables.filter.timestamp.lessThan++;
    if (kind === 'cursor') request.variables.after = 'unrelated';
    if (kind === 'type') request.variables.filter.type.equalTo = 'DAY';
    Object.assign(r, { requestBody: JSON.stringify(request) });
    expect(f.verify).toThrow('request');
  });
  it('rejects cycles in cursor pagination, extra pages, non200 and incomplete receipts', async () => {
    const f = await fixture();
    f.mutatePage(1, (p) => {
      p.data.assetSnapshots.pageInfo.endCursor = '100';
    });
    expect(f.verify).toThrow('cursor');
    const g = await fixture();
    (g.value.rpcEvidence as unknown[]).push(g.value.rpcEvidence[0]);
    expect(g.verify).toThrow('extra-page');
    const h = await fixture();
    Object.assign(h.value.rpcEvidence[0], { httpStatus: 502 });
    expect(h.verify).toThrow('receipt-identity');
    const j = await fixture();
    Object.assign(j.value.rpcEvidence[0], { complete: false });
    expect(j.verify).toThrow('receipt-identity');
  });
  it.each(['hash', 'timestamp', 'parent', 'missing'])(
    'requires original canonical metadata for each %s',
    async (kind) => {
      const f = await fixture(),
        block = f.blocks.get(101)!;
      if (kind === 'hash') block.hash = hash(9000);
      if (kind === 'timestamp') block.timestampMs += 1000;
      if (kind === 'parent') block.parentHash = hash(9000);
      if (kind === 'missing') f.blocks.delete(101);
      expect(f.verify).toThrow();
    }
  );
  it('rejects unobserved history before publication and history finishing after the check cutoff', async () => {
    const f = await fixture();
    f.context.checkedAtMs = f.context.completedAtMs + 15998;
    expect(f.verify).toThrow('awaiting-history');
    f.context.checkedAtMs = f.context.completedAtMs + 18000;
    f.context.historyReadMs = 6001;
    expect(f.verify).toThrow('availability');
  });
  it('binds original logical check name, fixed window, denominator and mainnet identity', async () => {
    const f = await fixture();
    f.context.checkId = 2;
    expect(f.verify).toThrow('name');
    f.context.checkId = 1;
    f.context.denominator = '1';
    expect(f.verify).toThrow('history');
    f.context.denominator = '100';
    f.context.completedAtMs -= HOUR;
    expect(f.verify).toThrow('context');
    const g = await fixture();
    g.context.genesisHash = hash(0);
    expect(g.verify).toThrow('context');
  });
  it('enforces per-response and aggregate original body byte limits', async () => {
    const f = await fixture();
    for (const r of f.value.rpcEvidence) {
      const body = r.responseBody! + ' '.repeat(1500000);
      const bytes = new TextEncoder().encode(body);
      Object.assign(r, { responseBody: body, bytes: bytes.length, responseSha256: goalRawBytesSha256(bytes) });
    }
    expect(f.verify).toThrow('body-hash');
    const g = await fixture(),
      r = g.value.rpcEvidence[0];
    const body = r.responseBody! + ' '.repeat(2097152),
      bytes = new TextEncoder().encode(body);
    Object.assign(r, { responseBody: body, bytes: bytes.length, responseSha256: goalRawBytesSha256(bytes) });
    expect(g.verify).toThrow('body-hash');
  });
  it('rejects an acquisition duration outside the original maximum30s operation', async () => {
    const f = await fixture();
    f.value.rpcEvidence.forEach((r, i) => Object.assign(r, { requestedAtMs: i * 10000, completedAtMs: i * 10000 + 1 }));
    expect(f.verify).toThrow('acquisition-duration');
  });
  it('rejects receipt acquisition regressions but never consults the current wall clock', async () => {
    const f = await fixture();
    Object.assign(f.value.rpcEvidence[0], { requestedAtMs: 100, completedAtMs: 99 });
    expect(f.verify).toThrow('acquisition-time');
    const g = await fixture(),
      clock = vi.spyOn(Date, 'now').mockImplementation(() => {
        throw Error('clock forbidden');
      });
    try {
      expect(g.verify).not.toThrow();
    } finally {
      clock.mockRestore();
    }
  });
});
