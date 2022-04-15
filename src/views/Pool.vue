<template>
  <div v-loading="parentLoading" class="container el-form--pool">
    <generic-page-header class="page-header--pool" :title="t('exchange.Pool')" :tooltip="t('pool.description')" />
    <div v-loading="parentLoading" class="pool-wrapper">
      <p v-if="!isLoggedIn" class="pool-info-container pool-info-container--empty">
        {{ t('pool.connectToWallet') }}
      </p>
      <p v-else-if="!accountLiquidity.length || parentLoading" class="pool-info-container pool-info-container--empty">
        {{ t('pool.liquidityNotFound') }}
      </p>
      <s-collapse v-else class="pool-list" :borders="true">
        <s-collapse-item
          v-for="liquidityItem of accountLiquidity"
          :key="liquidityItem.address"
          :name="liquidityItem.address"
          class="pool-info-container"
        >
          <template #title>
            <pair-token-logo
              :first-token="getAsset(liquidityItem.firstAddress)"
              :second-token="getAsset(liquidityItem.secondAddress)"
              size="small"
            />
            <h3 class="pool-info-container__title">
              {{
                getPairTitle(getAssetSymbol(liquidityItem.firstAddress), getAssetSymbol(liquidityItem.secondAddress))
              }}
            </h3>
          </template>
          <info-line
            is-formatted
            value-can-be-hidden
            :label="t('pool.pooledToken', { tokenSymbol: getAssetSymbol(liquidityItem.firstAddress) })"
            :value="getFirstBalance(liquidityItem)"
            :fiat-value="getFiatAmountByCodecString(liquidityItem.firstBalance, getAsset(liquidityItem.firstAddress))"
          />
          <info-line
            is-formatted
            value-can-be-hidden
            :label="t('pool.pooledToken', { tokenSymbol: getAssetSymbol(liquidityItem.secondAddress) })"
            :value="getSecondBalance(liquidityItem)"
            :fiat-value="getFiatAmountByCodecString(liquidityItem.secondBalance, getAsset(liquidityItem.secondAddress))"
          />
          <info-line value-can-be-hidden :label="t('pool.poolShare')" :value="getPoolShare(liquidityItem.poolShare)" />
          <info-line
            v-if="hasStrategicBonusApy(liquidityItem.secondAddress)"
            :label="t('pool.strategicBonusApy')"
            :value="getStrategicBonusApy(liquidityItem.secondAddress)"
          />
          <div class="pool-info--buttons">
            <s-button
              type="secondary"
              class="s-typography-button--medium"
              @click="handleAddLiquidity(liquidityItem.firstAddress, liquidityItem.secondAddress)"
            >
              {{ t('pool.addLiquidity') }}
            </s-button>
            <s-button
              type="secondary"
              class="s-typography-button--medium"
              @click="handleRemoveLiquidity(liquidityItem.firstAddress, liquidityItem.secondAddress)"
            >
              {{ t('pool.removeLiquidity') }}
            </s-button>
          </div>
        </s-collapse-item>
      </s-collapse>
    </div>
    <template v-if="isLoggedIn">
      <s-button
        class="el-button--add-liquidity s-typography-button--large"
        type="primary"
        @click="handleAddLiquidity()"
      >
        {{ t('pool.addLiquidity') }}
      </s-button>
      <s-button class="el-button--create-pair s-typography-button--large" type="secondary" @click="handleCreatePair">
        {{ t('pool.createPair') }}
      </s-button>
    </template>
    <s-button v-else type="primary" class="s-typography-button--large" @click="handleConnectWallet">
      {{ t('pool.connectWallet') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { getter, state } from '@/store/decorators';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class Pool extends Mixins(mixins.FormattedAmountMixin, mixins.LoadingMixin, TranslationMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  @state.wallet.account.assets private assets!: Array<Asset>;
  @state.pool.accountLiquidity accountLiquidity!: Array<AccountLiquidity>;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  getAsset(address: string): Asset {
    return this.assets.find((a) => a.address === address) as Asset;
  }

  getAssetSymbol(address: string): string {
    const asset = this.assets.find((a) => a.address === address);
    return asset ? asset.symbol : this.t('pool.unknownAsset');
  }

  handleAddLiquidity(first?: string, second?: string): void {
    if (!(first || second)) {
      router.push({ name: PageNames.AddLiquidity });
      return;
    }
    const firstAddress = first || '';
    const secondAddress = second || '';
    router.push({ name: PageNames.AddLiquidity, params: { firstAddress, secondAddress } });
  }

  handleCreatePair(): void {
    router.push({ name: PageNames.CreatePair });
  }

  handleRemoveLiquidity(firstAddress: string, secondAddress: string): void {
    router.push({ name: PageNames.RemoveLiquidity, params: { firstAddress, secondAddress } });
  }

  handleConnectWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  getPairTitle(firstTokenSymbol?: string, secondTokenSymbol?: string): string {
    if (firstTokenSymbol && secondTokenSymbol) {
      return `${firstTokenSymbol}-${secondTokenSymbol}`;
    }
    return '';
  }

  getFirstBalance(liquidityItem: AccountLiquidity): string {
    return this.formatCodecNumber(liquidityItem.firstBalance, liquidityItem.decimals);
  }

  getSecondBalance(liquidityItem: AccountLiquidity): string {
    return this.formatCodecNumber(liquidityItem.secondBalance, liquidityItem.decimals);
  }

  getBalance(liquidityItem: AccountLiquidity): string {
    return this.formatCodecNumber(liquidityItem.balance, liquidityItem.decimals);
  }

  getPoolShare(poolShare: string): string {
    return `${this.formatStringValue(poolShare)}%`;
  }

  hasStrategicBonusApy(targetAssetAddress: string): boolean {
    return !!this.fiatPriceAndApyObject[targetAssetAddress]?.strategicBonusApy;
  }

  getStrategicBonusApy(targetAssetAddress: string): string {
    const apy = this.fiatPriceAndApyObject[targetAssetAddress]?.strategicBonusApy;
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
    .pair-logo {
      margin-right: $inner-spacing-medium;
    }
  }
}
</style>

<style lang="scss" scoped>
$pair-icon-height: 36px;

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
    h3 {
      letter-spacing: var(--s-letter-spacing-small);
    }
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
        letter-spacing: var(--s-letter-spacing-small);
        text-align: center;
      }

      &__title {
        font-weight: 700;
      }

      & + .el-button {
        margin-top: $inner-spacing-medium;
      }
    }
    & > .token-logo {
      margin-right: $inner-spacing-mini;
    }
    &--buttons {
      display: flex;
      justify-content: center;
      margin-top: $inner-spacing-medium;
      > * {
        width: 50%;
      }
      .el-button + .el-button {
        margin-left: $inner-spacing-small;
      }
    }
  }
}
</style>
