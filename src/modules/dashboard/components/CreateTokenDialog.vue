<template>
  <DialogBase :title="t('createToken.titleCommon')" v-model:visible="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-create">
      <s-tabs class="token__tab" type="rounded" :value="currentTab" @update:model-value="handleChangeTab">
        <s-tab v-for="tab in TokenTabs" :key="tab" :label="getTabName(tab)" :name="tab"></s-tab>
      </s-tabs>
      <component :is="currentTabComponent" ref="currentForm" :loading="isLoading"></component>
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-create__button"
        :loading="isLoading"
        :disabled="disabled"
        @click="handleCreate"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else>{{ title }}</template>
      </s-button>
      <InfoLine
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      ></InfoLine>
    </div>
  </DialogBase>
</template>

<script lang="ts" setup>
import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, nextTick, ref, unref, watch } from 'vue';

import CreateNftToken from '@/modules/dashboard/components/CreateNftToken.vue';
import CreateSimpleToken from '@/modules/dashboard/components/CreateSimpleToken.vue';
import { TokenTabs, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Component, Ref } from 'vue';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

const DialogBase = WalletComponentDialogBase;
const InfoLine = WalletComponentInfoLine;

type MaybeRef<T> = T | Ref<T>;

type CreateAssetFormExpose = {
  isCreateDisabled?: MaybeRef<boolean>;
  buttonTitle?: MaybeRef<string>;
  registerAsset?: () => Promise<void>;
  resetForm?: () => void;
};

const { t, TranslationConsts } = useTranslation();
const { loading, withNotifications } = useTransaction();
const { getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
const settingsStore = useSettingsStore();
const assetsStore = useAssetsStore();

const isVisible = defineModel<boolean>('visible', { default: false });
const currentTab = ref<TokenTabs>(TokenTabs.Token);
const currentForm = ref<CreateAssetFormExpose | null>(null);

const tabComponents: Record<TokenTabs, Component> = {
  [TokenTabs.Token]: CreateSimpleToken,
  [TokenTabs.NonFungibleToken]: CreateNftToken,
};

const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => assetsStore.xor as Nullable<AccountAsset>);

const xorSymbol = XOR.symbol;
const title = computed(() => unref(currentForm.value?.buttonTitle ?? t('createTokenText')));
const currentTabComponent = computed(() => tabComponents[currentTab.value]);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.RegisterAsset] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));

const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const isLoading = computed(() => Boolean(loading.value));
const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
const isFormDisabled = computed(() => Boolean(unref(currentForm.value?.isCreateDisabled ?? true)));
const disabled = computed(() => isLoading.value || isInsufficientXorForFee.value || isFormDisabled.value);

const getTabName = (tab: TokenTabs): string => {
  if (tab === TokenTabs.NonFungibleToken) {
    return TranslationConsts.NFT;
  }
  return t(`createToken.${tab}`);
};

const handleChangeTab = (value: TokenTabs) => {
  currentTab.value = value;
};

/**
 * Submits the currently selected asset form through the shared transaction notification flow.
 */
const handleCreate = async () => {
  if (disabled.value || !currentForm.value?.registerAsset) return;

  try {
    await withNotifications(async () => {
      await currentForm.value?.registerAsset?.();
    });
    isVisible.value = false;
  } catch (error) {
    console.error(error);
  }
};

watch(isVisible, async (visible) => {
  if (!visible) return;

  currentTab.value = TokenTabs.Token;
  await nextTick();
  currentForm.value?.resetForm?.();
});

defineExpose({
  isVisible,
  currentTab,
  currentTabComponent,
  disabled,
  isLoading,
  isFormDisabled,
  isInsufficientXorForFee,
  handleChangeTab,
  handleCreate,
});
</script>

<style lang="scss" scoped>
.dashboard-create {
  @include full-width-button('action-button');

  &__button {
    margin-bottom: 16px;
  }
}
</style>
