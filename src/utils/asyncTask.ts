type AsyncTask = () => Promise<void> | void;

/**
 * Runs at most one task at a time and coalesces any calls made while it is active
 * into one follow-up run. The follow-up reads current reactive state, preventing
 * source changes from being silently dropped during a slow request.
 */
export function createCoalescedAsyncTask(task: AsyncTask): () => Promise<void> {
  let activeTask: Promise<void> | null = null;
  let rerunRequested = false;

  const execute = async (): Promise<void> => {
    let lastError: unknown;

    do {
      rerunRequested = false;
      try {
        await task();
        lastError = undefined;
      } catch (error) {
        lastError = error;
      }

      // Let reactions queued by the completed task request a rerun before the
      // loop decides that the current active promise can settle.
      await Promise.resolve();
    } while (rerunRequested);

    if (lastError !== undefined) throw lastError;
  };

  return (): Promise<void> => {
    if (activeTask) {
      rerunRequested = true;
      return activeTask;
    }

    activeTask = execute().finally(() => {
      activeTask = null;
    });

    return activeTask;
  };
}
