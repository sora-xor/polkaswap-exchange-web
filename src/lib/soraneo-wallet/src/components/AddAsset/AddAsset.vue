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
import { Options, mixins } from 'vue-property-decorator';

import { useRouterStore } from '@/stores/router';

import { RouteNames, AddAssetTabs } from '../../consts';
import TranslationMixin from '../mixins/TranslationMixin';
import WalletBase from '../WalletBase.vue';

import AddAssetNFT from './AddAssetNftTab.vue';
import AddAssetToken from './AddAssetTokenTab.vue';

import type { Route } from '../../store/router/types';

@Options({
  components: {
    WalletBase,
    AddAssetToken,
    AddAssetNFT,
  },
})
export default class AddAsset extends mixins(TranslationMixin) {
  readonly AddAssetTabs = AddAssetTabs;

  currentTab = AddAssetTabs.Token;

  showTabs = true;
  tokenDetailsPageOpened = false;

  get currentScreen(): string {
    return `${this.currentTab}${this.tokenDetailsPageOpened}`;
  }

  getTabName(tab: AddAssetTabs): string {
    if (tab === AddAssetTabs.NFT) {
      return this.TranslationConsts.NFT;
    }
    return this.t(`addAsset.${tab}.title`);
  }

  changeVisibility(): void {
    this.showTabs = false;
    this.tokenDetailsPageOpened = true;
  }

  private get routerStore() {
    return useRouterStore((this as any).$pinia);
  }

  private navigate(options: Route): void {
    this.routerStore.navigate(options);
  }

  handleBack(): void {
    if (!this.showTabs) {
      this.showTabs = true;
      this.tokenDetailsPageOpened = false;
      return;
    }

    this.navigate({ name: RouteNames.Wallet });
  }
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
