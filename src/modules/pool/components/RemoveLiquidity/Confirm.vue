<template>
  <DialogBase v-model:visible="isVisible" :title="t('removeLiquidity.confirmTitle')" append-to-body>
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <s-icon class="icon-divider" name="plus-16"></s-icon>
        <span class="token-value">{{ formattedToValue }}</span>
      </div>
      <div class="tokens-info-container">
        <div v-if="firstToken" class="token">
          <TokenLogo class="token-logo" :token="firstToken"></TokenLogo>
          {{ firstToken.symbol }}
        </div>
        <div v-if="secondToken" class="token">
          <TokenLogo class="token-logo" :token="secondToken"></TokenLogo>
          {{ secondToken.symbol }}
        </div>
      </div>
    </div>
    <p class="transaction-message">
      {{ t('removeLiquidity.outputMessage', { slippageTolerance: formatStringValue(slippageTolerance) }) }}
    </p>
    <s-divider></s-divider>
    <RemoveLiquidityTransactionDetails></RemoveLiquidityTransactionDetails>
    <template #footer>
      <AccountConfirmationOption with-hint class="confirmation-option"></AccountConfirmationOption>
      <s-button
        type="primary"
        class="s-typography-button--large"
        :loading="props.parentLoading"
        @click="handleConfirmRemoveLiquidity"
      >
        {{ t('confirmText') }}
      </s-button>
    </template>
  </DialogBase>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import { usePoolStore } from '@/stores/pool';
import { useSettingsStore } from '@/stores/settings';

import type { Nullable } from '@/types/common';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useI18n();
const { formatStringValue } = useNumberFormatter();
const poolStore = usePoolStore();
const settingsStore = useSettingsStore();

const firstTokenAmount = computed(() => poolStore.removeLiquidityFirstTokenAmount);
const secondTokenAmount = computed(() => poolStore.removeLiquiditySecondTokenAmount);
const slippageTolerance = computed(() => settingsStore.slippageTolerance as string);

const firstToken = computed<Nullable<Asset>>(() => poolStore.removeLiquidityFirstToken as Nullable<Asset>);
const secondToken = computed<Nullable<Asset>>(() => poolStore.removeLiquiditySecondToken as Nullable<Asset>);

const formattedFromValue = computed(() => formatStringValue(firstTokenAmount.value));
const formattedToValue = computed(() => formatStringValue(secondTokenAmount.value));
const closeDialog = (): void => {
  emit('close');
  isVisible.value = false;
};
const handleConfirmRemoveLiquidity = () => {
  emit('confirm');
  closeDialog();
};

const DialogBase = components.DialogBase;
const TokenLogo = components.TokenLogo;
const AccountConfirmationOption = components.AccountConfirmationOption;
const RemoveLiquidityTransactionDetails = poolLazyComponent(PoolComponents.RemoveLiquidityTransactionDetails);
</script>

<style lang="scss" scoped>
.tokens {
  display: flex;
  justify-content: space-between;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-weight: 800;
  }
}
.token {
  display: flex;
  align-items: center;
  white-space: nowrap;
  justify-content: flex-end;
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.transaction-message {
  margin-top: $inner-spacing-big;
  color: var(--s-color-base-content-primary);
  line-height: var(--s-line-height-base);
}
.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
