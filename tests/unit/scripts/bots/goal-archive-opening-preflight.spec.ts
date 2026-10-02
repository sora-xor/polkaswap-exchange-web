import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openingState,
  retain,
} from '../../../../output/go-history/goal-archive-engineering-20260920/preflight-market.mts';
const target = Date.parse('2026-06-29T13:00:00Z') - 13000;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const block = (height: number, timestampMs: number) => ({
  height,
  timestampMs,
  hash: hash(height),
  parentHash: hash(height - 1),
});
describe('one-state exposed opening preflight', () => {
  it('selects exact as-of opening state using only fixed time and adjacent canonical metadata', () => {
    const rows = [block(100, target - 6000), block(101, target), block(102, target + 6000)];
    expect(openingState(rows)).toEqual(rows[1]);
    expect(Object.isFrozen(openingState(rows))).toBe(true);
  });
  it('does not select a successor, missing predecessor, absent upper bound or broken adjacency', () => {
    expect(() => openingState([block(100, target + 1), block(101, target + 6000)])).toThrow('opening-coverage');
    expect(() => openingState([block(100, target - 6000), block(101, target)])).toThrow('opening-coverage');
    expect(() => openingState([block(100, target - 6000), block(102, target + 1)])).toThrow('opening-adjacency');
  });
  it('publishes exact canonical bytes once without replacing a frozen protocol', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'goal-opening-preflight-'));
    try {
      const path = join(directory, 'protocol.json');
      const receipt = await retain(path, { z: false, a: 1 });
      expect(receipt.bytes).toBe(17);
      expect(await readFile(path, 'utf8')).toBe('{"a":1,"z":false}');
      await expect(retain(path, { a: 2 })).rejects.toMatchObject({ code: 'EEXIST' });
      expect(await readFile(path, 'utf8')).toBe('{"a":1,"z":false}');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
