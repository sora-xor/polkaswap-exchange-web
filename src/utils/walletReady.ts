import { api } from '@/lib/soraneo-wallet/src/api';

import { delay } from './timing';

/**
 * Waits until the chain account pair exists before running wallet operations
 * that require a signer/account pair.
 */
export const waitForAccountPair = async (func?: FnWithoutArgs | AsyncFnWithoutArgs): Promise<any> => {
  if (!api.accountPair) {
    await delay();
    return await waitForAccountPair(func);
  }

  return func?.();
};
