// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAccumulationBootstrapRequests,
  createAccumulationBootstrapDiscoveryRequest,
  isAccumulationBootstrapRequestDescriptor,
  type AccumulationBootstrapRequestDescriptor,
} from '../../../../scripts/bots/accumulation-bootstrap-requests';
import type { AccumulationRpcReceipt } from '../../../../scripts/bots/accumulation-evidence-bridge';
import { createAccumulationJournalBridgeFixture } from './fixtures/accumulation-journal-bridge-fixture';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function fixture() {
  const f = createAccumulationJournalBridgeFixture(1_800_000_000_000);
  return {
    f,
    input: { target: f.packet.block, finalizedSource: f.trusted.finalizedSource, rpcIdStart: 1 },
    rows: f.packet.contextRpc.slice(0, 14),
  };
}
function edit(r: AccumulationRpcReceipt, value: unknown) {
  const old = JSON.parse(r.responseBody!);
  r.responseBody = JSON.stringify({ ...old, result: value });
  r.responseSha256 = sha(r.responseBody);
}
function receipt(d: AccumulationBootstrapRequestDescriptor, result: unknown, at: number): AccumulationRpcReceipt {
  const responseBody = JSON.stringify({ jsonrpc: '2.0', id: d.id, result });
  return {
    endpoint: d.endpoint,
    requestBody: d.requestBody,
    responseBody,
    responseSha256: sha(responseBody),
    requestedAtMs: at,
    completedAtMs: at + 1,
    httpStatus: 200,
    failure: null,
  };
}
afterEach(() => vi.unstubAllGlobals());
describe('original accumulation bootstrap planner', () => {
  it('reproduces all14 exact original requests and only exposes identity after the full successful prefix', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw Error('network forbidden');
      })
    );
    const { f, input, rows } = fixture(),
      p = createAccumulationBootstrapRequests(input);
    for (let i = 0; i < 14; i++) {
      const step = p.next(rows.slice(0, i));
      expect(step.completed).toBeNull();
      expect(step.nextRequest?.requestBody).toBe(rows[i].requestBody);
      expect(step.nextRequest?.requestSha256).toBe(sha(rows[i].requestBody));
      expect(isAccumulationBootstrapRequestDescriptor(step.nextRequest)).toBe(true);
      expect(isAccumulationBootstrapRequestDescriptor(clone(step.nextRequest))).toBe(false);
    }
    const done = p.next(rows);
    expect(done.nextRequest).toBeNull();
    expect(done.completed?.identity).toMatchObject({
      blockHash: f.packet.block.hash,
      metadataHex: f.synthetic.identity.metadataHex,
      runtimeVersion: f.synthetic.identity.runtimeVersion,
    });
    expect(done.completed?.parent.height).toBe(99);
    expect(done.completed?.metadataSha256).toBe(f.trusted.metadataSha256);
    expect(done.completed?.codeHash).toBe(f.trusted.codeHash);
    expect(done.completed?.contextRpc).toEqual(rows);
    expect(done.completed?.sourceAcquisitionVerified).toBe(false);
    expect(done.completed?.independentConsensusVerified).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it('discovers one original finalized head then exactly its header without claiming selection completeness', () => {
    const { rows } = fixture(),
      p = createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: 1 });
    const a = p.next([]).nextRequest!;
    expect(JSON.parse(a.requestBody)).toEqual({ jsonrpc: '2.0', id: 1, method: 'chain_getFinalizedHead', params: [] });
    const first = receipt(a, JSON.parse(rows[2].responseBody!).result, 1000);
    const b = p.next([first]).nextRequest!;
    expect(b.params).toEqual([JSON.parse(first.responseBody!).result]);
    const second = receipt(b, JSON.parse(rows[3].responseBody!).result, 1002);
    const done = p.next([first, second]);
    expect(done.nextRequest).toBeNull();
    expect(done.completed?.target).toEqual({ hash: JSON.parse(first.responseBody!).result, height: 120 });
    expect(done.completed?.discoveryRpc).toEqual([first, second]);
    expect(done.completed?.selectionVerified).toBe(false);
    expect(Object.isFrozen(done.completed?.target)).toBe(true);
    first.responseBody = null;
    expect(done.completed?.discoveryRpc[0].responseBody).not.toBeNull();
  });
  it.each([
    'head-null',
    'header-height',
    'header-state-root',
    'receipt-clock',
    'wrong-header-request',
    'failed-head',
  ] as const)('rejects %s discovery instead of selecting a replacement', (kind) => {
    const { rows } = fixture(),
      p = createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: 1 });
    const a = receipt(p.next([]).nextRequest!, JSON.parse(rows[2].responseBody!).result, 1000);
    if (kind === 'head-null') {
      edit(a, null);
      expect(() => p.next([a])).toThrow(/hash/);
      return;
    }
    if (kind === 'failed-head') {
      a.failure = 'timeout';
      expect(() => p.next([a])).toThrow(/failed-response/);
      return;
    }
    const b = receipt(p.next([a]).nextRequest!, JSON.parse(rows[3].responseBody!).result, 1002);
    if (kind === 'receipt-clock') b.requestedAtMs = 999;
    if (kind === 'wrong-header-request') b.requestBody = rows[4].requestBody;
    if (kind === 'header-height' || kind === 'header-state-root') {
      const value = JSON.parse(b.responseBody!).result;
      if (kind === 'header-height') value.number = '0x0';
      else value.stateRoot = '0x0';
      edit(b, value);
    }
    expect(() => p.next([a, b])).toThrow(/accumulation-bootstrap:/);
  });
  it.each(['genesis', 'anchor', 'target', 'parent', 'runtime', 'metadata', 'code'] as const)(
    'rejects changed %s identity within the original prefix',
    (kind) => {
      const { input, rows } = fixture(),
        p = createAccumulationBootstrapRequests(input);
      const index = { genesis: 0, anchor: 1, target: 5, parent: 7, runtime: 10, metadata: 12, code: 13 }[kind];
      if (kind === 'runtime') {
        const v = JSON.parse(rows[index].responseBody!).result;
        v.transactionVersion++;
        edit(rows[index], v);
      } else edit(rows[index], kind === 'metadata' ? '0x00' : kind === 'code' ? '0x00' : `0x${'f'.repeat(64)}`);
      expect(() => p.next(rows)).toThrow(/accumulation-bootstrap:/);
    }
  );
  it('rejects omitted, reordered, excess, failed and tampered receipts', () => {
    const { input, rows } = fixture(),
      p = createAccumulationBootstrapRequests(input);
    for (const variant of [rows.slice(1), [rows[1], rows[0], ...rows.slice(2)], [...rows, rows[0]]])
      expect(() => p.next(variant)).toThrow();
    const altered = clone(rows);
    altered[0].responseSha256 = '0'.repeat(64);
    expect(() => p.next(altered)).toThrow(/failed-response/);
    altered[0] = clone(rows[0]);
    altered[0].httpStatus = 503;
    expect(() => p.next(altered)).toThrow(/failed-response/);
  });
  it('does not advance on duplicate decoded keys, noncanonical numeric lexemes or oversized ordinary bodies', () => {
    const { input, rows } = fixture(),
      p = createAccumulationBootstrapRequests(input);
    for (const body of [
      '{"jsonrpc":"2.0","id":1,"result":null,"resul\\u0074":null}',
      '{"jsonrpc":"2.0","id":1.0,"result":null}',
      ' '.repeat(65537),
    ]) {
      const r = clone(rows[0]);
      r.responseBody = body;
      r.responseSha256 = sha(body);
      expect(() => p.next([r])).toThrow();
    }
  });
  it('detaches pinned target and returned receipts without calling getters', () => {
    const { input, rows } = fixture(),
      p = createAccumulationBootstrapRequests(input),
      target = input.target.hash;
    input.target.hash = `0x${'e'.repeat(64)}`;
    const done = p.next(rows).completed!;
    expect(done.target.hash).toBe(target);
    rows[0].responseBody = null;
    expect(done.contextRpc[0].responseBody).not.toBeNull();
    expect(Object.isFrozen(done.contextRpc[0])).toBe(true);
    const getter = vi.fn(() => 1);
    Object.defineProperty(input, 'rpcIdStart', { get: getter, enumerable: true });
    expect(() => createAccumulationBootstrapRequests(input)).toThrow(/accessor/);
    expect(getter).not.toHaveBeenCalled();
  });
  it('bounds IDs, target heights and supplied anchor before producing requests', () => {
    const { input } = fixture();
    for (const rpcIdStart of [0, 1.5, Number.MAX_SAFE_INTEGER - 12])
      expect(() => createAccumulationBootstrapRequests({ ...input, rpcIdStart })).toThrow(/integer/);
    expect(() => createAccumulationBootstrapRequests({ ...input, target: { ...input.target, height: 111 } })).toThrow(
      /target-after-anchor/
    );
    expect(() => createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: Number.MAX_SAFE_INTEGER })).toThrow(
      /integer/
    );
  });
});
