<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t(`referralProgram.confirm.${isBond ? 'bond' : 'unbond'}`)"
    custom-class="dialog--confirm-bond"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmount }}</span>
        <div class="token">
          <token-logo class="token-logo" :token="xor"></token-logo>
          {{ xorSymbol }}
        </div>
      </div>
    </div>
    <s-divider></s-divider>
    <info-line
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="networkFeeFormatted"
      :asset-symbol="xorSymbol"
      :fiat-value="networkFeeFiat"
      is-formatted
    ></info-line>
    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option"></account-confirmation-option>
      <s-button type="primary" class="s-typography-button--large" @click="handleConfirmBonding">
        {{ t('confirmText') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { Operation, CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@wallet';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { PageNames } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
    AccountConfirmationOption: components.AccountConfirmationOption,
  },
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const { formatStringValue, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
const route = useRoute();

const xor = XOR;

const amount = computed(() => store.state.referrals.amount);
const networkFees = computed<NetworkFeesObject>(() => store.state.wallet.settings.networkFees);

const xorSymbol = XOR.symbol;
const isBond = computed(() => route.name === PageNames.ReferralBonding);

const formattedAmount = computed(() => formatStringValue(amount.value, XOR.decimals));
const networkFee = computed<CodecString>(
  () => networkFees.value[isBond.value ? Operation.ReferralReserveXor : Operation.ReferralUnreserveXor]
);
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const networkFeeFiat = computed(() => getFiatAmountByCodecString(networkFee.value, XOR));

const handleConfirmBonding = () => {
  emit('confirm');
  isVisible.value = false;
};

defineExpose({
  handleConfirmBonding,
  isBond,
  formattedAmount,
  networkFeeFormatted,
  xor,
});
</script>

<style lang="scss" scoped>
.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 800;
  }
}
.token {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  &-value {
    margin-right: $inner-spacing-medium;
  }
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.info-line {
  border-bottom: none;
}
.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
</style>
