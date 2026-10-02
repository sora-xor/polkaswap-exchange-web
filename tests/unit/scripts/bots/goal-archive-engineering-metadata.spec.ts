import { describe, expect, it } from 'vitest';
import {
  allowEngineeringMetadataRequest,
  engineeringDefinition,
  engineeringRange,
} from '../../../../output/go-history/goal-archive-engineering-20260920/engineering-metadata.mts';

const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const block = (height: number, timestampMs: number) => ({
  height,
  timestampMs,
  hash: hash(height),
  parentHash: hash(height - 1),
});
const rpc = (method: string, params: unknown[]) => ({ jsonrpc: '2.0', id: 1, method, params });
describe('unexecuted development-only metadata runner', () => {
  it('derives 200 prior closes plus the current close from the previously exposed bucket boundary', () => {
    const definition = engineeringDefinition();
    expect(new Date(definition.firstHistoryBucketAtMs).toISOString()).toBe('2026-06-21T04:00:00.000Z');
    expect(new Date(definition.firstWarmupCloseAtMs).toISOString()).toBe('2026-06-21T05:00:00.000Z');
    expect(new Date(definition.startAtMs).toISOString()).toBe('2026-06-29T13:00:00.000Z');
    expect(new Date(definition.endAtMs).toISOString()).toBe('2026-06-30T13:00:00.000Z');
    expect(definition.startAtMs - definition.firstWarmupCloseAtMs).toBe(200 * 3600000);
    expect(definition.queryCloses).toBe(201);
    expect(Object.isFrozen(definition)).toBe(true);
  });
  it('keeps the last block at or before start−60001ms and first block after the exact deadline', () => {
    const d = engineeringDefinition();
    const first = { previous: block(100, d.startAtMs - 60001), block: block(101, d.startAtMs - 60000) };
    const last = { previous: block(1000, d.endAtMs), block: block(1001, d.endAtMs + 1) };
    expect(engineeringRange(first, last)).toEqual({
      id: 'development',
      startAtMs: d.startAtMs,
      endAtMs: d.endAtMs,
      first: first.previous,
      last: last.block,
    });
    expect(() => engineeringRange({ ...first, previous: block(100, d.startAtMs - 60000) }, last)).toThrow(
      'wrong-boundary'
    );
    expect(() => engineeringRange(first, { ...last, block: block(1001, d.endAtMs) })).toThrow('wrong-boundary');
  });
  it('rejects broken adjacency and exceeds neither the fixed interval nor block cap', () => {
    const d = engineeringDefinition();
    const first = { previous: block(100, d.startAtMs - 70000), block: block(101, d.startAtMs - 59000) };
    const last = { previous: block(20200, d.endAtMs), block: block(20201, d.endAtMs + 1) };
    expect(() => engineeringRange(first, last)).toThrow('engineering-block-limit');
    expect(() => engineeringRange({ ...first, block: { ...first.block, parentHash: hash(99) } }, last)).toThrow(
      'nonadjacent-boundary'
    );
  });
  it.each([
    rpc('chain_getFinalizedHead', []),
    rpc('chain_getBlockHash', [0]),
    rpc('chain_getHeader', [hash(1)]),
    rpc('state_getRuntimeVersion', [hash(1)]),
    rpc('state_getMetadata', [hash(1)]),
    rpc('state_getStorageHash', ['0x3a636f6465', hash(1)]),
    rpc('state_getStorage', ['0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb', hash(1)]),
  ])('permits only metadata request $method', (request) => {
    expect(allowEngineeringMetadataRequest(request)).toBe(true);
  });
  it.each([
    rpc('state_getStorage', ['0x3a636f6465', hash(1)]),
    rpc('state_getStorageHash', ['0x1234', hash(1)]),
    rpc('state_queryStorageAt', [['0x1234'], hash(1)]),
    rpc('liquidityProxy_quote', []),
    rpc('state_call', ['TransactionPaymentApi_query_info', '0x', hash(1)]),
    rpc('author_submitExtrinsic', ['0x']),
    rpc('chain_getBlock', [hash(1)]),
    rpc('chain_getBlockHash', [-1]),
    [rpc('chain_getFinalizedHead', [])],
  ])('rejects market/account/transaction or malformed requests', (request) => {
    expect(allowEngineeringMetadataRequest(request)).toBe(false);
  });
});
