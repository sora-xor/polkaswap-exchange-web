/** Exact extra logical metadata reads made by the fixed, two-partition catalog bundle verifier. */
export interface GoalStudyCatalogReplayCapacityInput {
  ranges: readonly { id: 'training' | 'validation'; firstHeight: number; lastHeight: number }[];
  rawFiles: readonly { name: string; bytes: number }[];
  /** Small original group completion records supply actual membership, including resumed groups. */
  groups: readonly { name: string; indices: readonly number[] }[];
  commonFileBytes: { runProtocol: number; verification: number; rawManifest: number };
}
const MIB = 1024 ** 2;
const fail = (reason: string): never => {
  throw Error(`Goal catalog replay capacity: ${reason}`);
};
const positive = (value: number, maximum: number) => Number.isSafeInteger(value) && value > 0 && value <= maximum;
const shardName = (index: number) => `shard-${String(index).padStart(5, '0')}.complete`;

/**
 * Count only reads beyond one copy of each original metadata artifact. Training bootstrap reads the
 * protocol, raw manifest and first training shard; both independent partition verifiers read all
 * three common inputs and every member of any transport group touching their own partition.
 * Caller must bind the supplied inventories/group records to the verified collection first.
 * This size accounting grants no metadata, selection or qualification authority.
 */
export function calculateGoalStudyCatalogReplayReadAllowance(input: GoalStudyCatalogReplayCapacityInput) {
  if (!Array.isArray(input.ranges) || input.ranges.length !== 2) return fail('ranges');
  const partitions: Array<'training' | 'validation'> = [];
  let totalBlocks = 0;
  for (const [offset, range] of input.ranges.entries()) {
    if (
      range.id !== (offset === 0 ? 'training' : 'validation') ||
      !positive(range.firstHeight, Number.MAX_SAFE_INTEGER) ||
      !positive(range.lastHeight, Number.MAX_SAFE_INTEGER) ||
      range.lastHeight < range.firstHeight ||
      (offset > 0 && range.firstHeight <= input.ranges[offset - 1].lastHeight)
    )
      return fail('ranges');
    const count = range.lastHeight - range.firstHeight + 1;
    totalBlocks += count;
    if (totalBlocks > 100000) return fail('block-limit');
    for (let i = 0; i < Math.ceil(count / 64); i++) partitions.push(range.id);
  }
  if (
    !Array.isArray(input.rawFiles) ||
    !positive(input.rawFiles.length, 25000) ||
    !Array.isArray(input.groups) ||
    !positive(input.groups.length, partitions.length)
  )
    return fail('inventory');
  const files = new Map<string, number>();
  const batchFiles = new Map<string, string[]>();
  let rawBytes = 0;
  for (const entry of input.rawFiles) {
    if (
      typeof entry.name !== 'string' ||
      !/^(?:shard-\d{5}\.complete|group-\d{5}\.(?:complete|batch-\d{5}))$/.test(entry.name) ||
      files.has(entry.name) ||
      !positive(entry.bytes, 8 * MIB)
    )
      return fail('raw-file');
    rawBytes += entry.bytes;
    if (rawBytes > 12 * 1024 ** 3) return fail('raw-limit');
    files.set(entry.name, entry.bytes);
    const batch = /^(group-\d{5})\.batch-\d{5}$/.exec(entry.name);
    if (batch) {
      const names = batchFiles.get(batch[1]) ?? [];
      names.push(entry.name);
      batchFiles.set(batch[1], names);
    }
  }
  const common = input.commonFileBytes;
  if (
    !common ||
    Object.keys(common).length !== 3 ||
    !positive(common.runProtocol, 8 * MIB) ||
    !positive(common.verification, 8 * MIB) ||
    !positive(common.rawManifest, 8 * MIB)
  )
    return fail('common-files');
  const consumed = new Set<string>();
  const consume = (name: string) => {
    const bytes = files.get(name);
    if (bytes === undefined || consumed.has(name)) return fail('missing-or-duplicate-file');
    consumed.add(name);
    return bytes;
  };
  let next = 0;
  const sharedGroups: Array<{ name: string; bytes: number; files: readonly string[] }> = [];
  for (const group of input.groups) {
    if (
      group.name !== `group-${String(next).padStart(5, '0')}` ||
      !Array.isArray(group.indices) ||
      !positive(group.indices.length, 32) ||
      group.indices.some((index: number, i: number) => index !== next + i || !partitions[index])
    )
      return fail('group-membership');
    const names = [`${group.name}.complete`, ...group.indices.map(shardName)];
    const batches = [...(batchFiles.get(group.name) ?? [])].sort();
    if (
      !positive(batches.length, 552) ||
      batches.some((name, index) => name !== `${group.name}.batch-${String(index).padStart(5, '0')}`)
    )
      return fail('batch-sequence');
    names.push(...batches);
    const bytes = names.reduce((sum, name) => sum + consume(name), 0);
    if (new Set(group.indices.map((index: number) => partitions[index])).size === 2)
      sharedGroups.push({ name: group.name, bytes, files: Object.freeze(names.sort()) });
    next += group.indices.length;
  }
  if (next !== partitions.length || consumed.size !== files.size) return fail('incomplete-inventory');
  const bootstrapShard = shardName(0);
  const bootstrapBytes = common.runProtocol + common.rawManifest + files.get(bootstrapShard)!;
  const repeatedCommonBytes = common.runProtocol + common.verification + common.rawManifest;
  const sharedGroupBytes = sharedGroups.reduce((total, group) => total + group.bytes, 0);
  return Object.freeze({
    kind: 'catalog-bundle-extra-read-allowance-v1' as const,
    bootstrapShard,
    bootstrapBytes,
    repeatedCommonBytes,
    sharedGroups: Object.freeze(sharedGroups.map((group) => Object.freeze(group))),
    sharedGroupBytes,
    additionalReadBytes: bootstrapBytes + repeatedCommonBytes + sharedGroupBytes,
  });
}
