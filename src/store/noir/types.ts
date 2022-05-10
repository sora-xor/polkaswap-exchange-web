export type NoirState = {
  totalRedeemed: number;
  total: number;
  redemptionSubscription: Nullable<NodeJS.Timer>;
  walletDialogVisibility: boolean;
  editionDialogVisibility: boolean;
  redeemDialogVisibility: boolean;
  congratulationsDialogVisibility: boolean;
  agreementSigned: boolean;
};
