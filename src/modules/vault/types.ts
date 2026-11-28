import type { VaultStatuses, VaultEventTypes } from './consts';
import type { FPNumber } from '@/lib/substrate/math';
import type { Vault } from '@/lib/substrate/sdk/kensetsu/types';

export type VaultStatus = keyof typeof VaultStatuses;
export type VaultEventType = keyof typeof VaultEventTypes;

export type VaultEvent = {
  id: string;
  amount: Nullable<FPNumber>;
  timestamp: number;
  type: VaultEventType;
};

export type ClosedVault = Omit<Vault, 'ownerId' | 'lockedAmount' | 'debt' | 'internalDebt' | 'interestCoefficient'> & {
  status: VaultStatus;
  returned: FPNumber;
};
