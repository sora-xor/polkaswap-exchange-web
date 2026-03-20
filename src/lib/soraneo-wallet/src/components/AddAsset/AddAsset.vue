<template>
  <wallet-base :title="t('addAssetText')" show-back :reset-focus="currentScreen" @back="handleBack">
    <div class="add-asset">
      <s-tabs v-if="showTabs" v-model="currentTab" type="rounded" class="add-asset-tabs">
        <s-tab v-for="tab in AddAssetTabs" :key="tab" :label="getTabName(tab)" :name="tab"></s-tab>
      </s-tabs>
      <keep-alive>
        <component
          :is="currentTab"
          :token-details-page-opened="tokenDetailsPageOpened"
          @change-visibility="changeVisibility"
        ></component>
      </keep-alive>
    </div>
  </wallet-base>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { useRouterStore } from '@/stores/router';

import { RouteNames, AddAssetTabs } from '../../consts';
import TranslationMixin from '../mixins/TranslationMixin';
import WalletBase from '../WalletBase.vue';

import AddAssetNFT from './AddAssetNftTab.vue';
import AddAssetToken from './AddAssetTokenTab.vue';

import type { Route } from '../../store/router/types';

export default defineComponent({
  components: {
    WalletBase,
    AddAssetToken,
    AddAssetNFT,
  },
  mixins: [TranslationMixin],
  data() {
    return {
      AddAssetTabs,
      currentTab: AddAssetTabs.Token as AddAssetTabs,
      showTabs: true,
      tokenDetailsPageOpened: false,
    };
  },
  computed: {
    currentScreen(this: any): string {
      return `${this.currentTab}${this.tokenDetailsPageOpened}`;
    },
    routerStore(this: any) {
      return useRouterStore(this.$pinia);
    },
  },
  methods: {
    getTabName(this: any, tab: AddAssetTabs): string {
      if (tab === AddAssetTabs.NFT) {
        return this.TranslationConsts.NFT;
      }
      return this.t(`addAsset.${tab}.title`);
    },
    changeVisibility(this: any): void {
      this.showTabs = false;
      this.tokenDetailsPageOpened = true;
    },
    navigate(this: any, options: Route): void {
      this.routerStore.navigate(options);
    },
    handleBack(this: any): void {
      if (!this.showTabs) {
        this.showTabs = true;
        this.tokenDetailsPageOpened = false;
        return;
      }

      this.navigate({ name: RouteNames.Wallet });
    },
  },
});
</script>

<style lang="scss">
.add-asset {
  @include custom-tabs;

  &-tabs {
    margin-bottom: $basic-spacing-medium;
  }
}
</style>
