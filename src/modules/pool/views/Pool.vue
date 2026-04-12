<template>
  <div v-loading="parentLoading" class="container el-form--pool">
    <generic-page-header
      class="page-header--pool"
      :title="t('exchange.Pool')"
      :tooltip="t('pool.description')"
    ></generic-page-header>
    <div class="pool-wrapper" data-test-name="Pools">
      <p v-if="!isLoggedIn || !hasAccountLiquidities" class="pool-info-container pool-info-container--empty">
        {{ !isLoggedIn ? t('pool.connectToWallet') : t('pool.liquidityNotFound') }}
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
            ></pair-token-logo>
            <div class="pool-info-container-block">
              <h3 class="pool-info-container__title">
                {{ liquidityItem.title }}
              </h3>
              <slot name="title-append" v-bind="{ liquidity: liquidityItem, activeCollapseItems }"></slot>
            </div>
          </template>

          <pool-info>
            <info-line
              is-formatted
              value-can-be-hidden
              :label="t('pool.pooledToken', { tokenSymbol: liquidityItem.firstAssetSymbol })"
              :value="liquidityItem.firstBalanceFormatted"
              :fiat-value="liquidityItem.firstBalanceFiat"
            ></info-line>
            <info-line
              is-formatted
              value-can-be-hidden
              :label="t('pool.pooledToken', { tokenSymbol: liquidityItem.secondAssetSymbol })"
              :value="liquidityItem.secondBalanceFormatted"
              :fiat-value="liquidityItem.secondBalanceFiat"
            ></info-line>
            <info-line
              value-can-be-hidden
              :label="t('pool.poolShare')"
              :value="liquidityItem.poolShareFormatted"
            ></info-line>
            <info-line
              v-if="liquidityItem.apyFormatted"
              :label="t('pool.strategicBonusApy')"
              :value="liquidityItem.apyFormatted"
            ></info-line>

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

          <slot name="append" v-bind="{ liquidity: liquidityItem, activeCollapseItems }"></slot>
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
    <s-button v-else class="s-typography-button--large" type="primary" @click="connectSoraWallet()">
      {{ t('connectWalletText') }}
    </s-button>

    <add-liquidity-dialog v-model:visible="addLiquidityVisibility"></add-liquidity-dialog>
    <remove-liquidity-dialog v-model:visible="removeLiquidityVisibility"></remove-liquidity-dialog>
  </div>
</template>

<script lang="ts" setup>
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@/shims/wallet-components';
import { computed, ref } from 'vue';

import { Components } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { FontSizeRate, FontWeightRate } from '@/shims/wallet-consts';
import { PoolComponents } from '@/modules/pool/consts';
import { usePoolApy } from '@/modules/pool/composables/usePoolApy';
import { poolLazyComponent } from '@/modules/pool/router';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { usePoolStore } from '@/stores/pool';
import type { LiquidityParams } from '@/stores/pool/types';
import { sortPools } from '@/utils';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

type LiquidityItem = AccountLiquidity & {
  firstAsset: AccountAsset;
  firstAssetSymbol?: string;
  firstBalanceFormatted?: string;
  firstBalanceFiat?: Nullable<string>;
  secondAsset: AccountAsset;
  secondAssetSymbol?: string;
  secondBalanceFormatted?: string;
  secondBalanceFiat?: Nullable<string>;
  poolShareFormatted?: string;
  apyFormatted?: string;
  title?: string;
};

defineOptions({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PoolInfo: lazyComponent(Components.PoolInfo),
    AddLiquidityDialog: poolLazyComponent(PoolComponents.AddLiquidityDialog),
    RemoveLiquidityDialog: poolLazyComponent(PoolComponents.RemoveLiquidityDialog),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
});

const { t } = useTranslation();
const { loading } = useLoading();
const parentLoading = loading;
const { connectSoraWallet, isLoggedIn } = useInternalConnect();
const { formatCodecNumber, formatStringValue, getFiatAmountByCodecString } = useFormattedAmount();
const { getPoolApyFormatted } = usePoolApy();
const assetsStore = useAssetsStore();
const poolStore = usePoolStore();

const accountLiquidity = computed(() => poolStore.accountLiquidity as Array<AccountLiquidity>);
const getAsset = assetsStore.assetDataByAddress as (addr?: string) => Nullable<AccountAsset>;

const addLiquidityVisibility = ref(false);
const removeLiquidityVisibility = ref(false);
const activeCollapseItems = ref<string[]>([]);

const hasAccountLiquidities = computed(() => accountLiquidity.value.length > 0);

const getLiquidityAsset = (address: string, decimals: number): AccountAsset => {
  const asset = getAsset(address);

  if (asset) {
    return asset;
  }

  const unknownAssetText = t('unknownAssetText');

  return {
    address,
    symbol: unknownAssetText,
    name: unknownAssetText,
    decimals,
    balance: '0',
    isMintable: false,
  } as AccountAsset;
};

const accountLiquidityData = computed<LiquidityItem[]>(() => {
  const items = accountLiquidity.value.map((liquidity) => {
    const firstAsset = getLiquidityAsset(liquidity.firstAddress, liquidity.decimals);
    const secondAsset = getLiquidityAsset(liquidity.secondAddress, liquidity.decimals2 || liquidity.decimals);
    const firstAssetSymbol = getAssetSymbol(firstAsset);
    const secondAssetSymbol = getAssetSymbol(secondAsset);

    return {
      ...liquidity,
      firstAsset,
      firstAssetSymbol,
      firstBalanceFormatted: formatCodecNumber(liquidity.firstBalance, liquidity.decimals),
      firstBalanceFiat: firstAsset ? getFiatAmountByCodecString(liquidity.firstBalance, firstAsset) : null,
      secondAsset,
      secondAssetSymbol,
      secondBalanceFormatted: formatCodecNumber(liquidity.secondBalance, liquidity.decimals),
      secondBalanceFiat: secondAsset ? getFiatAmountByCodecString(liquidity.secondBalance, secondAsset) : null,
      poolShareFormatted: `${formatStringValue(liquidity.poolShare)}%`,
      apyFormatted: getPoolApyFormatted(liquidity.firstAddress, liquidity.secondAddress),
      title: getPairTitle(firstAssetSymbol, secondAssetSymbol),
    };
  });

  return items.sort((a, b) =>
    sortPools(
      { baseAsset: a.firstAsset, poolAsset: a.secondAsset },
      { baseAsset: b.firstAsset, poolAsset: b.secondAsset }
    )
  );
});

const handleAddLiquidity = (item?: LiquidityItem) => {
  const firstAddress = item?.firstAsset.address ?? '';
  const secondAddress = item?.secondAsset.address ?? '';

  void poolStore.setAddLiquidityDataFromLiquidity({ firstAddress, secondAddress } as LiquidityParams);

  addLiquidityVisibility.value = true;
};

const handleRemoveLiquidity = (item: LiquidityItem) => {
  const firstAddress = item.firstAsset.address;
  const secondAddress = item.secondAsset.address;

  poolStore.setRemoveLiquidityAddresses({ firstAddress, secondAddress } as LiquidityParams);
  removeLiquidityVisibility.value = true;
};

const updateActiveCollapseItems = (items: string[]) => {
  activeCollapseItems.value = items;
};

const getAssetSymbol = (asset: Nullable<AccountAsset>): string => asset?.symbol ?? t('unknownAssetText');

const getPairTitle = (firstTokenSymbol?: string, secondTokenSymbol?: string): string => {
  if (firstTokenSymbol && secondTokenSymbol) {
    return `${firstTokenSymbol}-${secondTokenSymbol}`;
  }
  return '';
};
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

@include mobile(true) {
  .pool-info-buttons {
    button {
      font-size: var(--s-font-size-mini);
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

  .el-button--create-pair {
    margin-left: 0;
    margin-top: $inner-spacing-mini;
    width: 100%;
  }

  .s-primary {
    margin-top: $inner-spacing-medium;
    width: 100%;
  }
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
        background: var(--s-color-utility-surface);
        border-radius: var(--s-border-radius-small);
        box-shadow: var(--s-shadow-dialog);
        color: var(--s-color-base-content-secondary);
        font-size: var(--s-font-size-small);
        font-weight: 600;
        line-height: var(--s-line-height-medium);
        padding: 20px 24px;
        text-align: center;
        text-transform: uppercase;
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
