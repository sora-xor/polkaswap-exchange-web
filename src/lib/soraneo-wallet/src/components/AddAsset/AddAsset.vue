<template>
  <wallet-base :title="t('addAssetText')" show-back :reset-focus="currentScreen" @back="handleBack">
    <div class="add-asset">
      <s-tabs v-if="showTabs" v-model="currentTab" type="rounded" class="add-asset-tabs">
        <s-tab v-for="tab in AddAssetTabs" :key="tab" :label="getTabName(tab)" :name="tab"></s-tab>
      </s-tabs>
      <keep-alive>
        <component
          :is="currentTabComponent"
          :token-details-page-opened="tokenDetailsPageOpened"
          @change-visibility="changeVisibility"
        ></component>
      </keep-alive>
    </div>
  </wallet-base>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue';

import { useWalletTranslation } from '../../composables/useWalletTranslation';
import { useRouterStore } from '@/stores/router';

import { RouteNames, AddAssetTabs } from '../../consts';
import WalletBase from '../WalletBase.vue';

import AddAssetNFT from './AddAssetNftTab.vue';
import AddAssetToken from './AddAssetTokenTab.vue';

import type { Route } from '@/stores/router/types';

const { t, TranslationConsts } = useWalletTranslation();
const routerStore = useRouterStore();
const currentTab = ref<AddAssetTabs>(AddAssetTabs.Token);
const showTabs = ref(true);
const tokenDetailsPageOpened = ref(false);
const addAssetTabComponents = {
  [AddAssetTabs.Token]: AddAssetToken,
  [AddAssetTabs.NFT]: AddAssetNFT,
} as const satisfies Record<AddAssetTabs, Component>;

const currentScreen = computed(() => `${currentTab.value}${tokenDetailsPageOpened.value}`);
const currentTabComponent = computed<Component>(() => addAssetTabComponents[currentTab.value]);

function getTabName(tab: AddAssetTabs): string {
  if (tab === AddAssetTabs.NFT) {
    return TranslationConsts.NFT;
  }
  return t(`addAsset.${tab}.title`);
}

function changeVisibility(): void {
  showTabs.value = false;
  tokenDetailsPageOpened.value = true;
}

function navigate(options: Route): void {
  routerStore.navigate(options);
}

function handleBack(): void {
  if (!showTabs.value) {
    showTabs.value = true;
    tokenDetailsPageOpened.value = false;
    return;
  }

  navigate({ name: RouteNames.Wallet });
}
</script>

<style lang="scss">
.add-asset {
  @include custom-tabs;

  &-tabs {
    margin-bottom: $basic-spacing-medium;
  }
}
</style>
