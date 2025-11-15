import { AppWallet } from '@wallet/lib/consts';

import type { PolkadotJsAccount } from '@wallet/lib/types/common';

export const MOCK_ACCOUNT: PolkadotJsAccount = {
  address: 'cnRXua6zs8TaE87BQFL6uWVbT2g6GXsUjwk6PTvL6UHcHDCvo',
  name: 'Sora Name',
  source: AppWallet.PolkadotJS,
};
