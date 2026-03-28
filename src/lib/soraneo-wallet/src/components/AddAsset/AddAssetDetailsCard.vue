<template>
  <div class="add-asset-details">
    <s-scrollbar class="asset-list-scrollbar" :style="{ height }">
      <div class="asset-list-container">
        <div v-for="asset in selectAssets" :key="asset.address">
          <s-card shadow="always" size="small" border-radius="mini">
            <asset-list-item :asset="asset" :pinnable="false">
              <template #append>
                <s-card size="mini" :status="assetCardStatus(asset)" primary>
                  <div class="asset-nature">{{ assetNatureText(asset) }}</div>
                </s-card>
              </template>
            </asset-list-item>
          </s-card>
        </div>
      </div>
    </s-scrollbar>
    <!-- Other elements remain unchanged -->
    <s-card status="warning" :primary="isCardPrimary" shadow="always" class="add-asset-details_text">
      <div class="p2">{{ t('addAsset.warningTitle') }}</div>
      <div class="warning-text p4">
        {{ warningMessage }}
      </div>
    </s-card>
    <div class="add-asset-details_confirm">
      <s-switch v-model="isConfirmed" :disabled="loading"></s-switch>
      <span>{{ t('addAsset.understand') }}</span>
    </div>
    <s-button
      class="add-asset-details_action s-typography-button--large"
      type="primary"
      :disabled="!selectAssets.length || !isConfirmed || loading"
      @click="handleAddAssets"
    >
      {{ tc('addAssetsText', selectAssets.length) }}
    </s-button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { Theme } from '@/consts';
import { useWalletStore } from '@/stores/wallet';

import { useAddAsset } from '../../composables/useAddAsset';
import { api } from '../../api';
import { getCssVariableValue } from '../../util';
import AssetListItem from '../AssetListItem.vue';

import type { WhitelistIdsBySymbol } from '../../types/common';
import type { Asset, Whitelist } from '@sora-substrate/sdk/build/assets/types';

const props = withDefaults(
  defineProps<{
    selectAssets: Asset[];
    theme?: Theme;
    assetTypeKey: string;
  }>(),
  {
    theme: Theme.Light,
  }
);

const emit = defineEmits<{
  add: [];
}>();

const { t, tc, addAccountAsset } = useAddAsset();
const walletStore = useWalletStore();
const isConfirmed = ref(false);

const whitelist = computed(() => walletStore.whitelist);
const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol);
const isCardPrimary = computed(() => props.theme !== Theme.Dark);
const height = computed(() => {
  const itemHeight = parseFloat(getCssVariableValue('--s-asset-item-height--fiat'));
  const itemHeightFixed = itemHeight + 1; // card is bigger on 1px
  const gutter = 16;
  const count = props.selectAssets.length;
  const size = Math.min(count, 2);
  const preview = Number(size < count) * (gutter + itemHeight / 2);
  const value = itemHeightFixed * size + gutter * (size - 1) + preview;

  return `${value}px`;
});
const warningMessage = computed(() => {
  const assetType = tc(`addAsset.assetType.${props.assetTypeKey}`, 1);
  const assetTypePlural = tc(`addAsset.assetType.${props.assetTypeKey}`, props.selectAssets.length);
  const purchaseAssetType =
    props.selectAssets.length === 1
      ? tc('addAsset.warningMessage', 1, { assetType })
      : tc('addAsset.warningMessage', props.selectAssets.length, { assetTypePlural });

  return tc('addAsset.warningMessageText', props.selectAssets.length, {
    assetType,
    assetTypePlural,
    purchaseAssetType,
  });
});

function isWhitelist(asset: Asset): boolean {
  return api.assets.isWhitelist(asset, whitelist.value as Whitelist);
}

function isBlacklist(asset: Asset): boolean {
  return api.assets.isBlacklist(asset, whitelistIdsBySymbol.value as WhitelistIdsBySymbol);
}

function assetCardStatus(asset: Asset): string {
  return isWhitelist(asset) ? 'success' : 'error';
}

function assetNatureText(asset: Asset): string {
  if (isWhitelist(asset)) {
    return t('addAsset.approved');
  }
  if (isBlacklist(asset)) {
    return t('addAsset.scam');
  }

  return t('addAsset.unknown');
}

async function handleAddAssets(): Promise<void> {
  emit('add');
  props.selectAssets.forEach((asset: Asset) => {
    addAccountAsset(asset);
  });
}
</script>

<style lang="scss">
.asset-list-scrollbar {
  @include scrollbar($basic-spacing-big);
  .el-scrollbar__wrap {
    overflow-x: unset;
  }
}
</style>

<style scoped lang="scss">
.add-asset-details {
  display: flex;
  flex-flow: column nowrap;
  gap: $basic-spacing-medium;

  .asset-nature {
    font-size: var(--s-font-size-mini);
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-small);
    line-height: var(--s-line-height-medium);
  }

  &_confirm {
    @include switch-block;

    & {
      padding-top: 0;
      padding-bottom: 0;
    }
  }
  &_action {
    width: 100%;
  }
  &_text {
    color: var(--s-color-status-warning);
  }

  .asset-list-container {
    display: flex;
    flex-flow: column nowrap;
    gap: $basic-spacing-medium;
  }
}
</style>
