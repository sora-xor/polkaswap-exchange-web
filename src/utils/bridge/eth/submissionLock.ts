type ExclusiveTask<T> = () => Promise<T>;

const processLocalLocks = new Map<string, Promise<void>>();

/** Error code used when a browser cannot provide origin-wide mutual exclusion. */
export const EVM_SUBMISSION_LOCK_UNAVAILABLE = 'BRIDGE_EVM_SUBMISSION_LOCK_UNAVAILABLE';

/**
 * Serializes one task inside the current JavaScript realm.
 *
 * This fallback exists for SSR, tests, and other non-browser runtimes. Browser
 * broadcasts require Web Locks because a realm-local queue cannot protect
 * against another Polkaswap tab.
 */
const withProcessLocalLock = async <T>(name: string, task: ExclusiveTask<T>): Promise<T> => {
  const previous = processLocalLocks.get(name) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.catch(() => undefined).then(() => current);

  processLocalLocks.set(name, tail);
  await previous.catch(() => undefined);

  try {
    return await task();
  } finally {
    release();
    if (processLocalLocks.get(name) === tail) processLocalLocks.delete(name);
  }
};

/**
 * Runs an EVM submission critical section under an origin-wide exclusive lock.
 * Unsupported browsers fail closed instead of risking two tabs broadcasting
 * the same bridge request.
 */
export const withCrossTabEvmSubmissionLock = async <T>(name: string, task: ExclusiveTask<T>): Promise<T> => {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const lockManager = typeof navigator !== 'undefined' ? navigator.locks : undefined;

  if (lockManager?.request) {
    return await lockManager.request(name, { mode: 'exclusive' }, task);
  }

  if (isBrowser) {
    throw Object.assign(new Error('[Bridge]: Secure cross-tab EVM submission locking is unavailable'), {
      code: EVM_SUBMISSION_LOCK_UNAVAILABLE,
    });
  }

  return await withProcessLocalLock(name, task);
};
