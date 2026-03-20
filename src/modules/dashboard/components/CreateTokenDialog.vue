<template>
  <DialogBase :title="t('createToken.titleCommon')" v-model:visible="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-create">
      <s-tabs class="token__tab" type="rounded" :value="currentTab" @update:model-value="handleChangeTab">
        <s-tab v-for="tab in TokenTabs" :key="tab" :label="getTabName(tab)" :name="tab"></s-tab>
      </s-tabs>
      <component :is="currentTab"></component>
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-create__button"
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
import { components, WALLET_CONSTS } from '@wallet';
import { computed, ref } from 'vue';

import { Components, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { DashboardComponents } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';
import store from '@/store';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { WALLET_CONSTS as WalletConstsTypes } from '@wallet/core';

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const CreateSimpleToken = dashboardLazyComponent(DashboardComponents.CreateSimpleToken);
const CreateNftToken = dashboardLazyComponent(DashboardComponents.CreateNftToken);

const TokenTabs = WALLET_CONSTS.TokenTabs;

const { t, TranslationConsts } = useTranslation();
const { loading } = useTransaction();
const { getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();

const isVisible = defineModel<boolean>('visible', { default: false });
const currentTab = ref<WalletConstsTypes.TokenTabs>(TokenTabs.Token);

const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => store.getters.assets.xor as Nullable<AccountAsset>);

const xorSymbol = XOR.symbol;
const title = computed(() => 'Create token');

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.RegisterAsset] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));

const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
const disabled = computed(() => loading.value || isInsufficientXorForFee.value);

const getTabName = (tab: WalletConstsTypes.TokenTabs): string => {
  if (tab === TokenTabs.NonFungibleToken) {
    return TranslationConsts.NFT;
  }
  return t(`createToken.${tab}`);
};

const handleChangeTab = (value: WalletConstsTypes.TokenTabs) => {
  currentTab.value = value;
};

const handleCreate = () => {
  // Logic handled by tab content components; keep placeholder for future integration.
};

defineExpose({
  isVisible,
  currentTab,
  disabled,
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
