import { FPNumber } from '@sora-substrate/sdk';
import { computed, getCurrentScope, onScopeDispose, shallowRef, watch } from 'vue';

import { SoraNetwork } from '@/consts';
import { useSettingsStore } from '@/stores/settings';

import type { TonswapCampaignSummary } from '@/features/misc/lib/tonswapCampaignStatus';

/** The first read waits until the page has painted, so the sidebar never competes with startup. */
export const TONSWAP_STATUS_FIRST_READ_MS = 2_500;
/** Time between reads while the tab is visible. */
export const TONSWAP_STATUS_REFRESH_MS = 60_000;
/** A reading older than this is dropped: the sidebar must not say burning is open on stale data. */
export const TONSWAP_STATUS_MAX_AGE_MS = 5 * 60_000;
const RETRY_BASE_MS = 5_000;

const summary = shallowRef<TonswapCampaignSummary | null>(null);
let pollers = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<void> | null = null;
let failures = 0;
let readAt = 0;
let generation = 0;

/**
 * Formats a TS-per-XOR rate with two decimals in the app's locale. FPNumber rounds down, so the label never
 * promises more TS than the campaign pays.
 */
export function formatTonswapRate(rate: FPNumber): string {
  return rate.toFixed(2).replace('.', FPNumber.DELIMITERS_CONFIG.decimal);
}

/**
 * Stores a fresh, verified reading, or clears the current one. Readings expire on their own, so a lost indexer
 * connection cannot leave a "live" claim on screen. The Burn page publishes the data it already fetches here.
 */
export function publishTonswapCampaignSummary(next: TonswapCampaignSummary | null): void {
  summary.value = next;
  readAt = next ? Date.now() : 0;
  clearTimeout(expiry);
  expiry = undefined;
  if (next) {
    expiry = setTimeout(() => {
      summary.value = null;
      readAt = 0;
    }, TONSWAP_STATUS_MAX_AGE_MS);
  }
}

/**
 * Reads the finalized campaign snapshot once. The query and the allocator load on demand, so the sidebar adds
 * nothing to the startup bundle. Returns `null` unless the indexer vouches that the snapshot is fresh.
 */
export async function readTonswapCampaignSummary(): Promise<TonswapCampaignSummary | null> {
  const [{ fetchTonswapBurnSnapshot }, { allocateTonswapBurns }, { summarizeTonswapCampaign }] = await Promise.all([
    import('@/indexer/queries/tonswapBurn'),
    import('@/features/misc/lib/tonswapBurn'),
    import('@/features/misc/lib/tonswapCampaignStatus'),
  ]);
  const snapshot = await fetchTonswapBurnSnapshot();
  if (!snapshot.fresh) return null;
  return summarizeTonswapCampaign(allocateTonswapBurns(snapshot.burns), snapshot.indexedThroughBlock);
}

/** One read at a time. A failed or stale read keeps the last verified reading until it expires. */
function refresh(): Promise<void> {
  if (inFlight) return inFlight;
  const run = generation;
  inFlight = (async () => {
    try {
      const next = await readTonswapCampaignSummary();
      if (run !== generation) return;
      if (next) {
        failures = 0;
        publishTonswapCampaignSummary(next);
      } else {
        failures += 1;
      }
    } catch {
      if (run === generation) failures += 1;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function schedule(delay: number): void {
  clearTimeout(timer);
  timer = undefined;
  if (pollers > 0) timer = setTimeout(() => void tick(), delay);
}

/** Skips the network while the tab is hidden or when the Burn page has just published newer data. */
async function tick(): Promise<void> {
  timer = undefined;
  if (pollers === 0) return;
  const recent = readAt > 0 && Date.now() - readAt < TONSWAP_STATUS_REFRESH_MS - RETRY_BASE_MS;
  if (!document.hidden && !recent) await refresh();
  schedule(
    failures > 0 ? Math.min(TONSWAP_STATUS_REFRESH_MS, RETRY_BASE_MS * 2 ** (failures - 1)) : TONSWAP_STATUS_REFRESH_MS
  );
}

/** Catches up right away when the user returns to a tab whose reading has aged. */
function handleVisibilityChange(): void {
  if (!document.hidden && pollers > 0 && Date.now() - readAt >= TONSWAP_STATUS_REFRESH_MS) schedule(0);
}

function acquire(): void {
  pollers += 1;
  if (pollers > 1) return;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  schedule(TONSWAP_STATUS_FIRST_READ_MS);
}

function release(): void {
  pollers = Math.max(0, pollers - 1);
  if (pollers > 0) return;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  clearTimeout(timer);
  timer = undefined;
  generation += 1;
  failures = 0;
}

/**
 * Keeps the TONSWAP campaign reading current for the sidebar. Polling runs on SORA mainnet only, where the
 * campaign exists, and stops with the last component that asked for it. `isLive` is true only when a fresh,
 * verified snapshot shows XOR still eligible for TS.
 */
export function useTonswapCampaignStatus() {
  const settings = useSettingsStore();
  const isMainnet = computed(() => settings.soraNetwork === SoraNetwork.Prod);
  let holding = false;

  watch(
    isMainnet,
    (active) => {
      if (active && !holding) {
        holding = true;
        acquire();
      } else if (!active && holding) {
        holding = false;
        release();
      }
    },
    { immediate: true }
  );
  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (!holding) return;
      holding = false;
      release();
    });
  }

  const current = computed(() => (isMainnet.value ? summary.value : null));
  return {
    summary: current,
    isLive: computed(() => current.value?.live === true),
    rateLabel: computed(() => (current.value ? formatTonswapRate(current.value.rate) : '')),
  };
}
