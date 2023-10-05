import { XSTUSD, XOR, XST } from '@sora-substrate/util/build/assets/consts';
import { WALLET_TYPES, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Vue } from 'vue-property-decorator';

import { PageNames } from '@/consts';
import { getter } from '@/store/decorators';
import { syntheticAssetRegexp } from '@/utils/regexp';

import type { AccountAsset, Asset, Whitelist } from '@sora-substrate/util/build/assets/types';
import type { NavigationGuardNext, Route } from 'vue-router';

const MAX_SYMBOL_LENGTH = 7;

@Component
export default class SelectedTokenRouteMixin extends Vue {
  @getter.wallet.account.whitelist private whitelist!: Whitelist;
  @getter.wallet.account.whitelistIdsBySymbol private whitelistIdsBySymbol!: WALLET_TYPES.WhitelistIdsBySymbol;
  @getter.assets.assetsDataTable private assetsDataTable!: Record<string, Asset>;

  private wasRedirected = false;

  private getRouteAddress(param: string): string {
    if (!param) {
      return param;
    }
    if (param.length > MAX_SYMBOL_LENGTH) {
      return this.assetsDataTable[param] ? param : '';
    }
    return this.whitelistIdsBySymbol[param.toUpperCase()] ?? '';
  }

  private getIsValidRoute(first: string, second: string, firstAddress: string, secondAddress: string): boolean {
    // VALID: without params
    if (!(first || second)) return true;
    // INVALID: assets are equal
    if (first === second || firstAddress === secondAddress) return false;

    const bothArePresented = !!(firstAddress && secondAddress);
    switch (this.$route.name) {
      case PageNames.RemoveLiquidity:
        return bothArePresented && api.dex.baseAssetsIds.includes(firstAddress);
      case PageNames.AddLiquidity: {
        if (!(bothArePresented && api.dex.baseAssetsIds.includes(firstAddress))) {
          return false;
        }
        if (firstAddress === XSTUSD.address && secondAddress === XOR.address) {
          return false; // XSTUSD-XOR isn't allowed
        }
        return true;
      }
      default:
        return bothArePresented;
    }
  }

  /* virtual */
  async setData(params: { firstAddress: string; secondAddress: string }) {
    console.warn('[SelectedTokensRouteMixin]: setData was not set');
  }

  /** First token address from route object */
  get firstRouteAddress(): string {
    return this.getRouteAddress(this.$route.params.first);
  }

  /** Second token address from route object */
  get secondRouteAddress(): string {
    return this.getRouteAddress(this.$route.params.second);
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
    return this.getIsValidRoute(first, second, firstAddress, secondAddress);
  }

  /**
   * Sould be used in Add liquidity & Swap during mount
   *
   * Returns is valid state for routing life cycle
   */
  parseCurrentRoute(params?: { isValidRoute: boolean; name: string }): boolean {
    const isValidRoute = params ? params.isValidRoute : this.isValidRoute;
    const name = params ? params.name : (this.$route.name as string);

    if (!isValidRoute) {
      this.wasRedirected = true;
      if (name === PageNames.RemoveLiquidity) {
        this.$router.push({ name: PageNames.Pool });
      } else if (this.$route.params) {
        this.$router.replace({ name, params: undefined });
      }
      return false;
    } else {
      return true;
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
    this.wasRedirected = true;
    this.$router.replace({ name: this.$route.name as string, params: { first, second } });
  }

  beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<Vue>) {
    if (this.wasRedirected) {
      this.wasRedirected = false; // Do nothing because it was done programmatically
    } else {
      const first = to.params.first;
      const second = to.params.second;
      const firstAddress = this.getRouteAddress(first);
      const secondAddress = this.getRouteAddress(second);
      const isValidRoute = this.getIsValidRoute(first, second, firstAddress, secondAddress);

      const isValidState = this.parseCurrentRoute({
        isValidRoute,
        name: to.name as string,
      });

      if (!isValidState) return; // Because of another redirection

      this.setData({ firstAddress, secondAddress });
    }
    next();
  }
}
