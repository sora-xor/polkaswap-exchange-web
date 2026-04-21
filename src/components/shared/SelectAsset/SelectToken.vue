<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t('selectToken.title')"
    custom-class="asset-select"
    wrapper-class="asset-select-wrapper"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
  >
    <s-tabs :value="tabValue" class="s-tabs--exchange" type="rounded" @update:model-value="handleTabChange">
      <search-input
        ref="searchRef"
        v-model="query"
        :placeholder="activeSearchPlaceholder"
        autofocus
        @clear="handleClearSearch"
        class="token-search neumorphic s-focused s-border-radius-small s-size-big s-input--prefix"
      ></search-input>

      <s-tab :label="t('selectToken.assets.title')" name="assets">
        <assets-filter class="token-filter-options"></assets-filter>
      </s-tab>

      <s-tab :disabled="disabledCustom" :label="t('selectToken.custom.title')" name="custom" class="asset-select__info">
        <template v-if="customAsset">
          <span v-if="alreadyAttached">{{ t('selectToken.custom.alreadyAttached') }}</span>

          <add-asset-details-card
            v-else
            :asset="customAsset"
            :theme="libraryTheme"
            :whitelist="whitelist"
            :whitelist-ids-by-symbol="whitelistIdsBySymbol"
            :loading="loading"
            @add="handleAddAsset"
          ></add-asset-details-card>
        </template>

        <span v-else-if="searchQuery">{{ t('selectToken.custom.notFound') }}</span>

        <div v-if="connected && sortedNonWhitelistAccountAssets.length" class="token-list_text">
          {{ sortedNonWhitelistAccountAssets.length }} {{ t('selectToken.custom.text') }}
        </div>
      </s-tab>

      <select-asset-list
        v-if="shouldAssetsListBeRendered"
        :assets="activeAssetsList"
        :size="assetsListSize"
        :connected="connected"
        :should-balance-be-hidden="shouldBalanceBeHidden"
        has-fiat-value
        @click="selectAsset"
      >
        <template #action="token">
          <div v-if="isCustomTabActive" class="token-item__remove" @click.stop="handleRemoveCustomAsset(token)">
            <s-icon name="basic-trash-24"></s-icon>
          </div>
        </template>
      </select-asset-list>
    </s-tabs>
  </dialog-base>
</template>

<script setup lang="ts">
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { computed, nextTick, ref, watch } from 'vue';

import SelectAssetList from '@/components/shared/SelectAsset/List.vue';
import { useTranslation } from '@/composables/useTranslation';
import { useLoading } from '@/composables/useLoading';
import { ObjectInit } from '@/consts';
import { getAssetsSubset } from '@/lib/soraneo-wallet/src/util';
import { FilterOptions } from '@/lib/soraneo-wallet/src/types/common';
import { Theme } from '@/consts/theme';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { isSelectableAsset } from '@/components/shared/SelectAsset/utils';
import { sortAssets } from '@/utils';

import type { Nullable } from '@/types/common';
import type { Asset, AccountAsset, RegisteredAccountAsset, Whitelist } from '@sora-substrate/sdk/build/assets/types';
import WalletAddAssetDetailsCard from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetDetailsCard.vue';
import WalletAssetsFilter from '@/lib/soraneo-wallet/src/components/shared/AssetsFilter.vue';
import WalletDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletSearchInput from '@/lib/soraneo-wallet/src/components/Input/SearchInput.vue';

enum Tabs {
  Assets = 'assets',
  Custom = 'custom',
}

type SelectTokenEvents = {
  (event: 'select', asset: Asset | AccountAsset | RegisteredAccountAsset): void;
  (event: 'close'): void;
};

const DialogBase = WalletDialogBase;
const SearchInput = WalletSearchInput;
const AssetsFilter = WalletAssetsFilter;
const AddAssetDetailsCard = WalletAddAssetDetailsCard;

const isNonEmptyBalance = (asset: AccountAsset | RegisteredAccountAsset): boolean =>
  Boolean(asset.balance) && Boolean(+asset.balance.transferable);

const getNonWhitelistDivisibleAssets = <T extends Asset | AccountAsset>(
  assets: T[],
  whitelist: Whitelist
): Record<string, T> => {
  return assets.reduce<Record<string, T>>((buffer, asset) => {
    if (!api.assets.isWhitelist(asset, whitelist) && asset.decimals) {
      buffer[asset.address] = asset;
    }
    return buffer;
  }, {});
};

const props = withDefaults(
  defineProps<{
    connected?: boolean;
    asset?: Nullable<Asset>;
    disabledCustom?: boolean;
    isFirstTokenSelected?: boolean;
    isAddLiquidity?: boolean;
    filter?: (value: AccountAsset) => boolean;
    appendToBody?: boolean;
  }>(),
  {
    connected: false,
    asset: ObjectInit,
    disabledCustom: false,
    isFirstTokenSelected: false,
    isAddLiquidity: false,
    filter: () => true,
    appendToBody: false,
  }
);

const emit = defineEmits<SelectTokenEvents>();

const { t } = useTranslation();
const assetsStore = useAssetsStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();
const { loading, withLoading } = useLoading();

const searchRef = ref<InstanceType<any> | null>(null);
const query = ref('');
const isVisible = defineModel<boolean>('visible', { required: true });
const tabValue = ref<Tabs>(Tabs.Assets);

watch(
  isVisible,
  async (value) => {
    if (value) {
      tabValue.value = Tabs.Assets;
      await nextTick();
      clearAndFocusSearch();
    }
  },
  { immediate: true }
);

const searchQuery = computed(() => query.value.trim().toLowerCase());

const clearSearch = () => {
  query.value = '';
};

const focusSearchInput = () => {
  const instance = searchRef.value as { focus?: () => void } | undefined;
  instance?.focus?.();
};

const clearAndFocusSearch = () => {
  clearSearch();
  focusSearchInput();
};

const handleClearSearch = () => {
  clearAndFocusSearch();
};

const closeDialog = () => {
  emit('close');
  isVisible.value = false;
};

const shouldBalanceBeHidden = computed(() => settingsStore.shouldBalanceBeHidden);
const libraryTheme = computed<Nullable<Theme>>(() => settingsStore.libraryTheme);
const whitelist = computed<Whitelist>(() => walletStore.whitelist ?? {});
const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol ?? {});
const isLoggedIn = computed(() => walletStore.isLoggedIn);
const assets = computed<Asset[]>(() => (walletStore.assets ?? []) as Asset[]);
const accountAssets = computed<AccountAsset[]>(() => (walletStore.accountAssets ?? []) as AccountAsset[]);
const pinnedAssetsAddresses = computed(() => walletStore.pinnedAssets ?? []);
const selectedAssetsFilter = computed<FilterOptions>(
  () => (settingsStore.assetsFilter as FilterOptions) ?? FilterOptions.All
);

const nonWhitelistAssets = computed(() => getNonWhitelistDivisibleAssets(assets.value, whitelist.value));
const nonWhitelistAccountAssets = computed(() => getNonWhitelistDivisibleAssets(accountAssets.value, whitelist.value));

const mainLPSources = computed(() => {
  const mainSourceAddresses = api.dex.poolBaseAssetsIds;
  return assets.value.filter((asset) => mainSourceAddresses.includes(asset.address));
});

/**
 * Keeps the default assets tab aligned with the verified whitelist while
 * leaving the custom tab available for manual non-whitelist additions.
 */
const filterWhitelistedAssets = <T extends Asset>(items: T[]): T[] => {
  return items.filter((asset) => api.assets.isWhitelist(asset, whitelist.value));
};

const whitelistAssets = computed(() => {
  if (props.isAddLiquidity) {
    const filtered = props.isFirstTokenSelected
      ? filterWhitelistedAssets(mainLPSources.value)
      : filterWhitelistedAssets(assets.value.filter((asset) => asset.address !== XOR.address));
    return getAssetsSubset(filtered, selectedAssetsFilter.value);
  }

  return getAssetsSubset(filterWhitelistedAssets(assets.value), selectedAssetsFilter.value);
});

const getAssetWithBalance = (address?: string): Nullable<RegisteredAccountAsset> =>
  assetsStore.assetDataByAddress(address);

const getAssetsWithBalances = (addresses: string[], excludeAddress?: string): RegisteredAccountAsset[] => {
  return addresses.reduce<RegisteredAccountAsset[]>((buffer, address) => {
    if (address === excludeAddress) return buffer;
    const asset = getAssetWithBalance(address);
    if (asset) buffer.push(asset);
    return buffer;
  }, []);
};

const sortByBalance = (a: AccountAsset | RegisteredAccountAsset, b: AccountAsset | RegisteredAccountAsset): number => {
  const aEmpty = !isNonEmptyBalance(a);
  const bEmpty = !isNonEmptyBalance(b);

  if (aEmpty === bEmpty) return sortAssets(a, b);
  return aEmpty && !bEmpty ? 1 : -1;
};

const filterAssetsByQuery =
  (items: Array<Asset | AccountAsset | RegisteredAccountAsset>, isRegisteredAssets = false) =>
  (queryValue: string): Array<Asset | AccountAsset | RegisteredAccountAsset> => {
    if (!queryValue) return items;

    const searchValue = queryValue.toLowerCase().trim();
    const addressField = isRegisteredAssets ? 'externalAddress' : 'address';

    return items.filter((asset) => {
      const name = asset.name?.toLowerCase?.();
      const symbol = asset.symbol?.toLowerCase?.();
      const address = (asset as any)[addressField]?.toLowerCase?.();
      return name?.includes?.(searchValue) || symbol?.includes?.(searchValue) || address === searchValue;
    });
  };

const whitelistAssetsList = computed(() => {
  const addresses = whitelistAssets.value.map((asset) => asset.address);
  const excludeAddress = props.asset?.address;
  return getAssetsWithBalances(addresses, excludeAddress).sort(sortByBalance);
});

const filteredWhitelistTokens = computed(() => {
  const filtered = filterAssetsByQuery(whitelistAssetsList.value)(searchQuery.value) as AccountAsset[];
  const pinnedOrderMap = new Map(pinnedAssetsAddresses.value.map((address, index) => [address, index]));

  return [...filtered].sort((a, b) => {
    const aIndex = pinnedOrderMap.get(a.address);
    const bIndex = pinnedOrderMap.get(b.address);

    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return 0;
  });
});

const sortedNonWhitelistAccountAssets = computed(() => {
  const excludeAddress = props.asset?.address;
  const addresses = Object.keys(nonWhitelistAccountAssets.value);
  return getAssetsWithBalances(addresses, excludeAddress).sort(sortByBalance);
});

const isCustomTabActive = computed(() => tabValue.value === Tabs.Custom);

const activeAssetsList = computed(() => {
  const list = isCustomTabActive.value ? sortedNonWhitelistAccountAssets.value : filteredWhitelistTokens.value;
  return list.filter(props.filter);
});

const activeSearchPlaceholder = computed(() =>
  t(isCustomTabActive.value ? 'selectToken.custom.search' : 'selectToken.searchPlaceholder')
);

const alreadyAttached = computed(() => Boolean(nonWhitelistAccountAssets.value[searchQuery.value]));
const customAsset = computed<Nullable<Asset>>(() => nonWhitelistAssets.value[searchQuery.value] ?? null);

const shouldAssetsListBeShown = computed(
  () => !(isCustomTabActive.value && !activeAssetsList.value.length && searchQuery.value)
);
const hasReadyAssetsForActiveTab = computed(() =>
  isCustomTabActive.value
    ? Boolean(sortedNonWhitelistAccountAssets.value.length)
    : Boolean(whitelistAssetsList.value.length)
);
const shouldAssetsListBeRendered = computed(
  () => shouldAssetsListBeShown.value && (Boolean(activeAssetsList.value.length) || hasReadyAssetsForActiveTab.value)
);

const assetsListSize = computed(() => (isCustomTabActive.value ? 5 : 6));

const selectAsset = (asset: unknown) => {
  if (!isSelectableAsset(asset)) return;

  clearSearch();
  emit('select', asset);
  closeDialog();
};

const handleAddAsset = async () => {
  if (!customAsset.value) return;

  if (isLoggedIn.value) {
    await withLoading(async () => {
      await walletStore.addAsset(customAsset.value?.address);
    });
    clearSearch();
  } else {
    selectAsset(customAsset.value);
  }
};

const handleRemoveCustomAsset = (asset: AccountAsset) => {
  api.assets.removeAccountAsset(asset.address);
};

const handleTabChange = (name: Tabs) => {
  tabValue.value = name;
  clearAndFocusSearch();
};
</script>

<style lang="scss">
.dialog-wrapper__modal.asset-select-wrapper.s-modal__modal-transition-enter-from,
.dialog-wrapper__modal.asset-select-wrapper.s-modal__modal-transition-leave-to {
  transform: none;
}

.dialog-card.asset-select,
.asset-select .el-dialog {
  overflow: hidden;
  border-radius: 24px;
  box-shadow: var(--s-shadow-element-pressed);
}

.dialog-card.asset-select {
  display: block;
}

.dialog-card.asset-select .dialog-card__content,
.asset-select .el-dialog__body {
  padding: $inner-spacing-mini 0 $inner-spacing-big !important;
  max-height: none;
  overflow: visible;
}

.dialog-card.asset-select .dialog-card__header,
.asset-select .el-dialog__header {
  padding: $inner-spacing-big $inner-spacing-big $inner-spacing-mini;
  box-shadow: none;
}

.dialog-card.asset-select .dialog-card__title,
.dialog-card.asset-select .dialog-card__title-text,
.asset-select .el-dialog__title {
  font-size: 24px;
  font-weight: 300;
  line-height: 31.2px;
  letter-spacing: -0.96px;
}

.dialog-card.asset-select .dialog-card__close,
.asset-select .el-dialog__headerbtn {
  width: 42px;
  min-width: 42px;
  height: 42px;
  min-height: 42px;
  border: 0;
  border-radius: 50%;
  background-color: var(--s-color-base-border-secondary);
  box-shadow: var(--s-shadow-element-pressed);
  color: var(--s-color-base-content-tertiary);

  .s-button__icon > i {
    font-size: 16px !important;
    line-height: 16px !important;
    opacity: 0.6;
  }
}

.asset-select {
  .s-tabs--exchange .el-tabs__header {
    width: calc(100% - 2 * #{$inner-spacing-big}) !important;
  }

  .s-tabs--exchange .el-tabs__nav-wrap,
  .s-tabs--exchange .el-tabs__nav-scroll {
    width: 100%;
  }

  .s-tabs--exchange .el-tabs__content {
    overflow: hidden;
  }

  @include exchange-tabs;

  .s-tabs--exchange {
    .el-tabs__item {
      text-transform: uppercase;
    }
  }
}
</style>

<style lang="scss" scoped>
.token-search {
  display: flex;
  justify-content: center;
  margin: 2px 0 $inner-spacing-medium $inner-spacing-big;
  margin-bottom: $inner-spacing-medium;
  width: calc(100% - 2 * #{$inner-spacing-big});
  min-height: 58px;
  padding: 8px $inner-spacing-medium;
  border-radius: 24px;
  background-color: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
  border: 0 solid var(--s-color-base-border-primary);
  @include focus-outline($focusWithin: true, $withOffset: true);

  &.s-focused {
    outline: 1px solid var(--s-color-outline);
    outline-offset: -1px;
  }

  :deep(.s-input__content) {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 21px;
    margin: auto 0;
    padding: 0;
  }

  :deep(.s-input__input) {
    width: 100%;
  }

  :deep(.s-input__prefix),
  :deep(.s-input__suffix) {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
  }

  :deep(.s-input__prefix) {
    left: 0;
    color: var(--s-color-base-content-secondary);
  }

  :deep(.s-input__suffix) {
    right: 0;
  }

  :deep(.el-input__inner) {
    line-height: 21px;
    padding: 0 26px;
  }
}

.token-filter-options {
  margin: 0 $inner-spacing-big $inner-spacing-medium;
}

.token-list_text {
  font-weight: 800;
}

.asset-select__info {
  color: var(--s-color-base-content-secondary);
  padding: 0 $inner-spacing-big;

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.token-item__remove {
  margin-top: -5px;
  margin-left: $inner-spacing-medium;
  [class^='s-icon-'] {
    @include icon-styles(true);
  }
}
</style>
