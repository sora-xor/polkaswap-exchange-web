// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  verifyAccumulationOpeningMark,
  isVerifiedAccumulationOpeningMark,
  accumulationOpeningMarkDigest,
  AccumulationOpeningMarkError,
  type AccumulationOpeningMarkEvidence,
  type AccumulationOpeningMarkTrustedSource,
} from '../../../../scripts/bots/accumulation-opening-mark';
import {
  createAccumulationBootstrapDiscoveryRequest,
  createAccumulationBootstrapRequests,
  type AccumulationBootstrapRequestDescriptor,
} from '../../../../scripts/bots/accumulation-bootstrap-requests';
import { createAccumulationQuoteRequests } from '../../../../scripts/bots/accumulation-quote-requests';
import { isVerifiedAccumulationNativeMark } from '../../../../scripts/bots/accumulation-native-mark';
import type { AccumulationRpcReceipt } from '../../../../scripts/bots/accumulation-evidence-bridge';
import { createAccumulationJournalBridgeFixture } from './fixtures/accumulation-journal-bridge-fixture';
import { hex } from './fixtures/historical-goal-bound-fee-fixture';
const H = 1_800_000_000_000;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function wrap(
  d: Pick<AccumulationBootstrapRequestDescriptor, 'endpoint' | 'id' | 'requestBody'>,
  result: unknown,
  at: number
): AccumulationRpcReceipt {
  const responseBody = JSON.stringify({ jsonrpc: '2.0', id: d.id, result });
  return {
    endpoint: d.endpoint,
    requestBody: d.requestBody,
    responseBody,
    responseSha256: sha(responseBody),
    requestedAtMs: at,
    completedAtMs: at + 10,
    httpStatus: 200,
    failure: null,
  };
}
function fixture(native = H - 20000, received = H - 1000) {
  const f = createAccumulationJournalBridgeFixture(H),
    answers = new Map<string, unknown>();
  for (const r of f.packet.contextRpc) {
    const q = JSON.parse(r.requestBody);
    answers.set(JSON.stringify([q.method, q.params]), JSON.parse(r.responseBody!).result);
  }
  const d = createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: 1 }),
    discoveryRpc: AccumulationRpcReceipt[] = [];
  discoveryRpc.push(wrap(d.next([]).nextRequest!, f.packet.block.hash, H - 15000));
  discoveryRpc.push(
    wrap(
      d.next(discoveryRpc).nextRequest!,
      answers.get(JSON.stringify(['chain_getHeader', [f.packet.block.hash]])),
      H - 14900
    )
  );
  const target = d.next(discoveryRpc).completed!.target;
  const b = createAccumulationBootstrapRequests({ target, finalizedSource: target, rpcIdStart: 3 }),
    bootstrapRpc: AccumulationRpcReceipt[] = [];
  let step = b.next(bootstrapRpc);
  while (step.nextRequest) {
    const q = step.nextRequest;
    bootstrapRpc.push(
      wrap(q, answers.get(JSON.stringify([q.method, q.params])), H - 14000 + bootstrapRpc.length * 100)
    );
    step = b.next(bootstrapRpc);
  }
  const producer = createAccumulationQuoteRequests({
    identity: step.completed!.identity,
    blockNumber: target.height,
    denominator: f.trusted.denominator,
    rpcIdStart: 1000,
  });
  const pool = clone(answers.get(JSON.stringify(['state_queryStorageAt', producer.contextRequest.params]))) as {
    block: string;
    changes: (string | null)[][];
  }[];
  pool[0].changes.find((c) => c[0] === producer.storageKeys.timestamp)![1] = hex(
    f.synthetic.registry.createType('u64', native).toU8a()
  );
  pool[0].changes.find((c) => c[0] === producer.storageKeys.reserves)![1] = hex(
    f.synthetic.registry.createType('(u128,u128)', ['3000000000000000000', '2000000000000000000']).toU8a()
  );
  const poolRpc = wrap(producer.contextRequest, pool, received - 10);
  const raw: AccumulationOpeningMarkEvidence = {
    kind: 'accumulation-opening-mark-evidence-v2',
    discoveryRpc,
    bootstrapRpc,
    poolRpc,
  };
  const trusted: AccumulationOpeningMarkTrustedSource = {
    rawSha256: accumulationOpeningMarkDigest(raw),
    sourceRegistrationSha256: 'a'.repeat(64),
    endpoint: 'https://ws.mof.sora.org/',
    runtime: { ...f.trusted.runtimeVersion, metadataSha256: f.trusted.metadataSha256, codeHash: f.trusted.codeHash },
    denominator: f.trusted.denominator,
  };
  const slot = { episodeId: 'invented-opening-v2', slotId: 'opening', openingAtMs: H, deadlineMs: H + 24 * 3600000 };
  return { raw, trusted, slot, keys: producer.storageKeys, registry: f.synthetic.registry };
}
function repin(f: ReturnType<typeof fixture>) {
  f.trusted.rawSha256 = accumulationOpeningMarkDigest(f.raw);
}
function value(f: ReturnType<typeof fixture>, key: string, value: string | null) {
  const body = JSON.parse(f.raw.poolRpc.responseBody!);
  body.result[0].changes.find((c: (string | null)[]) => c[0] === key)[1] = value;
  f.raw.poolRpc.responseBody = JSON.stringify(body);
  f.raw.poolRpc.responseSha256 = sha(f.raw.poolRpc.responseBody!);
  repin(f);
}
function verify(f = fixture()) {
  return verifyAccumulationOpeningMark(f.raw, f.trusted, f.slot);
}
afterEach(() => vi.unstubAllGlobals());
describe('available finalized opening v2 verifier', () => {
  it('accepts an originally finalized older available mark without inventing a successor or changing v1 ownership', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw Error('network forbidden');
      })
    );
    const f = fixture(),
      r = verify(f);
    expect(r.mark).toMatchObject({
      observedAtMs: H - 20000,
      receivedAtMs: H - 1000,
      price: { numerator: '2', denominator: '3' },
    });
    expect(r.kind).toBe('accumulation-opening-mark-result-v2');
    expect(r.registeredSlot).toEqual(f.slot);
    expect(isVerifiedAccumulationOpeningMark(r)).toBe(true);
    expect(isVerifiedAccumulationOpeningMark(clone(r))).toBe(false);
    expect(isVerifiedAccumulationNativeMark(r)).toBe(false);
    expect(r).not.toHaveProperty('boundary');
    expect(r).toMatchObject({
      sourceAcquisitionVerified: false,
      selectionVerified: false,
      scheduleCompletenessVerified: false,
      independentConsensusVerified: false,
      qualificationAuthority: false,
      financialAuthority: false,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it.each([H, H - 4999])('accepts genuine original receipt at %s within the exclusive5s opening window', (received) => {
    expect(verify(fixture(H - 20000, received)).mark.receivedAtMs).toBe(received);
  });
  it.each([H - 5000, H + 1])('rejects original receipt outside opening window at %s', (received) => {
    expect(() => verify(fixture(H - 20000, received))).toThrow(/opening-receipt-clock/);
  });
  it('keeps the60s native age bound and strict preH/native-before-receipt causality', () => {
    expect(verify(fixture(H - 60000)).mark.observedAtMs).toBe(H - 60000);
    for (const native of [H - 60001, H, H + 1, H - 100])
      expect(() => verify(fixture(native))).toThrow(/opening-native-clock/);
  });
  it.each(['metadataSha256', 'codeHash', 'specVersion', 'transactionVersion'] as const)(
    'rejects changed independently held runtime %s',
    (key) => {
      const f = fixture();
      if (key === 'metadataSha256') f.trusted.runtime[key] = 'e'.repeat(64);
      else if (key === 'codeHash') f.trusted.runtime[key] = `0x${'e'.repeat(64)}`;
      else f.trusted.runtime[key]++;
      expect(() => verify(f)).toThrow(/runtime-pins/);
    }
  );
  it('requires the original discovered target and causal phase order', () => {
    const f = fixture();
    f.raw.bootstrapRpc[0].requestedAtMs = H - 16000;
    repin(f);
    expect(() => verify(f)).toThrow(/discovery-bootstrap-order/);
    const g = fixture();
    const q = JSON.parse(g.raw.discoveryRpc[0].responseBody!);
    q.result = `0x${'e'.repeat(64)}`;
    g.raw.discoveryRpc[0].responseBody = JSON.stringify(q);
    g.raw.discoveryRpc[0].responseSha256 = sha(g.raw.discoveryRpc[0].responseBody!);
    repin(g);
    expect(() => verify(g)).toThrow(/request-binding/);
  });
  it('rejects source digest/endpoint changes and seven-key request changes even with a repinned raw digest', () => {
    const f = fixture();
    f.trusted.rawSha256 = 'b'.repeat(64);
    expect(() => verify(f)).toThrow(/source-binding/);
    const g = fixture();
    g.raw.poolRpc.endpoint = 'https://example.invalid/';
    repin(g);
    expect(() => verify(g)).toThrow(/pool-request-binding/);
    const h = fixture();
    const q = JSON.parse(h.raw.poolRpc.requestBody);
    q.params[0].pop();
    h.raw.poolRpc.requestBody = JSON.stringify(q);
    repin(h);
    expect(() => verify(h)).toThrow(/pool-request-binding/);
  });
  it('rejects missing, duplicate and mixed-state native evidence', () => {
    for (const kind of ['missing', 'duplicate', 'state']) {
      const f = fixture(),
        body = JSON.parse(f.raw.poolRpc.responseBody!);
      if (kind === 'missing') body.result[0].changes.pop();
      if (kind === 'duplicate') body.result[0].changes[6] = body.result[0].changes[5];
      if (kind === 'state') body.result[0].block = `0x${'e'.repeat(64)}`;
      f.raw.poolRpc.responseBody = JSON.stringify(body);
      f.raw.poolRpc.responseSha256 = sha(f.raw.poolRpc.responseBody!);
      repin(f);
      expect(() => verify(f)).toThrow(/pool-/);
    }
  });
  it('keeps absent and zero reserves unavailable and rejects denomination mismatch', () => {
    const absent = fixture();
    value(absent, absent.keys.properties, null);
    value(absent, absent.keys.reserves, null);
    expect(() => verify(absent)).toThrow(/pool-or-denomination/);
    const zero = fixture();
    value(zero, zero.keys.reserves, `0x${'00'.repeat(32)}`);
    expect(() => verify(zero)).toThrow(/pool-or-denomination/);
    const denom = fixture();
    denom.trusted.denominator = '2';
    expect(() => verify(denom)).toThrow(/pool-or-denomination/);
  });
  it('rejects unsafe numerical storage values, ambiguous JSON and unsupported whitespace without rewriting receipts', () => {
    const f = fixture(),
      original = f.raw.poolRpc.responseBody!;
    for (const body of [
      ' ' + original,
      original.replace('"id":1000', '"id":1000,"i\\u0064":1000'),
      original.replace('"id":1000', '"id":9007199254740992'),
    ]) {
      const g = fixture();
      g.raw.poolRpc.responseBody = body;
      g.raw.poolRpc.responseSha256 = sha(body);
      repin(g);
      try {
        verify(g);
        throw Error('unexpected accepted');
      } catch (error) {
        expect(error).toBeInstanceOf(AccumulationOpeningMarkError);
        expect((error as AccumulationOpeningMarkError).retainedEvidence).toEqual(g.raw);
      }
    }
    const g = fixture();
    const parsed = JSON.parse(g.raw.poolRpc.responseBody!);
    parsed.result[0].changes[0][1] = 9007199254740992;
    g.raw.poolRpc.responseBody = JSON.stringify(parsed);
    g.raw.poolRpc.responseSha256 = sha(g.raw.poolRpc.responseBody!);
    repin(g);
    expect(() => verify(g)).toThrow();
  });
  it('rejects failed original transport without granting mark ownership', () => {
    const f = fixture();
    f.raw.poolRpc.failure = 'timeout';
    repin(f);
    expect(() => verify(f)).toThrow(/pool-response/);
  });
  it('rejects shifted hour/deadline and returns detached immutable evidence', () => {
    const f = fixture(),
      r = verify(f);
    f.raw.poolRpc.responseBody = null;
    f.slot.episodeId = 'changed';
    expect(r.retainedEvidence.poolRpc.responseBody).not.toBeNull();
    expect(r.registeredSlot.episodeId).toBe('invented-opening-v2');
    expect(Object.isFrozen(r.mark.price)).toBe(true);
    expect(Object.isFrozen(r.retainedEvidence.bootstrapRpc)).toBe(true);
    const g = fixture();
    g.slot.openingAtMs++;
    g.slot.deadlineMs++;
    expect(() => verify(g)).toThrow(/opening-or-deadline/);
    const h = fixture();
    h.slot.deadlineMs++;
    expect(() => verify(h)).toThrow(/opening-or-deadline/);
  });
  it('rejects getters without executing them', () => {
    const f = fixture(),
      getter = vi.fn(() => f.raw.poolRpc);
    Object.defineProperty(f.raw, 'poolRpc', { enumerable: true, get: getter });
    expect(() => verify(f)).toThrow(AccumulationOpeningMarkError);
    expect(getter).not.toHaveBeenCalled();
  });
});
