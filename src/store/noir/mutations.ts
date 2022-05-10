import { defineMutations } from 'direct-vuex';
import { FPNumber } from '@sora-substrate/util';
import { noirStorage } from '@/utils/storage';
import type { CodecString } from '@sora-substrate/util';
import type { NoirState } from './types';

interface RedemptionData {
  totalRedeemed: number;
  noirReserve: CodecString;
  noirTotalSupply: FPNumber;
}

const mutations = defineMutations<NoirState>()({
  setRedemptionDataSuccess(state, params: RedemptionData) {
    state.totalRedeemed = params.totalRedeemed;
    const totalRedeemedFP = FPNumber.fromCodecValue(params.totalRedeemed);
    state.total = params.noirTotalSupply.sub(totalRedeemedFP).toNumber(0);
  },
  setRedemptionDataFailure(state) {
    state.totalRedeemed = 0;
    state.total = 0;
  },
  setRedemptionDataSubscription(state, updates: NodeJS.Timer) {
    state.redemptionSubscription = updates;
  },
  resetRedemptionDataSubscription(state) {
    if (state.redemptionSubscription) {
      clearInterval(state.redemptionSubscription);
    }
    state.redemptionSubscription = null;
  },
  setWalletDialogVisibility(state, flag: boolean) {
    state.walletDialogVisibility = flag;
  },
  setRedeemDialogVisibility(state, flag: boolean) {
    state.redeemDialogVisibility = flag;
  },
  setEditionDialogVisibility(state, flag: boolean) {
    state.editionDialogVisibility = flag;
  },
  setCongratulationsDialogVisibility(state, flag: boolean) {
    state.congratulationsDialogVisibility = flag;
  },
  setAgreement(state, flag: boolean) {
    state.agreementSigned = flag;
    noirStorage.set('agreement', flag);
  },
});

export default mutations;
