import { noirStorage } from '@/utils/storage';

import type { NoirState } from './types';

export function initialState(): NoirState {
  return {
    totalRedeemed: 0,
    total: 0,
    redemptionSubscription: null,
    walletDialogVisibility: false,
    editionDialogVisibility: false,
    redeemDialogVisibility: false,
    congratulationsDialogVisibility: false,
    agreementSigned: Boolean(noirStorage.get('agreement')) || false,
  };
}

const state = initialState();

export default state;
