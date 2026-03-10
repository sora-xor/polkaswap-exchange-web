/**
 * Calculates campaign time left in milliseconds.
 *
 * Uses block-based countdown when a reliable block number is available, and
 * falls back to timestamp-based countdown while the block height is still
 * unavailable at app bootstrap.
 */
export const getCampaignMsLeft = (
  campaignToBlock: number,
  currentBlock: number,
  campaignToTimestamp: number,
  options: { now?: number; blockDuration?: number } = {}
): number => {
  const now = options.now ?? Date.now();
  const blockDuration = options.blockDuration ?? 6_000;
  const hasReliableBlock = Number.isFinite(currentBlock) && currentBlock > 0;

  if (hasReliableBlock) {
    return (campaignToBlock - currentBlock) * blockDuration;
  }

  return campaignToTimestamp - now;
};
