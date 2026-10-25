// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calculateGoalStudyExportCapacity } from '../../../../scripts/bots/goal-study-export-capacity';

const MIB = 1024 ** 2;
const input = () => ({
  metadataRawFileBytes: [5200 * MIB],
  metadataInputFileBytes: [2 * MIB],
  partitionFileBytes: [20 * MIB, 10 * MIB],
  publicProtocolBytes: MIB,
  maximumEpisodes: 10,
});

describe('study export capacity before economic acquisition', () => {
  it('reserves all ten raw episodes and non-raw artifacts within the unchanged study cap', () => {
    const capacity = calculateGoalStudyExportCapacity(input());
    expect(capacity.maximumRawEvidenceBytesPerEpisode).toBe(254 * MIB);
    expect(capacity.maximumExportBytes).toBeLessThanOrEqual(8 * 1024 ** 3);
    expect(capacity.maximumExportBytes + 10 * MIB).toBeGreaterThan(8 * 1024 ** 3);
  });

  it('keeps the existing per-episode cap when a small study has ample space', () => {
    const capacity = calculateGoalStudyExportCapacity({ ...input(), metadataRawFileBytes: [MIB] });
    expect(capacity.maximumRawEvidenceBytesPerEpisode).toBe(512 * MIB);
  });

  it('counts equal-sized raw files separately without assuming deduplication', () => {
    const capacity = calculateGoalStudyExportCapacity({ ...input(), metadataRawFileBytes: [2600 * MIB, 2600 * MIB] });
    expect(capacity).toEqual(calculateGoalStudyExportCapacity(input()));
  });

  it('reserves repeated verifier reads as well as the physical export', () => {
    const capacity = calculateGoalStudyExportCapacity({ ...input(), additionalReplayReadBytes: 120 * MIB });
    expect(capacity.maximumRawEvidenceBytesPerEpisode).toBe(242 * MIB);
    expect(capacity.maximumReplayReadBytes).toBe(capacity.maximumExportBytes + 120 * MIB);
    expect(capacity.maximumReplayReadBytes).toBeLessThanOrEqual(8 * 1024 ** 3);
    expect(capacity.maximumReplayReadBytes + 10 * MIB).toBeGreaterThan(8 * 1024 ** 3);
  });

  it.each([-1, NaN, 0.5])('rejects an invalid replay read allowance %s', (additionalReplayReadBytes) => {
    expect(() => calculateGoalStudyExportCapacity({ ...input(), additionalReplayReadBytes })).toThrow('invalid-size');
  });

  it('refuses a collection that leaves no room for complete episode evidence', () => {
    expect(() => calculateGoalStudyExportCapacity({ ...input(), metadataRawFileBytes: [8 * 1024 ** 3] })).toThrow(
      'insufficient-space'
    );
  });

  it.each([NaN, Infinity, -1, 0, 1.5, Number.MAX_SAFE_INTEGER])('rejects invalid artifact byte size %s', (bytes) => {
    expect(() => calculateGoalStudyExportCapacity({ ...input(), metadataRawFileBytes: [bytes] })).toThrow(
      'invalid-size'
    );
  });

  it.each([0, 11, 1.5])('rejects an unsupported episode count %s', (maximumEpisodes) => {
    expect(() => calculateGoalStudyExportCapacity({ ...input(), maximumEpisodes })).toThrow('invalid-size');
  });
});
