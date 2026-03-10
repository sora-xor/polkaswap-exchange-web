<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t('selectToken.title')"
    custom-class="asset-select"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
  >
    <s-tabs :value="tabValue" class="s-tabs--exchange" type="rounded" @input="handleTabChange">
      <search-input
        ref="searchRef"
        v-model="query"
        :placeholder="activeSearchPlaceholder"
        autofocus
        @clear="handleClearSearch"
        class="token-search"
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
        v-show="shouldAssetsListBeShown"
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
import { api, components, WALLET_TYPES, getAssetsSubset } from '@wallet';
import { computed, nextTick, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useLoading } from '@/composables/useLoading';
import { Components, ObjectInit } from '@/consts';
import { Theme } from '@/consts/theme';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { isSelectableAsset } from '@/components/shared/SelectAsset/utils';
import { sortAssets } from '@/utils';

import type { Nullable } from '@/types/common';
import type { Asset, AccountAsset, RegisteredAccountAsset, Whitelist } from '@sora-substrate/sdk/build/assets/types';

enum Tabs {
  Assets = 'assets',
  Custom = 'custom',
}

type SelectTokenEvents = {
  (event: 'update:visible', value: boolean): void;
  (event: 'select', asset: Asset | AccountAsset | RegisteredAccountAsset): void;
  (event: 'close'): void;
};

const DialogBase = components.DialogBase;
const SelectAssetList = lazyComponent(Components.SelectAssetList);
const TokenAddress = components.TokenAddress;
const SearchInput = components.SearchInput;
const AssetsFilter = components.AssetsFilter;
const AddAssetDetailsCard = components.AddAssetDetailsCard;

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
    visible: boolean;
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
const isVisible = ref(props.visible);
const tabValue = ref<Tabs>(Tabs.Assets);

watch(
  () => props.visible,
  (value) => {
    isVisible.value = value;
  }
);

watch(isVisible, async (value) => {
  emit('update:visible', value);
  if (value) {
    tabValue.value = Tabs.Assets;
    await nextTick();
    clearAndFocusSearch();
  }
});

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

const closeDialog = () => {
  emit('close');
  isVisible.value = false;
};

const shouldBalanceBeHidden = computed(() => settingsStore.shouldBalanceBeHidden);
const libraryTheme = computed<Nullable<Theme>>(() => settingsStore.libraryTheme);
const whitelist = computed<Whitelist>(() => walletStore.whitelist ?? []);
const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol ?? {});
const isLoggedIn = computed(() => walletStore.isLoggedIn);
const assets = computed<Asset[]>(() => (walletStore.assets ?? []) as Asset[]);
const accountAssets = computed<AccountAsset[]>(() => (walletStore.accountAssets ?? []) as AccountAsset[]);
const pinnedAssetsAddresses = computed(() => walletStore.pinnedAssets ?? []);
const selectedAssetsFilter = computed<WALLET_TYPES.FilterOptions>(
  () => (settingsStore.assetsFilter as WALLET_TYPES.FilterOptions) ?? WALLET_TYPES.FilterOptions.All
);

const nonWhitelistAssets = computed(() => getNonWhitelistDivisibleAssets(assets.value, whitelist.value));
const nonWhitelistAccountAssets = computed(() => getNonWhitelistDivisibleAssets(accountAssets.value, whitelist.value));

const mainLPSources = computed(() => {
  const mainSourceAddresses = api.dex.poolBaseAssetsIds;
  return assets.value.filter((asset) => mainSourceAddresses.includes(asset.address));
});

const whitelistAssets = computed(() => {
  if (props.isAddLiquidity) {
    const filtered = props.isFirstTokenSelected
      ? mainLPSources.value
      : assets.value.filter((asset) => asset.address !== XOR.address);
    return getAssetsSubset(filtered, selectedAssetsFilter.value);
  }

  return getAssetsSubset(assets.value, selectedAssetsFilter.value);
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
.asset-select {
  .el-dialog {
    overflow: hidden;
    &__body {
      padding: $inner-spacing-mini 0 $inner-spacing-big !important;
    }
  }

  .dialog-card {
    overflow: hidden;
    box-shadow: var(--s-shadow-dialog);

    &__content {
      padding: $inner-spacing-mini 0 $inner-spacing-big !important;
    }

    &__header {
      padding: $inner-spacing-big $inner-spacing-big $inner-spacing-mini;
      box-shadow: none;
    }

    &__title,
    &__title-text {
      font-size: 24px;
      font-weight: 300;
      line-height: 31.2px;
      letter-spacing: -0.96px;
    }

    &__close {
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
  // TODO: Fix input styles (paddings and icon position)
  margin-left: 0;
  margin-bottom: $inner-spacing-medium;
  width: 100%;
  min-height: 58px;
  padding: $inner-spacing-small $inner-spacing-big;
  border-radius: 24px;
  background-color: var(--s-color-utility-surface);
  box-shadow: var(--s-shadow-element);
  border: 1px solid rgba(42, 23, 31, 0.35);
  @include focus-outline($withOffset: true);

  :deep(.s-input__content) {
    min-height: 42px;
    padding: 0;
  }

  :deep(.el-input__inner) {
    line-height: 21px;
    padding: 0 $inner-spacing-small;
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
