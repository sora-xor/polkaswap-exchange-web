<template>
  <sora-wallet
    v-loading="parentLoading"
    class="container container--wallet"
    @close="handleClose"
    @swap="handleSwap"
    @liquidity="handleLiquidity"
    @bridge="handleBridge"
  />
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api, WALLET_CONSTS, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames } from '@/consts';
import router from '@/router';
import { action, getter, mutation } from '@/store/decorators';

import type { AccountAsset, Whitelist } from '@sora-substrate/sdk/build/assets/types';
import type { NavigationGuardNext, Route } from 'vue-router';

@Component
export default class Wallet extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @getter.wallet.account.isLoggedIn private isLoggedIn!: boolean;
  @getter.wallet.account.whitelist private whitelist!: Whitelist;
  @getter.wallet.account.whitelistIdsBySymbol private whitelistIdsBySymbol!: Record<string, string>;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => AccountAsset;

  @action.swap.setTokenFromAddress private setSwapFromAsset!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setSwapToAsset!: (address?: string) => Promise<void>;
  @action.addLiquidity.setFirstTokenAddress private setAddliquidityAssetA!: (address: string) => Promise<void>;
  @mutation.wallet.router.navigate private navigate!: (route: {
    name: WALLET_CONSTS.RouteNames;
    params?: Record<string, unknown>;
  }) => void;

  private tryNavigate(): void {
    this.withApi(() => {
      try {
        if (!this.isLoggedIn) return;
        const query = this.$route.query;
        const page = query.page;
        // /#/wallet?page=send&asset=kusd&to=any_address&amount=1000
        // where `asset` is required, `to` and `amount` are optional
        if (!page || page !== 'send') return;
        const to = query.to;
        const amount = query.amount;
        const assetId = this.whitelistIdsBySymbol[(query.asset as string).toUpperCase()];
        if (!assetId) return;
        const asset = this.getAsset(assetId);
        this.navigate({
          name: WALLET_CONSTS.RouteNames.WalletSend,
          params: { address: to, amount, asset },
        });
      } catch (error) {
        console.warn('[WALLET] Navigate issue:', error);
      }
    });
  }

  created(): void {
    this.tryNavigate();
  }

  beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext<Vue>): void {
    next();
    this.tryNavigate();
  }

  handleClose(): void {
    router.back();
  }

  async handleSwap(asset: AccountAsset): Promise<void> {
    await this.setSwapFromAsset(asset.address);
    await this.setSwapToAsset();
    router.push({ name: PageNames.Swap });
  }

  async handleLiquidity(asset: AccountAsset): Promise<void> {
    if (api.dex.baseAssetsIds.includes(asset.address)) {
      this.setAddliquidityAssetA(asset.address);
      router.push({ name: PageNames.AddLiquidity });
      return;
    }

    const assetAAddress = XOR.address;
    const assetBAddress = asset.address;

    const first = this.whitelist[assetAAddress]?.symbol ?? assetAAddress;
    const second = this.whitelist[assetBAddress]?.symbol ?? assetBAddress;
    const params = { first, second };

    router.push({ name: PageNames.AddLiquidity, params });
  }

  handleBridge(asset: AccountAsset): void {
    router.push({ name: PageNames.Bridge, params: { address: asset.address } });
  }
}
</script>

<style lang="scss">
.container--wallet {
  .history .history-items {
    padding: 0 $inner-spacing-mini;
  }
  .s-icon-basic-check-mark-24 {
    @include icon-styles;
  }

  @include large-mobile(true) {
    .account-credentials_description {
      .account-credentials_address {
        .first {
          width: 36px;
        }
      }
    }
  }
}
</style>
