import { Consts } from '../consts';

// chameleon pools are disabled
const chameleonsEnabled = false;

// https://github.com/sora-xor/sora2-network/blob/master/runtime/src/lib.rs#L1030
export const getChameleonPools = (dexBaseAssetId: string): [string | null, string[]] => {
  if (chameleonsEnabled && dexBaseAssetId === Consts.XOR) {
    return [Consts.KXOR, [Consts.ETH]];
  } else {
    return [null, []];
  }
};
