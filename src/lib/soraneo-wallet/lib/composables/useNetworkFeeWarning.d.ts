import { FPNumber, NetworkFeesObject } from '@sora-substrate/sdk';
import { NetworkFeeWarningOptions } from '../consts';

export declare function useNetworkFeeWarning(): {
  allowFeePopup: import('vue').ComputedRef<boolean>;
  networkFees: import('vue').ComputedRef<NetworkFeesObject>;
  xorBalance: import('vue').ComputedRef<FPNumber>;
  isXorSufficientForNextTx: ({ type, isXor, amount }: NetworkFeeWarningOptions) => boolean;
};
