<template>
  <dialog-base v-model:visible="isVisible" :title="title" custom-class="dialog--confirm-burn">
    <token-input
      class="token-input"
      :max="max"
      :title="receivedPlaceholder"
      :is-fiat-editable="false"
      :token="receivedAsset"
      :model-value="value"
      @update:model-value="handleInputField"
    ></token-input>
    <info-line
      :label="toBeBurnedLabel"
      :key="toBeBurnedKey"
      :value="formattedWillBeBurned"
      :asset-symbol="burnedAsset.symbol"
      :fiat-value="formattedFiatWillBeBurned"
      is-formatted
    ></info-line>
    <info-line
      :label="yourBalanceLeftLabel"
      :key="yourBalanceLeftKey"
      :value="formattedTokensLeft"
      :asset-symbol="burnedAsset.symbol"
      :fiat-value="formattedFiatTokensLeft"
      is-formatted
      value-can-be-hidden
    ></info-line>
    <info-line
      v-if="isLoggedIn"
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="networkFeeFormatted"
      :asset-symbol="xor.symbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    ></info-line>
    <div class="disclaimer s-flex">
      <p class="disclaimer__text p3">
        Disclaimer: Burning your {{ burnedAsset.symbol }} tokens is an irreversible action that permanently removes them
        from your wallet. Please proceed with caution and ensure you fully understand the implications of this
        transaction
      </p>
      <div class="disclaimer__badge s-flex">
        <s-icon class="disclaimer__icon" name="notifications-alert-triangle-24" size="24"></s-icon>
      </div>
    </div>
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="isBurnDisabled" @click="handleConfirmBurn">
        <template v-if="isZeroAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isAmountLessThanMin">NEED TO RESERVE MORE THAN {{ min }}</template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: burnedAsset.symbol }) }}
        </template>
        <template v-else>RESERVE</template>
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts" setup>
import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api, components } from '@wallet';
import { computed, getCurrentInstance, nextTick, ref, toRefs, watch } from 'vue';

import { Components, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import store from '@/store';
import { asZeroValue } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenInput: lazyComponent(Components.TokenInput),
  },
});

const props = withDefaults(
  defineProps<{
    receivedAsset: Asset;
    burnedAsset: Asset;
    rate?: string;
    max?: number;
    min?: number;
  }>(),
  {
    rate: '0.01',
    max: 100_000_000,
    min: 1,
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', success?: boolean): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const { loading, withNotifications } = useTransaction();
const {
  Zero,
  getFPNumber,
  getFPNumberFromCodec,
  formatCodecNumber,
  getFiatAmountByFPNumber,
  getFiatAmountByCodecString,
} = useFormattedAmount();

const { max, min, receivedAsset, burnedAsset, rate } = toRefs(props);

const value = ref('');
const xor = XOR;

const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => store.getters.assets.xor as Nullable<AccountAsset>);
const isLoggedIn = computed(() => Boolean(store.getters.wallet.account.isLoggedIn));

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.Burn] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value, burnedAsset.value.decimals));
const xorBalance = computed(() =>
  getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue, burnedAsset.value.decimals)
);

const willBeBurned = computed(() => getFPNumber(value.value || ZeroStringValue).mul(rate.value));
const tokensLeft = computed(() => {
  const diff = xorBalance.value.sub(willBeBurned.value);
  return diff.isLtZero() ? Zero : diff;
});

const title = computed(() => `Reserve ${receivedAsset.value.symbol} token`);
const receivedPlaceholder = computed(() => `HOW MUCH ${receivedAsset.value.symbol} DO YOU WANT?`);

const getKey = (key: string) => (isVisible.value ? `${key}-opened` : `${key}-closed`);

const toBeBurnedLabel = computed(() => `${burnedAsset.value.symbol} TO BE BURNED`);
const toBeBurnedKey = computed(() => getKey(`${burnedAsset.value.symbol}-burned`));
const yourBalanceLeftLabel = computed(() => `YOUR ${burnedAsset.value.symbol} BALANCE LEFT`);
const yourBalanceLeftKey = computed(() => getKey(`${burnedAsset.value.symbol}-left`));

const formattedWillBeBurned = computed(() => willBeBurned.value.toLocaleString());
const formattedFiatWillBeBurned = computed(() => getFiatAmountByFPNumber(willBeBurned.value, burnedAsset.value));

const formattedTokensLeft = computed(() => tokensLeft.value.toLocaleString());
const formattedFiatTokensLeft = computed(() => getFiatAmountByFPNumber(tokensLeft.value, burnedAsset.value));

const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value, burnedAsset.value.decimals));

const isZeroAmount = computed(() => asZeroValue(value.value));
const isAmountLessThanMin = computed(() => Number(value.value || ZeroStringValue) < min.value);
const isInsufficientBalance = computed(() =>
  xorBalance.value.sub(willBeBurned.value).sub(fpNetworkFee.value).isLtZero()
);
const isBurnDisabled = computed(
  () => loading.value || isZeroAmount.value || isAmountLessThanMin.value || isInsufficientBalance.value
);

const instance = getCurrentInstance();

function handleInputField(newValue: string): void {
  if (value.value === newValue) return;
  value.value = newValue;
}

async function handleConfirmBurn(): Promise<void> {
  if (isInsufficientBalance.value) {
    instance?.proxy?.$alert?.(t('insufficientBalanceText', { tokenSymbol: burnedAsset.value.symbol }), {
      title: t('errorText'),
    });
    emit('confirm');
  } else {
    try {
      await withNotifications(async () => {
        await api.assets.burn(burnedAsset.value, willBeBurned.value.toString());
      });
      emit('confirm', true);
    } catch (error) {
      console.error(error);
      emit('confirm');
    }
  }

  isVisible.value = false;
}

watch(isVisible, async (dialogVisible) => {
  await nextTick();
  if (dialogVisible) {
    value.value = '';
  }
});
</script>

<style lang="scss" scoped>
.token-input {
  margin-bottom: $basic-spacing;
}
.disclaimer {
  align-items: flex-start;
  margin-top: $basic-spacing;
  padding: $inner-spacing-medium;
  width: 100%;
  background-color: var(--s-color-base-background);
  border-radius: var(--s-border-radius-small);
  box-shadow: var(--s-shadow-dialog);
  &__text {
    flex: 1;
  }
  &__badge {
    border-radius: 50%;
    background-color: var(--s-color-status-error);
    box-shadow: var(--s-shadow-element-pressed);
    margin-left: $inner-spacing-mini;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
  }
  &__icon {
    color: white;
  }
}
</style>
