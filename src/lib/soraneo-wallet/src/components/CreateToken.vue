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

<script setup lang="ts">
import { computed, ref } from 'vue';

import { navigateWallet, type WalletNavigationTarget } from '@/platform/wallet/navigation';
import { useWalletTranslation } from '../composables/useWalletTranslation';

import { TokenTabs, Step, RouteNames } from '../consts';

import CreateNftToken from './CreateNftToken.vue';
import CreateSimpleToken from './CreateSimpleToken.vue';
import WalletBase from './WalletBase.vue';

const { t, TranslationConsts } = useWalletTranslation();

const step = ref<Step>(Step.CreateSimpleToken);
const currentTab = ref<Step>(Step.CreateSimpleToken);
const showTabs = ref(true);
const showHeader = ref(true);
const createTokenTitle = ref(t('createToken.titleCommon'));

const currentStep = computed(() => step.value);

function navigate(options: WalletNavigationTarget): void {
  navigateWallet(options);
}

function getTabName(tab: TokenTabs): string {
  if (tab === TokenTabs.NonFungibleToken) {
    return TranslationConsts.NFT;
  }
  return t(`createToken.${tab}`);
}

function handleChangeTab(value: Step): void {
  step.value = value;
  currentTab.value = value;
}

function setTabVisibility(): void {
  showTabs.value = !showTabs.value;
}

function setHeaderVisibility(): void {
  showHeader.value = !showHeader.value;
}

function setStep(nextStep: Step): void {
  if ([Step.CreateSimpleToken, Step.CreateNftToken].includes(nextStep)) {
    setTabVisibility();
  }
  if (nextStep === Step.ConfirmSimpleToken) {
    createTokenTitle.value = t('createToken.confirmTokenTitleCommon');
  }
  if (nextStep === Step.ConfirmNftToken) {
    createTokenTitle.value = t('createToken.confirmTokenTitleNFT');
  }
  step.value = nextStep;
}

function handleBack(): void {
  if ([Step.CreateSimpleToken, Step.CreateNftToken].includes(step.value)) {
    navigate({ name: RouteNames.Wallet });
    return;
  }

  if ([Step.ConfirmSimpleToken, Step.ConfirmNftToken].includes(step.value)) {
    if (step.value === Step.ConfirmSimpleToken) step.value = Step.CreateSimpleToken;
    if (step.value === Step.ConfirmNftToken) step.value = Step.CreateNftToken;
    createTokenTitle.value = t('createToken.titleCommon');
  } else if (step.value === Step.Warn) {
    if (currentTab.value === Step.CreateSimpleToken) step.value = Step.CreateSimpleToken;
    if (currentTab.value === Step.CreateNftToken) step.value = Step.CreateNftToken;
  }

  showTabs.value = true;
  showHeader.value = true;
  navigate({ name: RouteNames.CreateToken });
}
</script>

<style lang="scss">
.token {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }
}
</style>
