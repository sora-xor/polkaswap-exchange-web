import { Alphanet } from '@/consts/sub/networks/alphanet';

import { RelaychainAdapter } from './relaychain';

export class AlphanetRelaychainAdapter extends RelaychainAdapter {
  // overrides "WithConnectionApi"
  override get chainSymbol(): string | undefined {
    return Alphanet?.nativeCurrency?.symbol;
  }

  // overrides "WithConnectionApi"
  override get chainDecimals(): number | undefined {
    return Alphanet?.nativeCurrency?.decimals;
  }

  // overrides "WithConnectionApi"
  override get chainSS58(): number | undefined {
    return 42; // (Substrate, 42)
  }
}
