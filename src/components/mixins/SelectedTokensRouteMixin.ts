import { Component, Vue } from 'vue-property-decorator';
import { WALLET_TYPES, api } from '@soramitsu/soraneo-wallet-web';
import { XSTUSD, XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset, Asset, Whitelist } from '@sora-substrate/util/build/assets/types';

import { getter } from '@/store/decorators';
import { PageNames } from '@/consts';

const MAX_SYMBOL_LENGTH = 7;

@Component
export default class SelectedTokenRouteMixin extends Vue {
  @getter.wallet.account.whitelist private whitelist!: Whitelist;
  @getter.wallet.account.whitelistIdsBySymbol private whitelistIdsBySymbol!: WALLET_TYPES.WhitelistIdsBySymbol;

  /** First token address from route object */
  get firstRouteAddress(): string {
    const first = this.$route.params.first;
    if (!first || first.length > MAX_SYMBOL_LENGTH) {
      return first;
    }
    return this.whitelistIdsBySymbol[first.toUpperCase()] ?? '';
  }

  /** Second token address from route object */
  get secondRouteAddress(): string {
    const second = this.$route.params.second;
    if (!second || second.length > MAX_SYMBOL_LENGTH) {
      return second;
    }
    return this.whitelistIdsBySymbol[second.toUpperCase()] ?? '';
  }

  /**
   * Checks the correctness of parameters.
   *
   * Some of cases:
   * (a) `true` - without params;
   * (b) `false` - when assets are equal;
   * (c) SWAP: `true` when both parameters are parsed as asset ids;
   * (d) ADD/REMOVE LIQUIDITY: `true` when both parameters are parsed as asset ids and first is from baseAssetIds;
   */
  get isValidRoute(): boolean {
    const { first, second } = this.$route.params;
    const firstAddress = this.firstRouteAddress;
    const secondAddress = this.secondRouteAddress;
    // VALID: without params
    if (!(first || second)) return true;
    // INVALID: assets are equal
    if (first === second || firstAddress === secondAddress) return false;

    const bothArePresented = !!(firstAddress && secondAddress);
    switch (this.$route.name) {
      case PageNames.RemoveLiquidity:
      case PageNames.AddLiquidity:
        return bothArePresented && api.dex.baseAssetsIds.includes(firstAddress);
      default:
        return bothArePresented;
    }
  }

  /** Sould be used in Add liquidity & Swap during mount */
  parseCurrentRoute(): void {
    if (!this.isValidRoute) {
      this.$router.replace({ name: this.$route.name as string, params: undefined });
    }
    if (
      this.$route.name === PageNames.AddLiquidity &&
      this.firstRouteAddress === XSTUSD.address &&
      this.secondRouteAddress === XOR.address
    ) {
      // Invert route for Add liquidity XSTUSD-XOR pair
      const first = XOR.symbol;
      const second = XSTUSD.symbol;
      // Do nothing when routes are the same
      if (this.$route.params.first === first && this.$route.params.second === second) return;
      this.$router.replace({ name: this.$route.name as string, params: { first, second } });
    }
  }

  updateRouteAfterSelectTokens(
    firstParam?: Nullable<AccountAsset | Asset>,
    secondParam?: Nullable<AccountAsset | Asset>
  ): void {
    if (!(firstParam && secondParam)) return; // Do nothing when any of token is null

    const first = this.whitelist[firstParam.address] ? firstParam.symbol : firstParam.address;
    const second = this.whitelist[secondParam.address] ? secondParam.symbol : secondParam.address;
    // Do nothing when routes are the same
    if (this.$route.params.first === first && this.$route.params.second === second) return;
    this.$router.replace({ name: this.$route.name as string, params: { first, second } });
  }
}
