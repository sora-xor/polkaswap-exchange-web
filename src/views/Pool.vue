<template>
  <div v-loading="parentLoading" class="container el-form--pool">
    <generic-page-header class="page-header--pool" :title="t('exchange.Pool')" :tooltip="t('pool.description')" />
    <div v-loading="parentLoading" class="pool-wrapper" data-test-name="Pools">
      <p v-if="!isLoggedIn" key="not-logged" class="pool-info-container pool-info-container--empty">
        {{ t('pool.connectToWallet') }}
      </p>
      <p
        v-else-if="!accountLiquidity.length || parentLoading"
        key="pools-empty"
        class="pool-info-container pool-info-container--empty"
      >
        {{ t('pool.liquidityNotFound') }}
      </p>
      <s-collapse v-else key="has-pools" class="pool-list" :borders="true" @change="updateActiveCollapseItems">
        <s-collapse-item
          v-for="liquidityItem of accountLiquidityData"
          :key="liquidityItem.address"
          :name="liquidityItem.address"
          class="pool-info-container"
        >
          <template #title>
            <pair-token-logo
              :first-token="liquidityItem.firstAsset"
              :second-token="liquidityItem.secondAsset"
              size="small"
            />
            <div class="pool-info-container-block">
              <h3 class="pool-info-container__title">
                {{ liquidityItem.title }}
              </h3>
              <slot name="title-append" v-bind="{ liquidity: liquidityItem, activeCollapseItems }" />
            </div>
          </template>

          <pool-info>
            <info-line
              is-formatted
              value-can-be-hidden
              :label="t('pool.pooledToken', { tokenSymbol: liquidityItem.firstAssetSymbol })"
              :value="liquidityItem.firstBalanceFormatted"
              :fiat-value="liquidityItem.firstBalanceFiat"
            />
            <info-line
              is-formatted
              value-can-be-hidden
              :label="t('pool.pooledToken', { tokenSymbol: liquidityItem.secondAssetSymbol })"
              :value="liquidityItem.secondBalanceFormatted"
              :fiat-value="liquidityItem.secondBalanceFiat"
            />
            <info-line value-can-be-hidden :label="t('pool.poolShare')" :value="liquidityItem.poolShareFormatted" />
            <info-line
              v-if="liquidityItem.apyFormatted"
              :label="t('pool.strategicBonusApy')"
              :value="liquidityItem.apyFormatted"
            />

            <template #buttons>
              <s-button
                type="secondary"
                class="s-typography-button--medium"
                data-test-name="addLiquidity"
                @click="handleAddLiquidity(liquidityItem)"
              >
                {{ t('pool.addLiquidity') }}
              </s-button>
              <s-button
                type="secondary"
                class="s-typography-button--medium"
                data-test-name="removeLiquidity"
                @click="handleRemoveLiquidity(liquidityItem)"
              >
                {{ t('pool.removeLiquidity') }}
              </s-button>
            </template>
          </pool-info>

          <slot name="append" v-bind="{ liquidity: liquidityItem, activeCollapseItems }" />
        </s-collapse-item>
      </s-collapse>
    </div>
    <s-button
      v-if="isLoggedIn"
      class="el-button--add-liquidity s-typography-button--large"
      data-test-name="addLiquidity"
      type="primary"
      @click="handleAddLiquidity()"
    >
      {{ t('pool.addLiquidity') }}
    </s-button>
    <s-button v-else type="primary" class="s-typography-button--large" @click="handleConnectWallet">
      {{ t('pool.connectWallet') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import PoolApyMixin from '@/components/mixins/PoolApyMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { getter, state } from '@/store/decorators';

type LiquidityItem = AccountLiquidity & {
  firstAsset?: Nullable<AccountAsset>;
  firstAssetSymbol?: string;
  firstBalanceFormatted?: string;
  firstBalanceFiat?: Nullable<string>;
  secondAsset?: Nullable<AccountAsset>;
  secondAssetSymbol?: string;
  secondBalanceFormatted?: string;
  secondBalanceFiat?: Nullable<string>;
  poolShareFormatted?: string;
  apyFormatted?: string;
  title?: string;
};

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PoolInfo: lazyComponent(Components.PoolInfo),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class Pool extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.LoadingMixin,
  TranslationMixin,
  PoolApyMixin
) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  @state.pool.accountLiquidity accountLiquidity!: Array<AccountLiquidity>;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;
  @getter.wallet.account.whitelistIdsBySymbol private whitelistIdsBySymbol!: WALLET_TYPES.WhitelistIdsBySymbol;

  activeCollapseItems: string[] = [];

  get accountLiquidityData() {
    return this.accountLiquidity.map((liquidity) => {
      const firstAsset = this.getAsset(liquidity.firstAddress);
      const firstAssetSymbol = this.getAssetSymbol(firstAsset);
      const secondAsset = this.getAsset(liquidity.secondAddress);
      const secondAssetSymbol = this.getAssetSymbol(secondAsset);

      return {
        ...liquidity,
        firstAsset,
        firstAssetSymbol,
        firstBalanceFormatted: this.formatCodecNumber(liquidity.firstBalance, liquidity.decimals),
        firstBalanceFiat: firstAsset ? this.getFiatAmountByCodecString(liquidity.firstBalance, firstAsset) : '0',
        secondAsset,
        secondAssetSymbol,
        secondBalanceFormatted: this.formatCodecNumber(liquidity.secondBalance, liquidity.decimals),
        secondBalanceFiat: secondAsset ? this.getFiatAmountByCodecString(liquidity.secondBalance, secondAsset) : '0',
        poolShareFormatted: `${this.formatStringValue(liquidity.poolShare)}%`,
        apyFormatted: this.getStrategicBonusApy(liquidity.firstAddress, liquidity.secondAddress),
        title: this.getPairTitle(firstAssetSymbol, secondAssetSymbol),
      };
    });
  }

  updateActiveCollapseItems(items: string[]) {
    this.activeCollapseItems = items;
  }

  private getRouteParams(item: LiquidityItem): { first: string; second: string } {
    const firstSymbol = item.firstAssetSymbol ?? '';
    const secondSymbol = item.secondAssetSymbol ?? '';
    // If symbol is whitelisted -> symbol, else -> address
    const first = this.whitelistIdsBySymbol[firstSymbol] ? firstSymbol : item.firstAddress;
    const second = this.whitelistIdsBySymbol[secondSymbol] ? secondSymbol : item.secondAddress;
    return { first, second };
  }

  handleAddLiquidity(item?: LiquidityItem): void {
    if (!item) {
      router.push({ name: PageNames.AddLiquidity });
      return;
    }
    router.push({ name: PageNames.AddLiquidity, params: this.getRouteParams(item) });
  }

  handleRemoveLiquidity(item: LiquidityItem): void {
    router.push({ name: PageNames.RemoveLiquidity, params: this.getRouteParams(item) });
  }

  handleConnectWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  private getAssetSymbol(asset: Nullable<AccountAsset>): string {
    return asset?.symbol ?? this.t('pool.unknownAsset');
  }

  private getPairTitle(firstTokenSymbol?: string, secondTokenSymbol?: string): string {
    if (firstTokenSymbol && secondTokenSymbol) {
      return `${firstTokenSymbol}-${secondTokenSymbol}`;
    }
    return '';
  }

  private getStrategicBonusApy(firstAddress: string, secondAddress: string): string {
    const apy = this.getPoolApy(firstAddress, secondAddress);
    if (!apy) {
      return '';
    }
    return `${this.getFPNumberFromCodec(apy).mul(this.Hundred).toLocaleString()}%`;
  }
}
</script>

<style lang="scss">
.pool-list {
  @include collapse-items;
  .el-collapse-item__header {
    align-items: flex-start;

    .pair-logo {
      margin-right: $inner-spacing-medium;
      margin-top: $inner-spacing-tiny;
    }
  }
}
</style>

<style lang="scss" scoped>
$title-height: 42px;

.el-form--pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  .page-header--pool {
    .el-button--settings {
      margin-left: auto;
    }
  }
  .el-button {
    &--create-pair {
      margin-left: 0;
    }
  }
  @include full-width-button;
  @include full-width-button('el-button--create-pair', $inner-spacing-mini);
}

.pool {
  &-wrapper {
    width: 100%;
  }
  &-list {
    width: 100%;
    border-top: none;
    border-bottom: none;
  }
  &-info {
    &-container {
      &--empty {
        color: var(--s-color-base-content-secondary);
        padding: $basic-spacing-medium $inner-spacing-big;
        background: var(--s-color-utility-surface);
        border-radius: var(--s-border-radius-small);
        box-shadow: var(--s-shadow-dialog);
        font-size: var(--s-font-size-small);
        line-height: var(--s-line-height-medium);
        font-weight: 600;
        text-transform: uppercase;
        text-align: center;
      }

      &-block {
        flex: 1;
      }

      &__title {
        flex: 1;
        font-weight: 700;
        text-align: left;
        min-height: $title-height;
        line-height: $title-height;
      }

      & + .el-button {
        margin-top: $inner-spacing-medium;
      }
    }
    & > .asset-logo {
      margin-right: $inner-spacing-mini;
    }
  }
}
</style>
