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

export type IndexerVaultEvent = {
  amount: Nullable<string>;
  timestamp: number;
  type: VaultEventType;
};

export type SubqueryVault = {
  id: string;
  type: 'Type1' | 'Type2';
  status: VaultStatus;
  collateralAssetId: string;
  debtAssetId: string;
  collateralAmountReturned: string;
};

export type SubsquidVault = {
  id: string;
  type: 'Type1' | 'Type2';
  status: VaultStatus;
  collateralAsset: {
    id: string;
  };
  debtAsset: {
    id: string;
  };
  collateralAmountReturned: string;
};

export type ClosedVault = Omit<Vault, 'ownerId' | 'lockedAmount' | 'debt' | 'internalDebt' | 'interestCoefficient'> & {
  status: VaultStatus;
  returned: FPNumber;
};
