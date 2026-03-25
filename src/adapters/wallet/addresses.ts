import { api } from '@/shims/wallet-api';

import type { Nullable } from '@/types/common';

const hasValidator = (): boolean => typeof api?.validateAddress === 'function';

export const isValidWalletAddress = (address?: Nullable<string>): boolean => {
  if (typeof address !== 'string' || address.trim().length === 0) {
    return false;
  }

  if (!hasValidator()) {
    return false;
  }

  try {
    return Boolean(api.validateAddress(address));
  } catch (error) {
    console.warn('[wallet-adapter] validateAddress failed', error);
    return false;
  }
};
