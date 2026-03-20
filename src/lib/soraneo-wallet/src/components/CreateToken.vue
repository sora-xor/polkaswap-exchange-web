<template>
  <wallet-base show-back :reset-focus="step" :title="createTokenTitle" :show-header="showHeader" @back="handleBack">
    <div class="token">
      <s-tabs
        v-if="showTabs"
        class="token__tab"
        type="rounded"
        :value="currentTab"
        @update:model-value="handleChangeTab"
      >
        <s-tab v-for="tab in TokenTabs" :key="tab" :label="getTabName(tab)" :name="tab"></s-tab>
      </s-tabs>
      <component
        :is="currentTab"
        :step="currentStep"
        @show-tabs="setTabVisibility"
        @show-header="setHeaderVisibility"
        @step-change="setStep"
      ></component>
    </div>
  </wallet-base>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { useRouterStore } from '@/stores/router';

import { TokenTabs, Step, RouteNames } from '../consts';

import CreateNftToken from './CreateNftToken.vue';
import CreateSimpleToken from './CreateSimpleToken.vue';
import TranslationMixin from './mixins/TranslationMixin';
import WalletBase from './WalletBase.vue';

import type { Route } from '../store/router/types';

export default defineComponent({
  components: {
    WalletBase,
    CreateSimpleToken,
    CreateNftToken,
  },
  mixins: [TranslationMixin],
  data() {
    return {
      TokenTabs,
      step: Step.CreateSimpleToken as Step,
      currentTab: Step.CreateSimpleToken as Step,
      showTabs: true,
      showHeader: true,
      createTokenTitle: '',
    };
  },
  created(this: any): void {
    this.createTokenTitle = this.t('createToken.titleCommon');
  },
  computed: {
    currentStep(this: any): Step {
      return this.step;
    },
  },
  methods: {
    navigate(this: any, options: Route): void {
      useRouterStore(this.$pinia).navigate(options);
    },
    getTabName(this: any, tab: TokenTabs): string {
      if (tab === TokenTabs.NonFungibleToken) {
        return this.TranslationConsts.NFT;
      }
      return this.t(`createToken.${tab}`);
    },
    handleChangeTab(this: any, value: Step): void {
      this.step = value;
      this.currentTab = value;
    },
    setTabVisibility(this: any): void {
      this.showTabs = !this.showTabs;
    },
    setHeaderVisibility(this: any): void {
      this.showHeader = !this.showHeader;
    },
    setStep(this: any, step: Step): void {
      if ([Step.CreateSimpleToken, Step.CreateNftToken].includes(step)) this.setTabVisibility();
      if (step === Step.ConfirmSimpleToken) this.createTokenTitle = this.t('createToken.confirmTokenTitleCommon');
      if (step === Step.ConfirmNftToken) this.createTokenTitle = this.t('createToken.confirmTokenTitleNFT');
      this.step = step;
    },
    handleBack(this: any): void {
      if ([Step.CreateSimpleToken, Step.CreateNftToken].includes(this.step)) {
        this.navigate({ name: RouteNames.Wallet });
        return;
      }

      if ([Step.ConfirmSimpleToken, Step.ConfirmNftToken].includes(this.step)) {
        if (this.step === Step.ConfirmSimpleToken) this.step = Step.CreateSimpleToken;
        if (this.step === Step.ConfirmNftToken) this.step = Step.CreateNftToken;
        this.createTokenTitle = this.t('createToken.titleCommon');
      } else if (this.step === Step.Warn) {
        if (this.currentTab === Step.CreateSimpleToken) this.step = Step.CreateSimpleToken;
        if (this.currentTab === Step.CreateNftToken) this.step = Step.CreateNftToken;
      }

      this.showTabs = true;
      this.showHeader = true;
      this.navigate({ name: RouteNames.CreateToken });
    },
  },
});
</script>

<style lang="scss">
.token {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }
}
</style>
