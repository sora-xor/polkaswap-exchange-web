import { describe, expect, it } from 'vitest';
import {
  decodeUnsigned,
  decodeAssetMetadata,
  locateClose,
  extractArchiveHistory,
} from '../../../../scripts/bots/extract-archive-history.mjs';

describe('archive extraction primitives', () => {
  it('decodes exact u128 reserves and rejects malformed SCALE storage', () => {
    expect(decodeUnsigned(`0x${'ff'.repeat(16)}`, 16)).toBe('340282366920938463463374607431768211455');
    expect(() => decodeUnsigned('0x01', 16)).toThrow('Malformed');
    expect(decodeAssetMetadata('0x0c584f520c584f521201000000')).toEqual({ symbol: 'XOR', decimals: 18 });
    expect(() => decodeAssetMetadata('0xfc01')).toThrow('Invalid asset metadata length');
  });
  it('proves both sides of a closed hour even when block intervals are irregular', async () => {
    const time = (height: number) => height * 12_000 + (height >= 400 ? 90_000 : 0);
    const read = async (heights: number[]) => heights.map((height) => ({ height, timestamp: time(height) }));
    const [lower, upper] = await read([0, 1000]);
    const result = await locateClose(3_600_000, lower, upper, read);
    expect(result.before).toEqual({ height: 299, timestamp: 3_588_000 });
    expect(result.after).toEqual({ height: 300, timestamp: 3_600_000 });
    const later = await locateClose(5_400_000, lower, upper, read);
    expect(later.before.timestamp).toBeLessThan(5_400_000);
    expect(later.after.timestamp).toBeGreaterThanOrEqual(5_400_000);
    expect(later.after.height).toBe(later.before.height + 1);
  });
  it('bounds the search when later blocks slow from seconds to hours', async () => {
    const time = (height: number) =>
      height <= 900_000 ? height * 6000 : 900_000 * 6000 + (height - 900_000) * 3_600_000;
    let requests = 0;
    const read = async (heights: number[]) => {
      requests++;
      return heights.map((height) => ({ height, timestamp: time(height) }));
    };
    const result = await locateClose(
      time(600_000),
      { height: 0, timestamp: time(0) },
      { height: 1_000_000, timestamp: time(1_000_000) },
      read
    );
    expect(result.before).toEqual({ height: 599_999, timestamp: time(599_999) });
    expect(result.after).toEqual({ height: 600_000, timestamp: time(600_000) });
    expect(requests).toBeLessThanOrEqual(4 + Math.ceil(Math.log2(1_000_000)));
  });
  it('retains an adjacent block proof across an hour with no new block', async () => {
    const before = { height: 10, timestamp: 3_500_000 };
    const after = { height: 11, timestamp: 10_800_000 };
    const result = await locateClose(7_200_000, before, after, async () => {
      throw new Error('Adjacent bounds already prove the close');
    });
    expect(result.before).toBe(before);
    expect(result.after).toBe(after);
  });
  it('rejects an unbracketed hour and invalid extraction ranges before any network use', async () => {
    await expect(
      locateClose(10, { height: 1, timestamp: 20 }, { height: 2, timestamp: 30 }, async () => [])
    ).rejects.toThrow('Unbracketed');
    await expect(
      locateClose(10, { height: 2, timestamp: 0 }, { height: 1, timestamp: 20 }, async () => [])
    ).rejects.toThrow('Unbracketed');
    await expect(extractArchiveHistory({ endAt: 1 })).rejects.toThrow('Invalid extraction period');
  });
});
