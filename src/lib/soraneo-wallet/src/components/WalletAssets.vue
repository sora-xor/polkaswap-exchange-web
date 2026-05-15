<template>
  <div v-loading="assetsLoading" :class="computedClasses">
    <wallet-assets-headline :assets-fiat-amount="assetsFiatAmount"></wallet-assets-headline>
    <s-scrollbar class="wallet-assets-scrollbar">
      <draggable
        v-if="visibleAssetList.length"
        v-model="visibleAssetList"
        class="wallet-assets__draggable"
        handle=".wallet-assets-dashes"
        item-key="address"
        :move="onMove"
      >
        <template #item="{ element: asset, index }">
          <div class="wallet-assets-item s-flex">
            <div class="wallet-assets-dashes" aria-hidden="true"><div class="wallet-assets-three-dash"></div></div>
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
                  :fiat-font-size-rate="FontSizeRate.SMALL"
                  :fiat-font-weight-rate="FontWeightRate.SMALL"
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
                  :aria-label="t('assets.send')"
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
                  :aria-label="t('assets.swap')"
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
                  :aria-label="t('assets.details')"
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
          <div v-if="showEmptyAssets" class="wallet-assets--empty">{{ t('addAsset.empty') }}</div>
        </template>
      </draggable>
      <div v-else class="wallet-assets__draggable">
        <div v-if="showEmptyAssets" class="wallet-assets--empty">{{ t('addAsset.empty') }}</div>
      </div>
    </s-scrollbar>

    <s-button
      v-if="permissions.addAssets"
      class="wallet-assets-add s-typography-button--medium"
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

import type { WalletNavigationTarget } from '@/platform/wallet/navigation';
import { useFormattedAmount } from '../composables/useFormattedAmount';
import { useLoading } from '../composables/useLoading';
import { useWalletTranslation } from '../composables/useWalletTranslation';
import { useWalletStore } from '@/stores/wallet';

import { RouteNames, HiddenValue, WalletFilteringOptions } from '../consts';
import { mergeVisibleAssetOrder } from './walletAssetsOrder';

import AssetListItem from './AssetListItem.vue';
import FormattedAmountWithFiatValue from './FormattedAmountWithFiatValue.vue';
import WalletAssetsHeadline from './WalletAssetsHeadline.vue';

import type { WalletAssetFilters, WalletPermissions } from '../consts';
import type { AccountAsset, AccountBalance, Whitelist } from '@sora-substrate/sdk/build/assets/types';

type AccountBalanceKey = keyof Pick<AccountBalance, 'locked' | 'total' | 'transferable'>;

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
    const accountAssetsLoading = computed(() => walletStore.accountAssetsLoading);
    const accountAssetsLoaded = computed(() => walletStore.accountAssetsLoaded);
    const waitingForAccountAssets = computed(() => Boolean(walletStore.isLoggedIn) && !accountAssetsLoaded.value);
    const assetsLoading = computed(() => loading.value || accountAssetsLoading.value || waitingForAccountAssets.value);
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
    const visibleAssetList = computed<Array<AccountAsset>>({
      get: () => assetList.value.filter((asset: AccountAsset) => showAsset(asset)),
      set: (sortedVisibleAssets: Array<AccountAsset>) => {
        assetList.value = mergeVisibleAssetOrder(assetList.value, sortedVisibleAssets, showAsset);
      },
    });
    const assetsAreHidden = computed(() => visibleAssetList.value.length === 0);
    const showEmptyAssets = computed(() => assetsAreHidden.value && !assetsLoading.value);
    const formattedAccountAssets = computed(() =>
      accountAssets.value.filter((asset) => asset.balance && hasCodecBalanceValue(asset.balance.transferable))
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
        const transferableBalance = getCodecBalanceValue(asset, 'transferable');
        return price
          ? sum.add(getFPNumberFromCodec(transferableBalance, asset.decimals).mul(FPNumber.fromCodecValue(price)))
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

    function navigate(options: WalletNavigationTarget): void {
      walletStore.navigate(options);
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

    /**
     * Validates codec balance strings without coercing them through native numbers.
     */
    function hasCodecBalanceValue(value: unknown): value is AccountBalance[AccountBalanceKey] {
      return typeof value === 'string' && /^\d+$/.test(value.trim());
    }

    /**
     * Returns a safe codec balance so incomplete SDK records still render a token amount.
     */
    function getCodecBalanceValue(asset: AccountAsset, balanceKey: AccountBalanceKey): AccountBalance[AccountBalanceKey] {
      const value = asset.balance?.[balanceKey];

      return hasCodecBalanceValue(value) ? value : ('0' as AccountBalance[AccountBalanceKey]);
    }

    function getBalance(asset: AccountAsset): string {
      return formatCodecNumber(getCodecBalanceValue(asset, 'transferable'), asset.decimals);
    }

    function isZeroBalance(asset: AccountAsset): boolean {
      return isCodecZero(getCodecBalanceValue(asset, 'transferable'), asset.decimals);
    }

    function hasLockedBalance(asset: AccountAsset): boolean {
      return !isCodecZero(getCodecBalanceValue(asset, 'locked'), asset.decimals);
    }

    function formatFrozenBalance(asset: AccountAsset): string {
      if (shouldBalanceBeHidden.value) {
        return HiddenValue;
      }
      return formatCodecNumber(getCodecBalanceValue(asset, 'locked'), asset.decimals);
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
      const hasZeroBalance = isCodecZero(getCodecBalanceValue(asset, 'total'), asset.decimals);

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
      assetsLoading,
      t,
      FontSizeRate,
      FontWeightRate,
      shouldBalanceBeHidden,
      permissions,
      filters,
      whitelist,
      isAssetPinned: isAssetPinned.value,
      assetList,
      visibleAssetList,
      assetsAreHidden,
      showEmptyAssets,
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
  --s-asset-item-height--fiat: 76px;

  &-item {
    position: relative;
    background-color: var(--s-color-utility-surface);
    border: 1px solid transparent;
    border-radius: 8px;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;

    &:hover,
    &:focus-within {
      border-color: var(--s-color-base-border-primary);
      background-color: var(--s-color-utility-body);
      transform: translateY(-1px);
    }
  }

  &-dashes {
    position: absolute;
    top: 25%;
    left: 12px;
    height: 50%;
    width: 10px;
    cursor: grab;
    z-index: 1;
    opacity: 0.65;
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
    gap: 12px;
    box-sizing: border-box;
    padding: 0 12px 0 34px;

    .logo {
      flex: 0 0 auto;
      margin-left: 0;
    }

    .formatted-amount {
      display: block;
      width: 100%;
      line-height: var(--s-line-height-reset);
      &__container {
        justify-content: flex-start;
        max-width: 100%;
        min-width: 0;
        text-align: left;
      }
      &--fiat-value {
        margin-top: $basic-spacing-extra-mini;
        color: var(--s-color-base-content-secondary);
        font-size: var(--s-font-size-extra-small);
        font-weight: 400;
        letter-spacing: 0;
        line-height: var(--s-line-height-mini);
      }
    }

    &-description {
      min-width: 0;
      flex: 1 1 auto;
      width: auto;
      padding: 0 10px 0 0;
    }

    &-value {
      height: auto;
      max-width: 100%;
      overflow: hidden;
      overflow-wrap: normal;
      font-size: var(--s-font-size-small);
      font-weight: 700;
      letter-spacing: 0;
      line-height: var(--s-line-height-small);
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: normal;

      .formatted-amount__value {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        word-break: normal;
      }

      &-locked {
        margin-left: $basic-spacing-tiny;
      }
      .formatted-amount__decimal {
        font-weight: 500;
      }

      @include formatted-amount-tooltip;
    }

    &-info {
      display: block;
      max-width: 100%;
      overflow: hidden;
      margin-top: $basic-spacing-extra-mini;
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-reset);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

@media (max-width: 640px) {
  .wallet-assets {
    --s-asset-item-height--fiat: 74px;

    &-dashes {
      display: none;
    }

    .asset {
      gap: 8px;
      padding: 0 10px;

      .logo .asset-logo--big {
        width: 42px;
        min-width: 42px;
        height: 42px;
        min-height: 42px;
        font-size: 28px;
        line-height: 42px;
      }

      &-description {
        padding-right: 2px;
      }

      &-value {
        font-size: var(--s-font-size-mini);
        line-height: var(--s-line-height-mini);
      }

      &-info {
        font-size: var(--s-font-size-extra-small);
      }
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
    align-self: center;
    width: min(320px, 100%);
    margin-top: 14px;
    margin-bottom: max(8px, env(safe-area-inset-bottom, 0px));
    border-radius: 8px;

    :deep(.s-button__text) {
      letter-spacing: 0 !important;
    }
  }

  &__draggable {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  &__button {
    width: 32px;
    min-width: 32px;
    height: 32px;
    min-height: 32px;
    border-color: var(--s-color-base-border-primary);
    background: var(--s-color-utility-surface);
    box-shadow: none;
    color: var(--s-color-base-content-secondary);
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      transform 150ms ease;

    & + & {
      margin-left: 0;
    }

    &:hover,
    &:focus {
      border-color: var(--s-color-theme-accent);
      background: var(--s-color-utility-body);
      color: var(--s-color-theme-accent);
      transform: translateY(-1px);
    }
  }

  &-divider {
    display: none;
  }

  &-item {
    display: flex;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .wallet-assets {
    &__button {
      width: 30px;
      min-width: 30px;
      height: 30px;
      min-height: 30px;
    }

    &-add {
      align-self: stretch;
      width: auto;
      margin-top: 12px;
    }
  }

  .wallet-assets__button.send,
  .wallet-assets__button.swap {
    display: none;
  }

  .wallet-assets :deep(.pin) {
    display: none;
  }
}
</style>
