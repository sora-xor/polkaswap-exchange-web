<template>
  <div v-loading="loading" :class="computedClasses">
    <wallet-assets-headline :assets-fiat-amount="assetsFiatAmount"></wallet-assets-headline>
    <s-scrollbar class="wallet-assets-scrollbar">
      <draggable
        v-if="assetList.length"
        v-model="assetList"
        class="wallet-assets__draggable"
        handle=".wallet-assets-dashes"
        item-key="address"
        :move="onMove"
      >
        <template #item="{ element: asset, index }">
          <div v-if="showAsset(asset)" class="wallet-assets-item s-flex">
            <div v-button class="wallet-assets-dashes"><div class="wallet-assets-three-dash"></div></div>
            <asset-list-item
              :asset="asset"
              :pinned="isAssetPinned(asset)"
              with-fiat
              with-clickable-logo
              @show-details="handleOpenAssetDetails"
              @pin="handlePin"
            >
              <template #value="slotAsset">
                <formatted-amount-with-fiat-value
                  value-can-be-hidden
                  value-class="asset-value"
                  :value="getBalance(slotAsset)"
                  :font-size-rate="FontSizeRate.SMALL"
                  :asset-symbol="slotAsset.symbol"
                  symbol-as-decimal
                  :fiat-value="getFiatBalance(slotAsset)"
                  :fiat-font-size-rate="FontSizeRate.MEDIUM"
                  :fiat-font-weight-rate="FontWeightRate.MEDIUM"
                >
                  <div v-if="hasLockedBalance(slotAsset)" class="asset-value-locked p4">
                    <s-icon name="lock-16" size="12px"></s-icon>
                    <span>{{ formatFrozenBalance(slotAsset) }}</span>
                  </div>
                </formatted-amount-with-fiat-value>
              </template>
              <template #default="slotAsset">
                <s-button
                  v-if="permissions.sendAssets && !isZeroBalance(slotAsset)"
                  class="wallet-assets__button send"
                  type="action"
                  size="small"
                  alternative
                  :tooltip="t('assets.send')"
                  @click="handleAssetSend(slotAsset)"
                >
                  <s-icon name="finance-send-24" size="24"></s-icon>
                </s-button>
                <s-button
                  v-if="permissions.swapAssets && slotAsset.decimals"
                  class="wallet-assets__button swap"
                  type="action"
                  size="small"
                  alternative
                  :tooltip="t('assets.swap')"
                  @click="handleAssetSwap(slotAsset)"
                >
                  <s-icon name="arrows-swap-24" size="24"></s-icon>
                </s-button>
                <s-button
                  v-if="permissions.showAssetDetails"
                  class="wallet-assets__button el-button--details"
                  type="action"
                  size="small"
                  alternative
                  :tooltip="t('assets.details')"
                  @click="handleOpenAssetDetails(slotAsset)"
                >
                  <s-icon name="arrows-chevron-right-rounded-24" size="24"></s-icon>
                </s-button>
              </template>
            </asset-list-item>
            <s-divider :key="`${index}-divider`" class="wallet-assets-divider"></s-divider>
          </div>
        </template>
        <template #footer>
          <div v-if="assetsAreHidden" class="wallet-assets--empty">{{ t('addAsset.empty') }}</div>
        </template>
      </draggable>
      <div v-else class="wallet-assets__draggable">
        <div v-if="assetsAreHidden" class="wallet-assets--empty">{{ t('addAsset.empty') }}</div>
      </div>
    </s-scrollbar>

    <s-button
      v-if="permissions.addAssets"
      class="wallet-assets-add s-typography-button--large"
      @click="handleOpenAddAsset"
    >
      {{ t('addAssetText') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { api, FPNumber } from '@sora-substrate/sdk';
import isEmpty from 'lodash/fp/isEmpty';
import { computed } from 'vue';
import draggable from 'vuedraggable';

import { useFormattedAmount } from '../composables/useFormattedAmount';
import { useLoading } from '../composables/useLoading';
import { useWalletTranslation } from '../composables/useWalletTranslation';
import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import { RouteNames, HiddenValue, WalletFilteringOptions } from '../consts';

import AssetListItem from './AssetListItem.vue';
import FormattedAmountWithFiatValue from './FormattedAmountWithFiatValue.vue';
import WalletAssetsHeadline from './WalletAssetsHeadline.vue';

import type { WalletAssetFilters, WalletPermissions } from '../consts';
import type { Route } from '@/stores/router/types';
import type { AccountAsset, Whitelist } from '@sora-substrate/sdk/build/assets/types';
type DraggableMoveEvent<T> = {
  draggedContext: { element: T };
  relatedContext: { element: T };
};

export default {
  components: {
    AssetListItem,
    FormattedAmountWithFiatValue,
    WalletAssetsHeadline,
    draggable,
  },
  emits: ['swap'],
  setup(_props, { emit }) {
    const walletStore = useWalletStore();
    const routerStore = useRouterStore();
    const { loading } = useLoading();
    const {
      getAssetFiatPrice,
      getFPNumberFromCodec,
      formatCodecNumber,
      isCodecZero,
      getFiatBalance,
      FontSizeRate,
      FontWeightRate,
    } = useFormattedAmount();
    const fiatPriceObject = computed(() => walletStore.fiatPriceObject);
    const { t, shouldBalanceBeHidden } = useWalletTranslation();

    const accountAssets = computed(() => walletStore.accountAssets);
    const permissions = computed(() => walletStore.permissions);
    const filters = computed(() => walletStore.filters);
    const whitelist = computed(() => walletStore.whitelist);
    const isAssetPinned = computed(() => walletStore.isAssetPinned);
    const assetList = computed<Array<AccountAsset>>({
      get: () => {
        return [...accountAssets.value].sort((a, b) => {
          const aPinned = Number(isAssetPinned.value(a));
          const bPinned = Number(isAssetPinned.value(b));

          return bPinned - aPinned;
        });
      },
      set: (sortedAccountAssets: Array<AccountAsset>) => {
        if (!sortedAccountAssets.length) return;

        const pinnedAssetAddresses = sortedAccountAssets.reduce<string[]>((acc, asset) => {
          if (isAssetPinned.value(asset)) acc.push(asset.address);
          return acc;
        }, []);
        setMultiplePinnedAssets(pinnedAssetAddresses);

        const assetsAddresses = sortedAccountAssets.map((asset) => asset.address);
        api.assets.accountAssetsAddresses = assetsAddresses;
        api.assets.updateAccountAssets();
        setAccountAssets(sortedAccountAssets);
      },
    });
    const visibleAssetList = computed(() => assetList.value.filter((asset: AccountAsset) => showAsset(asset)));
    const assetsAreHidden = computed(() => visibleAssetList.value.length === 0);
    const formattedAccountAssets = computed(() =>
      accountAssets.value.filter((asset) => asset.balance && !Number.isNaN(+asset.balance.transferable))
    );
    const assetsFiatAmount = computed<Nullable<string>>(() => {
      if (isEmpty(fiatPriceObject.value)) {
        return null;
      }
      if (!formattedAccountAssets.value.length) {
        return '0';
      }
      const fiatAmount = formattedAccountAssets.value.reduce((sum: FPNumber, asset: AccountAsset) => {
        const price = getAssetFiatPrice(asset);
        return price
          ? sum.add(
              getFPNumberFromCodec(asset.balance.transferable, asset.decimals).mul(FPNumber.fromCodecValue(price))
            )
          : sum;
      }, new FPNumber(0));
      return fiatAmount ? fiatAmount.toLocaleString() : null;
    });
    const computedClasses = computed(() => {
      const baseClass = 'wallet-assets';
      const classes = [baseClass];

      if (assetsFiatAmount.value) {
        classes.push(`${baseClass}--fiat`);
      }

      return classes.concat('s-flex').join(' ');
    });

    function setAccountAssets(assets: AccountAsset[]): void {
      walletStore.setAccountAssets(assets);
    }

    function setPinnedAsset(asset: AccountAsset): void {
      walletStore.setPinnedAsset(asset);
    }

    function removePinnedAsset(asset: AccountAsset): void {
      walletStore.removePinnedAsset(asset);
    }

    function setMultiplePinnedAssets(assetAddresses: string[]): void {
      walletStore.setMultiplePinnedAssets(assetAddresses);
    }

    function navigate(options: Route): void {
      routerStore.navigate(options);
    }

    function onMove(event: DraggableMoveEvent<AccountAsset>): boolean {
      const draggedItem = event.draggedContext.element;
      const targetItem = event.relatedContext.element;

      const draggedIsPinned = isAssetPinned.value(draggedItem);
      const targetIsPinned = isAssetPinned.value(targetItem);

      if (draggedIsPinned && !targetIsPinned) {
        return false;
      }
      if (!draggedIsPinned && targetIsPinned) {
        return false;
      }
      return true;
    }

    function getBalance(asset: AccountAsset): string {
      return `${formatCodecNumber(asset.balance.transferable, asset.decimals)}`;
    }

    function isZeroBalance(asset: AccountAsset): boolean {
      return isCodecZero(asset.balance.transferable, asset.decimals);
    }

    function hasLockedBalance(asset: AccountAsset): boolean {
      return !isCodecZero(asset.balance.locked, asset.decimals);
    }

    function formatFrozenBalance(asset: AccountAsset): string {
      if (shouldBalanceBeHidden.value) {
        return HiddenValue;
      }
      return formatCodecNumber(asset.balance.locked, asset.decimals);
    }

    function handleAssetSwap(asset: AccountAsset): void {
      emit('swap', asset);
    }

    function handleAssetSend(asset: AccountAsset): void {
      navigate({ name: RouteNames.WalletSend, params: { asset } });
    }

    function handleOpenAssetDetails(asset: AccountAsset): void {
      navigate({ name: RouteNames.WalletAssetDetails, params: { asset } });
    }

    function handleOpenAddAsset(): void {
      navigate({ name: RouteNames.AddAsset });
    }

    function handlePin(asset: AccountAsset): void {
      if (isAssetPinned.value(asset)) {
        removePinnedAsset(asset);
      } else {
        setPinnedAsset(asset);
      }
    }

    function showAsset(asset: AccountAsset): boolean {
      const tokenType = (filters.value as WalletAssetFilters).option;
      const showWhitelistedOnly = (filters.value as WalletAssetFilters).verifiedOnly;
      const hideZeroBalance = (filters.value as WalletAssetFilters).zeroBalance;

      const isNft = api.assets.isNft(asset);
      const isWhitelisted = api.assets.isWhitelist(asset, whitelist.value as Whitelist);
      const hasZeroBalance = !asset.decimals ? asset.balance.total === '0' : asset.balance.total[8] === undefined;

      if (tokenType === WalletFilteringOptions.Currencies && isNft) {
        return false;
      }

      if (tokenType === WalletFilteringOptions.NFT && !isNft) {
        return false;
      }

      if (!isWhitelisted && showWhitelistedOnly) {
        return false;
      }

      if (hideZeroBalance && hasZeroBalance) {
        return false;
      }

      return true;
    }

    return {
      draggable,
      loading,
      t,
      FontSizeRate,
      FontWeightRate,
      shouldBalanceBeHidden,
      permissions,
      filters,
      whitelist,
      isAssetPinned: isAssetPinned.value,
      assetList,
      assetsAreHidden,
      computedClasses,
      assetsFiatAmount,
      getBalance,
      isZeroBalance,
      hasLockedBalance,
      formatFrozenBalance,
      handleAssetSwap,
      handleAssetSend,
      handleOpenAssetDetails,
      handleOpenAddAsset,
      handlePin,
      showAsset,
      onMove,
      getFiatBalance,
    };
  },
};
</script>

<style lang="scss">
$padding: 5px;

.sortable {
  &-ghost {
    opacity: 0.5;
  }
  &-drag {
    .wallet-assets-divider {
      display: none;
    }
  }
}

.wallet-assets {
  &-item {
    position: relative;
    background-color: var(--s-color-utility-surface);
    border-radius: calc(var(--s-border-radius-mini) / 2);
  }

  &-dashes {
    position: absolute;
    top: 25%;
    height: 50%;
    width: 10px;
    cursor: grab;
    z-index: 1;
  }

  &-three-dash {
    @include three-dashes(50%);

    &::before {
      content: '';
      @include three-dashes($padding);
    }

    &::after {
      content: '';
      @include three-dashes(calc(#{$padding} * -1));
    }
  }

  &-list {
    @include asset-list($basic-spacing-big, $basic-spacing-big);
  }

  &-scrollbar {
    $dirty-hack-for-users: 32px; // Who doesn't understand that this list is scrollable

    @include scrollbar(
      $basic-spacing-big,
      $height: calc(var(--s-asset-item-height--fiat) * 3 + #{$dirty-hack-for-users})
    );
  }

  &--empty {
    margin-top: calc(var(--s-basic-spacing) * 2);
    text-align: center;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    font-weight: 300;
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
  }

  .asset {
    .logo {
      margin-left: 20px;
    }

    .formatted-amount {
      display: block;
      width: 100%;
      line-height: var(--s-line-height-reset);
      &__container {
        justify-content: flex-start;
        text-align: left;
      }
      &--fiat-value {
        margin-top: $basic-spacing-mini;
      }
    }

    &-value {
      height: $basic-spacing-medium;
      font-size: var(--s-font-size-medium);
      font-weight: 800;
      letter-spacing: var(--s-letter-spacing-mini);
      line-height: var(--s-line-height-reset);
      &-locked {
        margin-left: $basic-spacing-tiny;
      }
      .formatted-amount__decimal {
        font-weight: 600;
      }

      @include formatted-amount-tooltip;
    }

    &-info {
      margin-top: $basic-spacing-mini;
      color: var(--s-color-base-content-primary);
      line-height: var(--s-line-height-reset);
    }
  }
}
</style>

<style scoped lang="scss">
.wallet-assets {
  flex-direction: column;
  margin-top: 16px;

  .asset {
    &-value-locked {
      display: inline-flex;
      align-items: center;
      background-color: var(--s-color-base-content-secondary);
      color: var(--s-color-base-on-accent);
      padding: 2px 7px;
      line-height: 1;
      border-radius: var(--s-border-radius-mini);
      max-width: 100%;
      > .s-icon-lock-16 {
        color: var(--s-color-base-on-accent);
      }
      > span {
        margin-left: #{$basic-spacing-mini};
        white-space: nowrap;
      }
    }
  }

  &-add {
    margin-top: 16px;
  }

  &__button {
    & + & {
      margin-left: 0;
    }
  }

  &-divider {
    margin: 0;
  }

  &-item {
    display: flex;
    flex-direction: column;
  }
}
</style>
