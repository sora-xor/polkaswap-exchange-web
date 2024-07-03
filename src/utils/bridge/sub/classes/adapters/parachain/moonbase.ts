import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

import { SUB_NETWORKS } from '@/consts/sub';

import { SubAdapter } from '../substrate';

const MOONBASE_DATA = SUB_NETWORKS[SubNetworkId.AlphanetMoonbase];

export class MoonbaseParachainAdapter extends SubAdapter {
  // overrides "WithConnectionApi"
  override get chainSymbol(): string | undefined {
    return MOONBASE_DATA?.nativeCurrency?.symbol;
  }
}
