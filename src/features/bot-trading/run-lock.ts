/**
 * One tab runs a bot at a time.
 *
 * While this tab runs a bot it holds the Web Lock `polkaswap-bot-run:<id>`. Another tab that
 * tries to start or continue the same bot cannot take the lock, and reads it to show the bot as
 * running elsewhere. Browsers release a tab's locks when it closes, so a closed or crashed tab
 * never blocks a bot. Live trading also keeps its own per-account lease in `live.ts`.
 */
const PREFIX = 'polkaswap-bot-run:';
/** Bot IDs whose run lock this tab holds. */
const held = new Set<string>();

/**
 * Take the bot's run lock unless another tab holds it.
 * Resolves a release function, or `null` when another tab runs the bot. Without Web Locks
 * there is nothing to coordinate, so it resolves a no-op release.
 */
export function acquireRunLock(id: string): Promise<(() => void) | null> {
  const locks = globalThis.navigator?.locks;
  if (!locks) return Promise.resolve(() => undefined);
  return new Promise((resolve) => {
    locks
      .request(`${PREFIX}${id}`, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
        if (!lock) {
          resolve(null);
          return;
        }
        held.add(id);
        await new Promise<void>((release) =>
          resolve(() => {
            held.delete(id);
            release();
          })
        );
      })
      // A browser that refuses locks here cannot coordinate tabs; run without one.
      .catch(() => resolve(() => undefined));
  });
}

/** IDs of bots another tab of this browser is running now. */
export async function readRunsElsewhere(): Promise<Set<string>> {
  const locks = globalThis.navigator?.locks;
  if (!locks?.query) return new Set();
  try {
    const snapshot = await locks.query();
    return new Set(
      (snapshot.held ?? [])
        .map((lock) => lock.name ?? '')
        .filter((name) => name.startsWith(PREFIX))
        .map((name) => name.slice(PREFIX.length))
        .filter((id) => !held.has(id))
    );
  } catch {
    return new Set();
  }
}
