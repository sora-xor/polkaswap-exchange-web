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
          v-if="formatBalance(token) !== FormattedZeroSymbol"
          @click.stop="togglePinnedAsset(token)"
          class="pin-button"
          :title="isAssetPinned(token) ? t('addAsset.unpinAsset') : t('addAsset.pinAsset')"
        >
          <pin-icon :is-pinned="isAssetPinned(token)"></pin-icon>
        </button>

        <formatted-amount-with-fiat-value
          v-if="formatBalance(token) !== FormattedZeroSymbol"
          value-class="asset__balance"
          value-can-be-hidden
          :value="formatBalance(token)"
          :font-size-rate="FontSizeRate.MEDIUM"
          :has-fiat-value="shouldFiatBeShown(token)"
          :fiat-value="getFiatBalance(token)"
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
import { toRef } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useAssetFormatting } from '@/composables/useAssetFormatting';
import { FontSizeRate, FontWeightRate } from '@/lib/soraneo-wallet/src/consts';
import { useWalletStore } from '@/stores/wallet';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
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
    assets?: AccountAsset[];
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

const isAssetPinned = (asset: AccountAsset): boolean => {
  return walletStore.isAssetPinned(asset);
};

const togglePinnedAsset = (asset: AccountAsset): void => {
  if (isAssetPinned(asset)) {
    walletStore.removePinnedAsset(asset);
  } else {
    walletStore.setPinnedAsset(asset);
  }
};

const formatBalance = (asset: AccountAsset): string => {
  return formatAssetBalance(asset, {
    internal: props.isSoraToEvm,
    showZeroBalance: true,
    formattedZero: FormattedZeroSymbol,
  });
};

const shouldFiatBeShown = (asset: AccountAsset): boolean => {
  return Boolean(props.isSoraToEvm && getAssetFiatPrice(asset));
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
