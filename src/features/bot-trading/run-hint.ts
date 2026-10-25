/**
 * Startup hint for the top bar: does this browser have bots worth showing?
 *
 * The bot engine is large, so the top bar loads it only while this hint is set. The run host
 * (`runs.ts`) keeps the hint in step with the saved bots, and other tabs follow through the
 * `storage` event. The hint is one flag: it holds no bot data and grants nothing.
 */
import { ref } from 'vue';

export const BOT_RUNS_HINT_KEY = 'polkaswap-bots-runs-v1';

function readHint(): boolean {
  try {
    return globalThis.localStorage?.getItem(BOT_RUNS_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** True when a saved bot runs, will continue, or waits for the user. */
export const botRunsHint = ref(readHint());

/** Record whether the top bar should show bot runs. */
export function setBotRunsHint(active: boolean): void {
  botRunsHint.value = active;
  try {
    if (active) globalThis.localStorage?.setItem(BOT_RUNS_HINT_KEY, '1');
    else globalThis.localStorage?.removeItem(BOT_RUNS_HINT_KEY);
  } catch {
    /* Storage can be refused, for example in a private window; this tab still updates. */
  }
}

globalThis.addEventListener?.('storage', (event: StorageEvent) => {
  if (event.key === BOT_RUNS_HINT_KEY || event.key === null) botRunsHint.value = readHint();
});
