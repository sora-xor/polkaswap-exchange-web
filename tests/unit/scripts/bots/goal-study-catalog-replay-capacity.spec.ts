// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  calculateGoalStudyCatalogReplayReadAllowance,
  type GoalStudyCatalogReplayCapacityInput,
} from '../../../../scripts/bots/goal-study-catalog-replay-capacity';

function fixture(shared = true): GoalStudyCatalogReplayCapacityInput {
  const groups = shared
    ? [
        { name: 'group-00000', indices: [0, 1, 2] },
        { name: 'group-00003', indices: [3] },
      ]
    : [
        { name: 'group-00000', indices: [0, 1] },
        { name: 'group-00002', indices: [2, 3] },
      ];
  return {
    ranges: [
      { id: 'training', firstHeight: 100, lastHeight: 227 },
      { id: 'validation', firstHeight: 300, lastHeight: 427 },
    ],
    groups,
    rawFiles: [
      ...[0, 1, 2, 3].map((index) => ({
        name: `shard-${String(index).padStart(5, '0')}.complete`,
        bytes: 1000 + index,
      })),
      ...groups.flatMap((group) => [
        { name: `${group.name}.complete`, bytes: 10 },
        { name: `${group.name}.batch-00000`, bytes: 100 },
        { name: `${group.name}.batch-00001`, bytes: 200 },
      ]),
    ],
    commonFileBytes: { runProtocol: 7, verification: 11, rawManifest: 13 },
  };
}

describe('fixed catalog verifier extra metadata reads', () => {
  it('equals an independently enumerated bootstrap and two-partition read schedule', () => {
    const input = fixture();
    const sizes = new Map(input.rawFiles.map((file) => [file.name, file.bytes]));
    const reads = ['run-protocol', 'raw-manifest', 'shard-00000.complete'];
    sizes.set('run-protocol', 7);
    sizes.set('verification', 11);
    sizes.set('raw-manifest', 13);
    for (const selected of [
      [0, 1],
      [2, 3],
    ]) {
      reads.push('run-protocol', 'verification', 'raw-manifest');
      for (const group of input.groups.filter((g) => g.indices.some((index) => selected.includes(index)))) {
        reads.push(
          `${group.name}.complete`,
          ...group.indices.map((i) => `shard-${String(i).padStart(5, '0')}.complete`)
        );
        reads.push(...input.rawFiles.filter((f) => f.name.startsWith(`${group.name}.batch-`)).map((f) => f.name));
      }
    }
    const allReads = reads.reduce((sum, name) => sum + sizes.get(name)!, 0);
    const once = [...sizes.values()].reduce((sum, bytes) => sum + bytes, 0);
    const result = calculateGoalStudyCatalogReplayReadAllowance(input);
    expect(result.additionalReadBytes).toBe(allReads - once);
    expect(result.bootstrapBytes).toBe(1020);
    expect(result.repeatedCommonBytes).toBe(31);
    expect(result.sharedGroupBytes).toBe(3313);
    expect(result.sharedGroups[0].files).toHaveLength(6);
    expect(result.additionalReadBytes).toBe(4364);
  });

  it('still counts bootstrap/common duplication when groups align with the partition boundary', () => {
    const result = calculateGoalStudyCatalogReplayReadAllowance(fixture(false));
    expect(result.sharedGroups).toEqual([]);
    expect(result.additionalReadBytes).toBe(1051);
  });

  it('uses actual resumed short-group membership, not a guessed 32-shard grouping', () => {
    const input = fixture(false);
    input.groups = [
      { name: 'group-00000', indices: [0] },
      { name: 'group-00001', indices: [1, 2] },
      { name: 'group-00003', indices: [3] },
    ];
    input.rawFiles = input.rawFiles.filter((file) => file.name.startsWith('shard-'));
    for (const group of input.groups)
      input.rawFiles = [
        ...input.rawFiles,
        { name: `${group.name}.complete`, bytes: 10 },
        { name: `${group.name}.batch-00000`, bytes: 100 },
      ];
    const result = calculateGoalStudyCatalogReplayReadAllowance(input);
    expect(result.sharedGroups.map((g) => g.name)).toEqual(['group-00001']);
    expect(result.sharedGroupBytes).toBe(2113);
  });

  it.each([
    [
      'missing shard',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.rawFiles = x.rawFiles.filter((f) => f.name !== 'shard-00001.complete');
      },
    ],
    [
      'missing group',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.groups = x.groups.slice(1);
      },
    ],
    [
      'omitted member',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.groups[0].indices = [0, 2];
      },
    ],
    [
      'extra raw file',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.rawFiles = [...x.rawFiles, { name: 'shard-00004.complete', bytes: 1 }];
      },
    ],
    [
      'batch gap',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.rawFiles = x.rawFiles.filter((f) => f.name !== 'group-00000.batch-00000');
      },
    ],
    [
      'path escape',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.rawFiles[0].name = '../shard-00000.complete';
      },
    ],
    [
      'duplicate',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.rawFiles = [...x.rawFiles, x.rawFiles[0]];
      },
    ],
    [
      'unsafe bytes',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.rawFiles[0].bytes = Number.MAX_SAFE_INTEGER;
      },
    ],
    [
      'wrong phase order',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.ranges = [...x.ranges].reverse();
      },
    ],
    [
      'invalid common bytes',
      (x: GoalStudyCatalogReplayCapacityInput) => {
        x.commonFileBytes.rawManifest = 0;
      },
    ],
  ] as const)('rejects %s instead of undercounting', (_name, mutate) => {
    const input = fixture();
    mutate(input);
    expect(() => calculateGoalStudyCatalogReplayReadAllowance(input)).toThrow('Goal catalog replay capacity:');
  });
});
