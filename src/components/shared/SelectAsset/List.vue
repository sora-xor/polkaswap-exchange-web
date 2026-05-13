<template>
  <asset-list
    :assets="assets"
    v-bind="$attrs"
    :selectable="false"
    class="asset-select-list"
    data-test-name="selectToken"
  >
    <template #list-empty>
      <div class="asset-select-list__empty">
        <span class="empty-results-icon"></span>
        {{ t('selectToken.emptyListMessage') }}
      </div>
    </template>

    <template #default="token">
      <div v-if="connected" class="asset__balance-container">
        <button
          v-if="hasFormattedBalance(token)"
          @click.stop="togglePinnedAsset(token)"
          class="pin-button"
          :title="isAssetPinned(token) ? t('addAsset.unpinAsset') : t('addAsset.pinAsset')"
        >
          <pin-icon :is-pinned="isAssetPinned(token)"></pin-icon>
        </button>

        <formatted-amount-with-fiat-value
          v-if="hasFormattedBalance(token)"
          value-class="asset__balance"
          value-can-be-hidden
          :value="getFormattedBalance(token)"
          :font-size-rate="FontSizeRate.MEDIUM"
          :has-fiat-value="shouldFiatBeShown(token)"
          :fiat-value="getFormattedFiatBalance(token)"
          :fiat-font-size-rate="FontSizeRate.MEDIUM"
          :fiat-font-weight-rate="FontWeightRate.MEDIUM"
        ></formatted-amount-with-fiat-value>

        <span v-else class="asset__balance">
          <button
            @click.stop="togglePinnedAsset(token)"
            class="pin-button"
            :title="isAssetPinned(token) ? t('addAsset.unpinAsset') : t('addAsset.pinAsset')"
          >
            <pin-icon :is-pinned="isAssetPinned(token)"></pin-icon>
          </button>
        </span>
      </div>
      <slot name="action" v-bind="token"></slot>
    </template>
  </asset-list>
</template>

<script lang="ts" setup>
import { toRef, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useAssetFormatting } from '@/composables/useAssetFormatting';
import { FontSizeRate, FontWeightRate } from '@/lib/soraneo-wallet/src/consts';
import { useWalletStore } from '@/stores/wallet';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';
import WalletComponentAssetList from '@/lib/soraneo-wallet/src/components/AssetList.vue';
import WalletComponentPinIcon from '@/lib/soraneo-wallet/src/components/PinIcon.vue';
import WalletComponentFormattedAmountWithFiatValue from '@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue';

defineOptions({
  name: 'SelectAssetList',
  components: {
    AssetList: WalletComponentAssetList,
    PinIcon: WalletComponentPinIcon,
    FormattedAmountWithFiatValue: WalletComponentFormattedAmountWithFiatValue,
  },
});

const props = withDefaults(
  defineProps<{
    assets?: Asset[];
    connected?: boolean;
    shouldBalanceBeHidden?: boolean;
    isSoraToEvm?: boolean;
  }>(),
  {
    assets: () => [],
    connected: false,
    shouldBalanceBeHidden: false,
    isSoraToEvm: true,
  }
);

const assets = toRef(props, 'assets');
const connected = toRef(props, 'connected');

const { t } = useTranslation();
const { formatAssetBalance, getFiatBalance, getAssetFiatPrice } = useAssetFormatting();
const walletStore = useWalletStore();

const FormattedZeroSymbol = '-';
type AssetDisplay = {
  balance: string;
  fiatBalance: Nullable<string>;
  hasBalance: boolean;
  hasFiatValue: boolean;
};
type AssetDisplayCacheEntry = {
  key: string;
  display: AssetDisplay;
};
type AssetDisplayFields = Asset &
  Partial<AccountAsset> & {
    externalBalance?: string | null;
    externalDecimals?: number | null;
  };

const assetDisplayCache = new Map<string, AssetDisplayCacheEntry>();

watch(assets, () => assetDisplayCache.clear());

const isAssetPinned = (asset: Asset): boolean => {
  return walletStore.isAssetPinned(asset);
};

const togglePinnedAsset = (asset: Asset): void => {
  if (isAssetPinned(asset)) {
    walletStore.removePinnedAsset(asset);
  } else {
    walletStore.setPinnedAsset(asset);
  }
};

/** Builds a stable cache key from the fields that affect row amount display. */
const getAssetDisplayCacheKey = (asset: Asset): string => {
  const displayAsset = asset as AssetDisplayFields;
  const balanceFingerprint = props.isSoraToEvm
    ? `${displayAsset.balance?.transferable ?? ''}:${asset.decimals ?? ''}`
    : `${displayAsset.externalBalance ?? ''}:${displayAsset.externalDecimals ?? ''}`;

  return [
    asset.address,
    props.isSoraToEvm ? 'internal' : 'external',
    balanceFingerprint,
    getAssetFiatPrice(asset) ?? '',
  ].join('|');
};

/** Formats row balance and fiat values once per asset display state. */
const getAssetDisplay = (asset: Asset): AssetDisplay => {
  const key = getAssetDisplayCacheKey(asset);
  const cached = assetDisplayCache.get(asset.address);

  if (cached?.key === key) {
    return cached.display;
  }

  const balance = formatAssetBalance(asset, {
    internal: props.isSoraToEvm,
    showZeroBalance: true,
    formattedZero: FormattedZeroSymbol,
  });
  const hasFiatValue = Boolean(props.isSoraToEvm && getAssetFiatPrice(asset));
  const display: AssetDisplay = {
    balance,
    fiatBalance: hasFiatValue ? getFiatBalance(asset as AccountAsset) : null,
    hasBalance: balance !== FormattedZeroSymbol,
    hasFiatValue,
  };

  assetDisplayCache.set(asset.address, { key, display });

  return display;
};

const hasFormattedBalance = (asset: Asset): boolean => getAssetDisplay(asset).hasBalance;
const getFormattedBalance = (asset: Asset): string => getAssetDisplay(asset).balance;
const getFormattedFiatBalance = (asset: Asset): Nullable<string> => getAssetDisplay(asset).fiatBalance;
const shouldFiatBeShown = (asset: Asset): boolean => {
  return getAssetDisplay(asset).hasFiatValue;
};
</script>

<style lang="scss">
.asset-select-list {
  .asset {
    cursor: pointer;
    padding: 0 $inner-spacing-big;
    transition: var(--s-transition-default);

    @include focus-outline($withOffset: true);

    &:hover {
      background-color: var(--s-color-base-background-hover);
    }

    &__balance {
      line-height: var(--s-line-height-small);
      font-weight: 800;
    }

    &__balance-container {
      text-align: right;

      .formatted-amount__container {
        flex-direction: column;
        align-items: flex-end;
      }
    }
    .formatted-amount {
      display: block;
      width: 100%;
      &__integer {
        font-size: var(--s-font-size-big);
        font-weight: 800;
      }
      &__decimal {
        font-weight: 600;
      }
      &.formatted-amount--fiat-value {
        line-height: var(--s-line-height-reset);
        word-break: break-all;
        .formatted-amount__integer {
          font-size: var(--s-font-size-small);
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.asset-select-list {
  &__empty {
    display: flex;
    align-items: center;
    flex-direction: column;
    color: var(--s-color-base-content-tertiary);
    line-height: var(--s-line-height-big);
  }
  .empty-results-icon {
    margin-bottom: $inner-spacing-medium;
    display: block;
    height: 70px;
    width: 70px;
    background: url('@/assets/img/no-results.svg') center no-repeat;
  }
}
.pin-button {
  background-color: unset;
  border: unset;
  &:hover {
    cursor: pointer;
  }
  svg {
    width: 16px;
    height: 16px;
  }
}
</style>
