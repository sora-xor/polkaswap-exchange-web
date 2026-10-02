/** Conservative pre-acquisition allocation under the existing 8 GiB study exporter limit. */
export interface GoalStudyExportCapacityInput {
  /** Exact stored bytes; count duplicates conservatively rather than assuming object deduplication. */
  metadataRawFileBytes: readonly number[];
  metadataInputFileBytes: readonly number[];
  partitionFileBytes: readonly number[];
  publicProtocolBytes: number;
  maximumEpisodes: number;
  /** Extra bytes consumed by repeated reads in the fixed verifier, beyond one exported copy. */
  additionalReplayReadBytes?: number;
}

const MIB = 1024 ** 2;
const MAX_STUDY = 8 * 1024 ** 3;
const MAX_EPISODE = 512 * MIB;

/**
 * Reserve every non-raw file allowed by the exporter, then divide remaining bytes
 * across all possible episodes. The caller must enforce the returned ceiling on
 * actual raw envelope bytes, including their trailing newline, before persistence.
 * This allocation never changes a trading rule or raises an exporter limit.
 */
export function calculateGoalStudyExportCapacity(input: GoalStudyExportCapacityInput) {
  const additionalReplayReadBytes = input.additionalReplayReadBytes ?? 0;
  const values = [
    ...input.metadataRawFileBytes,
    ...input.metadataInputFileBytes,
    ...input.partitionFileBytes,
    input.publicProtocolBytes,
  ];
  if (
    !Number.isSafeInteger(input.maximumEpisodes) ||
    input.maximumEpisodes < 1 ||
    input.maximumEpisodes > 10 ||
    !Number.isSafeInteger(additionalReplayReadBytes) ||
    additionalReplayReadBytes < 0 ||
    additionalReplayReadBytes > MAX_STUDY ||
    values.some((bytes) => !Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_STUDY)
  )
    throw Error('Goal export capacity: invalid-size');
  const knownBytes = values.reduce((total, bytes) => total + bytes, 0);
  if (!Number.isSafeInteger(knownBytes)) throw Error('Goal export capacity: invalid-size');
  // Certificate; registration, selection and two claims; final bundle index.
  const rootAllowanceBytes = 32 * MIB + 4 * (MIB + 1) + 8 * MIB;
  // Access journal, complete trace/raw-receipt journal, episode manifest.
  const allowancePerEpisode = MIB + 1 + 32 * MIB + 1 + 4 * MIB;
  const fixedMaximumBytes = knownBytes + rootAllowanceBytes + input.maximumEpisodes * allowancePerEpisode;
  const maximumRawEvidenceBytesPerEpisode =
    Math.floor(
      Math.min(MAX_EPISODE, (MAX_STUDY - fixedMaximumBytes - additionalReplayReadBytes) / input.maximumEpisodes) / MIB
    ) * MIB;
  if (maximumRawEvidenceBytesPerEpisode < MIB) throw Error('Goal export capacity: insufficient-space');
  const maximumExportBytes = fixedMaximumBytes + input.maximumEpisodes * maximumRawEvidenceBytesPerEpisode;
  return Object.freeze({
    kind: 'bounded-study-export-capacity-v1' as const,
    maximumStudyBytes: MAX_STUDY,
    maximumEpisodes: input.maximumEpisodes,
    knownBytes,
    rootAllowanceBytes,
    allowancePerEpisode,
    additionalReplayReadBytes,
    maximumRawEvidenceBytesPerEpisode,
    maximumExportBytes,
    maximumReplayReadBytes: maximumExportBytes + additionalReplayReadBytes,
    rounding: 'down-to-whole-MiB' as const,
  });
}
