import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import { SUB_NETWORKS } from '@/consts/sub';

import { RelaychainAdapter } from './relaychain';

const ALPHANET_DATA = SUB_NETWORKS[SubNetworkId.Alphanet];

export class AlphanetRelaychainAdapter extends RelaychainAdapter {
  // overrides "WithConnectionApi"
  override get chainSymbol(): string | undefined {
    return ALPHANET_DATA?.nativeCurrency?.symbol;
  }

  // overrides "WithConnectionApi"
  override get chainDecimals(): number | undefined {
    return ALPHANET_DATA?.nativeCurrency?.decimals;
  }

  // overrides "WithConnectionApi"
  override get chainSS58(): number | undefined {
    return 42; // (Substrate, 42)
  }
}
