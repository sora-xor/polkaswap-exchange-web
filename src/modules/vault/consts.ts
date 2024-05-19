export enum VaultPageNames {
  Vaults = 'Vaults',
  VaultDetails = 'VaultDetails',
}

export enum VaultComponents {
  CreateVaultDialog = 'CreateVaultDialog',
  AddCollateralDialog = 'AddCollateralDialog',
  BorrowMoreDialog = 'BorrowMoreDialog',
  CloseVaultDialog = 'CloseVaultDialog',
  LtvProgressBar = 'LtvProgressBar',
  PrevNextInfoLine = 'PrevNextInfoLine',
  RepayDebtDialog = 'RepayDebtDialog',
  ExploreCollaterals = 'ExploreCollaterals',
  ExploreOverallStats = 'ExploreOverallStats',
  VaultDetailsHistory = 'VaultDetailsHistory',
}

export enum VaultStatuses {
  Opened = 'Opened',
  Closed = 'Closed',
  Liquidated = 'Liquidated',
}

export enum VaultEventTypes {
  Created = 'Created',
  DebtIncreased = 'DebtIncreased',
  CollateralDeposit = 'CollateralDeposit',
  DebtPayment = 'DebtPayment',
  Closed = 'Closed',
  Liquidated = 'Liquidated',
}

export const LtvTranslations = {
  success: 'SAFE',
  warning: 'RISKY',
  error: 'HIGH RISK',
};
