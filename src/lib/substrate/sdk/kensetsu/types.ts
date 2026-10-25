import type { CodecString, FPNumber } from '@sora-substrate/math';
import type { PriceVariant } from '@sora-substrate/liquidity-proxy';

import type { History } from '../types';
import type { VaultTypes } from './consts';

export type VaultType = (typeof VaultTypes)[keyof typeof VaultTypes];

export type Vault = {
  owner?: string;
  vaultType: VaultType;
  lockedAssetId: string;
  debtAssetId: string;
  lockedAmount: FPNumber;
  debt: FPNumber;
  internalDebt: FPNumber;
  interestCoefficient: FPNumber;
  id: number;
};

type RiskParameters = {
  hardCap: FPNumber;
  liquidationRatioReversed: number;
  liquidationRatio: number;
  maxLiquidationLot: FPNumber;
  stabilityFeeSecs: FPNumber;
  stabilityFeeAnnual: FPNumber;
  minDeposit: FPNumber;
};

export type Collateral = {
  lockedAssetId: string;
  debtAssetId: string;
  riskParams: RiskParameters;
  debtSupply: FPNumber;
  totalLocked: FPNumber;
  lastFeeUpdateTimeSecs: number;
  interestCoefficient: FPNumber;
};

export type StablecoinInfo = {
  badDebt: FPNumber;
  pegAsset: string;
  isSoraAsset: boolean;
};

export interface VaultHistory extends History {
  vaultId: number;
}

export type BorrowTaxes = { borrowTax: number; tbcdBorrowTax: number; karmaBorrowTax: number };

export type AveragePrice = {
  [PriceVariant.Buy]: CodecString;
  [PriceVariant.Sell]: CodecString;
};
