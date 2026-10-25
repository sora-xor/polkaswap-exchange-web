const DEFAULT_RETRY_DELAY_MS = 300;

/**
 * Retries an async query a limited number of times while its result is considered empty.
 */
export async function retryOnEmptyResult<T>(
  request: () => Promise<T>,
  isEmpty: (value: T) => boolean,
  attempts = 2,
  delayMs = DEFAULT_RETRY_DELAY_MS
): Promise<T> {
  let result = await request();

  for (let attempt = 1; attempt < attempts && isEmpty(result); attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    result = await request();
  }

  return result;
}
