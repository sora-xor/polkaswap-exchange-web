import type { VaultStatuses, VaultEventTypes } from './consts';
import type { FPNumber } from '@sora-substrate/math';
import type { Vault } from '@sora-substrate/sdk/build/kensetsu/types';

export type VaultStatus = keyof typeof VaultStatuses;
export type VaultEventType = keyof typeof VaultEventTypes;

export type VaultEvent = {
  amount: Nullable<FPNumber>;
  timestamp: number;
  type: VaultEventType;
};

export type ClosedVault = Omit<Vault, 'ownerId' | 'lockedAmount' | 'debt' | 'internalDebt' | 'interestCoefficient'> & {
  status: VaultStatus;
  returned: FPNumber;
};
