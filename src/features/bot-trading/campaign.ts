/** Fixed, public campaign accounting. Wallet authority is kept only in the live executor. */
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { codec, toCodec } from './amounts';
import { sameBotAccount } from './account-identity';
import { consentIdentity, pendingOrder } from './policy';
import type { BotDefinition, BotOrder } from './types';

export const DISCOVERY_GOAL_ACTIVE_MS = 14 * 24 * 60 * 60_000;
export const DISCOVERY_GRANT_MAX_MS = 14 * 24 * 60 * 60_000;
const MAX_OBSERVATION_GAP_MS = 60_000;
const MARK_MAX_AGE_MS = 60_000;
const HASH = /^0x[0-9a-f]{64}$/i;

export interface DiscoveryCampaignMark {
  network: string;
  blockHash: string;
  blockNumber: number;
  timestampMs: number;
  denominator: string;
  /** Exact current-liquidation and unchanged-hold values at the same finalized state. */
  values: Record<string, { currentOutputCodec: string; holdOutputCodec: string; capitalXorCodec: string }>;
}

export interface DiscoveryBotProgress {
  botId: string;
  maxDrawdownPercent: string;
  openedOutputCodec: string;
  latestOutputCodec: string;
  benchmarkOutputCodec: string;
  peakOutputCodec: string;
  activeMs: number;
  successfulSwaps: number;
  outcome: 'active' | 'target' | 'loss';
  completedAt?: number;
  lastGrantId?: string;
  lastBlockHash?: string;
  lastBlockNumber?: number;
  lastTimestampMs?: number;
}

export interface DiscoveryCampaign {
  version: 1;
  id: string;
  account: string;
  network: string;
  botIds: string[];
  /** Immutable strategy, allocation, limits and goal identity for the approved set. */
  consent: Record<string, string>;
  sharedCapXorCodec: string;
  committedXorCodec: string;
  openingBlockHash: string;
  openingBlockNumber: number;
  openingTimestampMs: number;
  denominator: string;
  createdAt: number;
  status: 'paused' | 'running' | 'completed' | 'closed';
  grant?: { id: string; startedAt: number; expiresAt: number };
  progress: Record<string, DiscoveryBotProgress>;
}

/** Freeze an unsigned campaign review from freshly marked, untraded allocations. */
export function createDiscoveryCampaign(
  id: string,
  bots: BotDefinition[],
  mark: DiscoveryCampaignMark,
  sharedCapXorCodec: string,
  maxDrawdownPercent: Record<string, string>,
  createdAt: number
): DiscoveryCampaign {
  if (
    !id ||
    !Array.isArray(bots) ||
    bots.length < 1 ||
    bots.length > 3 ||
    bots.some(
      (bot) =>
        bot.discoveryCampaignId !== id ||
        bot.status !== 'paused' ||
        JSON.stringify(bot.portfolio.initial) !== JSON.stringify(bot.portfolio.holdings)
    ) ||
    mark.timestampMs > createdAt ||
    createdAt - mark.timestampMs > MARK_MAX_AGE_MS
  )
    throw new Error('bots.errors.policy');
  const committedXorCodec = bots
    .reduce((sum, bot) => sum + codec(mark.values[bot.id]?.capitalXorCodec ?? ''), 0n)
    .toString();
  const progress = Object.fromEntries(
    bots.map((bot) => {
      const opened = mark.values[bot.id]?.currentOutputCodec;
      if (!opened || codec(opened) <= 0n || opened !== mark.values[bot.id]?.holdOutputCodec)
        throw new Error('bots.errors.policy');
      return [
        bot.id,
        {
          botId: bot.id,
          maxDrawdownPercent: maxDrawdownPercent[bot.id],
          openedOutputCodec: opened,
          latestOutputCodec: opened,
          benchmarkOutputCodec: opened,
          peakOutputCodec: opened,
          activeMs: 0,
          successfulSwaps: 0,
          outcome: 'active' as const,
        },
      ];
    })
  ) as DiscoveryCampaign['progress'];
  const campaign: DiscoveryCampaign = {
    version: 1,
    id,
    account: bots[0].account,
    network: mark.network,
    botIds: bots.map((bot) => bot.id),
    consent: Object.fromEntries(bots.map((bot) => [bot.id, consentIdentity(bot)])),
    sharedCapXorCodec,
    committedXorCodec,
    openingBlockHash: mark.blockHash,
    openingBlockNumber: mark.blockNumber,
    openingTimestampMs: mark.timestampMs,
    denominator: mark.denominator,
    createdAt,
    status: 'paused',
    progress,
  };
  validateDiscoveryCampaign(campaign, bots);
  return campaign;
}

/** Check a fixed campaign and its exact XOR cap before an atomic ledger write. */
export function validateDiscoveryCampaign(campaign: DiscoveryCampaign, bots: readonly BotDefinition[]): void {
  if (
    campaign.version !== 1 ||
    !campaign.id ||
    !campaign.account ||
    !HASH.test(campaign.network) ||
    !Array.isArray(campaign.botIds) ||
    campaign.botIds.length < 1 ||
    campaign.botIds.length > 3 ||
    new Set(campaign.botIds).size !== campaign.botIds.length ||
    !HASH.test(campaign.openingBlockHash) ||
    !Number.isSafeInteger(campaign.openingBlockNumber) ||
    campaign.openingBlockNumber < 1 ||
    !Number.isSafeInteger(campaign.openingTimestampMs) ||
    campaign.openingTimestampMs <= 0 ||
    !/^[1-9]\d{0,119}$/.test(campaign.denominator) ||
    !Number.isSafeInteger(campaign.createdAt) ||
    campaign.createdAt < campaign.openingTimestampMs ||
    !['paused', 'running', 'completed', 'closed'].includes(campaign.status) ||
    (campaign.status === 'running') !== Boolean(campaign.grant) ||
    codec(campaign.sharedCapXorCodec) <= 0n ||
    codec(campaign.committedXorCodec) > codec(campaign.sharedCapXorCodec) ||
    (campaign.grant !== undefined &&
      (!campaign.grant.id ||
        !Number.isSafeInteger(campaign.grant.startedAt) ||
        !Number.isSafeInteger(campaign.grant.expiresAt) ||
        campaign.grant.startedAt < campaign.createdAt ||
        campaign.grant.expiresAt <= campaign.grant.startedAt ||
        campaign.grant.expiresAt - campaign.grant.startedAt > DISCOVERY_GRANT_MAX_MS)) ||
    bots.length !== campaign.botIds.length
  )
    throw new Error('bots.errors.policy');
  for (const bot of bots) {
    const progress = campaign.progress[bot.id];
    if (
      !campaign.botIds.includes(bot.id) ||
      bot.discoveryCampaignId !== campaign.id ||
      bot.mode !== 'live' ||
      !sameBotAccount(bot.account, campaign.account) ||
      bot.network !== campaign.network ||
      bot.policy.feeAsset.address !== XOR.address ||
      campaign.consent[bot.id] !== consentIdentity(bot) ||
      !progress ||
      progress.botId !== bot.id ||
      !/^(0|[1-9]\d*)$/.test(progress.openedOutputCodec) ||
      codec(progress.openedOutputCodec) <= 0n ||
      codec(progress.peakOutputCodec) < codec(progress.openedOutputCodec) ||
      !Number.isSafeInteger(progress.activeMs) ||
      progress.activeMs < 0 ||
      !Number.isSafeInteger(progress.successfulSwaps) ||
      progress.successfulSwaps < 0 ||
      !['active', 'target', 'loss'].includes(progress.outcome)
    )
      throw new Error('bots.errors.policy');
    const loss = toCodec(progress.maxDrawdownPercent, 18);
    if (codec(loss) < 0n || codec(loss) > 100n * 10n ** 18n) throw new Error('bots.errors.policy');
  }
}

/** Start or resume one reviewed set; a new grant cannot revive a completed bot. */
export function grantDiscoveryCampaign(campaign: DiscoveryCampaign, bots: readonly BotDefinition[], now: number): void {
  validateDiscoveryCampaign(campaign, bots);
  if (
    !Number.isSafeInteger(now) ||
    now < campaign.createdAt ||
    campaign.status !== 'paused' ||
    campaign.grant ||
    campaign.botIds.every((id) => campaign.progress[id].outcome !== 'active')
  )
    throw new Error('bots.errors.session');
  campaign.status = 'running';
  campaign.grant = { id: crypto.randomUUID(), startedAt: now, expiresAt: now + DISCOVERY_GRANT_MAX_MS };
}

/** Permanently release the fixed set's allocations after every account order is finalized. */
export function closeDiscoveryCampaign(
  campaign: DiscoveryCampaign,
  bots: readonly BotDefinition[],
  orders: readonly BotOrder[]
): void {
  validateDiscoveryCampaign(campaign, bots);
  if (
    campaign.status === 'running' ||
    campaign.grant ||
    orders.some(
      (order) =>
        sameBotAccount(order.account, campaign.account) && order.network === campaign.network && pendingOrder(order)
    )
  )
    throw new Error('bots.errors.pending');
  campaign.status = 'closed';
  for (const bot of bots) {
    bot.status = 'stopped';
    bot.sessionExpiresAt = 0;
  }
}

/** Bind one finalized mark to the same durable portfolios and receipt horizon used for progress. */
export function assertDiscoveryMarkLedger(
  campaign: DiscoveryCampaign,
  bots: readonly BotDefinition[],
  orders: readonly BotOrder[],
  mark: DiscoveryCampaignMark,
  expectedPortfolios: Record<string, BotDefinition['portfolio']>,
  admissionOrderId?: string
): void {
  // A locally signed order cannot be broadcast before markSubmitted. Only that
  // specific order may be excluded for its final pre-broadcast valuation.
  const admission = admissionOrderId && orders.find((order) => order.id === admissionOrderId);
  if (
    admissionOrderId &&
    (!admission ||
      admission.status !== 'signed' ||
      !campaign.botIds.includes(admission.botId) ||
      !sameBotAccount(admission.account, campaign.account) ||
      admission.network !== campaign.network ||
      !admission.txHash ||
      !admission.signedEnvelopeDigest)
  )
    throw new Error('bots.errors.pending');
  if (
    orders.some(
      (order) =>
        sameBotAccount(order.account, campaign.account) &&
        order.network === campaign.network &&
        pendingOrder(order) &&
        order.id !== admissionOrderId
    )
  )
    throw new Error('bots.errors.pending');
  if (
    bots.some(
      (bot) =>
        !expectedPortfolios[bot.id] || JSON.stringify(bot.portfolio) !== JSON.stringify(expectedPortfolios[bot.id])
    )
  )
    throw new Error('bots.errors.stale');
  if (
    orders.some(
      (order) =>
        campaign.botIds.includes(order.botId) && order.finalized && order.finalized.blockNumber > mark.blockNumber
    )
  )
    throw new Error('bots.errors.stale');
}

/** Count only consecutive finalized chain time inside the same unlocked grant. */
export function advanceDiscoveryCampaign(
  campaign: DiscoveryCampaign,
  bots: readonly BotDefinition[],
  mark: DiscoveryCampaignMark,
  orders: readonly BotOrder[]
): void {
  validateDiscoveryCampaign(campaign, bots);
  const grant = campaign.grant;
  if (
    campaign.status !== 'running' ||
    !grant ||
    mark.network !== campaign.network ||
    mark.denominator !== campaign.denominator ||
    !HASH.test(mark.blockHash) ||
    !Number.isSafeInteger(mark.blockNumber) ||
    mark.blockNumber <= campaign.openingBlockNumber ||
    !Number.isSafeInteger(mark.timestampMs) ||
    mark.timestampMs < campaign.openingTimestampMs
  )
    throw new Error('bots.errors.stale');
  if (
    orders.some(
      (order) =>
        campaign.botIds.includes(order.botId) && order.finalized && order.finalized.blockNumber > mark.blockNumber
    )
  )
    throw new Error('bots.errors.stale');
  // A finalized block can predate the unlock; it must never start the active-time clock.
  if (mark.timestampMs < grant.startedAt) return;
  if (mark.timestampMs >= grant.expiresAt) {
    campaign.status = 'paused';
    delete campaign.grant;
    for (const bot of bots) if (bot.status === 'running') bot.status = 'paused';
    return;
  }
  if (
    bots.some((bot) => {
      const current = campaign.progress[bot.id];
      return (
        current.outcome === 'active' &&
        bot.status === 'running' &&
        current.lastGrantId === grant.id &&
        current.lastTimestampMs !== undefined &&
        mark.timestampMs - current.lastTimestampMs > MAX_OBSERVATION_GAP_MS
      );
    })
  ) {
    campaign.status = 'paused';
    delete campaign.grant;
    for (const bot of bots) if (bot.status === 'running') bot.status = 'paused';
    return;
  }
  for (const bot of bots) {
    const current = campaign.progress[bot.id];
    if (current.outcome !== 'active' || bot.status !== 'running') continue;
    const point = mark.values[bot.id];
    if (!point || codec(point.holdOutputCodec) <= 0n) throw new Error('bots.errors.stale');
    if (current.lastBlockNumber !== undefined) {
      if (mark.blockNumber < current.lastBlockNumber || mark.timestampMs < current.lastTimestampMs!)
        throw new Error('bots.errors.stale');
      if (mark.blockNumber === current.lastBlockNumber) {
        if (mark.blockHash !== current.lastBlockHash) throw new Error('bots.errors.stale');
        continue;
      }
    }
    const gap =
      current.lastGrantId === grant.id && current.lastTimestampMs !== undefined
        ? mark.timestampMs - current.lastTimestampMs
        : 0;
    current.activeMs += gap;
    current.lastGrantId = grant.id;
    current.lastBlockHash = mark.blockHash;
    current.lastBlockNumber = mark.blockNumber;
    current.lastTimestampMs = mark.timestampMs;
    current.latestOutputCodec = point.currentOutputCodec;
    current.benchmarkOutputCodec = point.holdOutputCodec;
    if (codec(current.peakOutputCodec) < codec(point.currentOutputCodec))
      current.peakOutputCodec = point.currentOutputCodec;
    const provenSwaps = new Set(
      orders
        .filter(
          (order) =>
            order.botId === bot.id &&
            order.status === 'confirmed' &&
            !!order.signedEnvelopeDigest &&
            !!order.txHash &&
            HASH.test(order.txHash) &&
            !!order.finalized &&
            HASH.test(order.finalized.blockHash) &&
            order.finalized.blockNumber > campaign.openingBlockNumber &&
            order.finalized.blockNumber <= mark.blockNumber &&
            Number.isSafeInteger(order.finalized.extrinsicIndex) &&
            order.finalized.extrinsicIndex >= 0
        )
        .map((order) => order.txHash)
    ).size;
    if (provenSwaps < current.successfulSwaps) throw new Error('bots.errors.receipt');
    current.successfulSwaps = provenSwaps;
    const peak = codec(current.peakOutputCodec);
    const latest = codec(current.latestOutputCodec);
    const drawdownLimit = codec(toCodec(current.maxDrawdownPercent, 18));
    const drawdown = peak - latest;
    if (drawdown > 0n && drawdown * 100n * 10n ** 18n >= peak * drawdownLimit) {
      current.outcome = 'loss';
      current.completedAt = mark.timestampMs;
    } else if (
      current.activeMs >= DISCOVERY_GOAL_ACTIVE_MS &&
      current.successfulSwaps >= 10 &&
      latest > codec(current.openedOutputCodec) &&
      latest > codec(current.benchmarkOutputCodec)
    ) {
      current.outcome = 'target';
      current.completedAt = mark.timestampMs;
    }
    if (current.outcome !== 'active' && !['idle', 'stopped'].includes(bot.status)) bot.status = 'paused';
  }
  if (campaign.botIds.every((id) => campaign.progress[id].outcome !== 'active')) {
    campaign.status = 'completed';
    delete campaign.grant;
  }
}
