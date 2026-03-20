<template>
  <s-float-input
    class="token-input"
    size="medium"
    ref="floatInput"
    has-locale-string
    :disabled="disabled"
    :value="currentValue"
    :max="maxValue"
    :decimals="decimals"
    :delimiters="delimiters"
    v-bind="$attrs"
    @update:model-value="handleMainInput"
    @focus="handleMainFocus"
  >
    <template #top>
      <div class="input-line">
        <div class="input-title">
          <span class="input-title--uppercase input-title--primary">{{ title }}</span>
          <slot name="title-append"></slot>
        </div>
        <div class="input-value">
          <slot name="balance">
            <template v-if="isBalanceAvailable">
              <span class="input-value--uppercase">{{ balanceText || t('balanceText') }}</span>
              <formatted-amount-with-fiat-value
                value-can-be-hidden
                with-left-shift
                value-class="input-value--primary"
                :value="formattedBalance"
                :has-fiat-value="hasFiatValue"
                :fiat-value="formattedFiatBalance"
              ></formatted-amount-with-fiat-value>
            </template>
          </slot>
        </div>
      </div>
    </template>

    <template #right>
      <div class="s-flex el-buttons">
        <s-button
          v-if="isMaxAvailable"
          class="el-button--max s-typography-button--small"
          type="primary"
          alternative
          size="mini"
          border-radius="mini"
          :loading="loading"
          :disabled="disabled"
          @click.stop="handleMax"
        >
          {{ t('buttons.max') }}
        </s-button>
        <token-select-button
          v-if="token || isSelectAvailable"
          icon="chevron-down-rounded-16"
          :disabled="!isSelectAvailable"
          :token="token"
          @click.stop="handleSelectToken"
        ></token-select-button>
      </div>
    </template>

    <template #bottom>
      <slot name="bottom">
        <div class="input-line input-line--footer">
          <div v-if="hasFiatValue" class="s-flex">
            <s-float-input
              ref="fiatEl"
              class="token-input--fiat"
              size="mini"
              has-locale-string
              :decimals="2"
              :delimiters="$attrs.delimiters"
              :disabled="disabled"
              :max="maxFiatValueFormatted"
              :readonly="!isFiatEditable"
              :value="fiatValue"
              @update:model-value="setFiatValue"
              @focus="handleFiatFocus"
              @blur="handleFiatBlur"
            >
              <template #left>
                <span class="input-prefix">{{ currencySymbol }}</span>
              </template>
            </s-float-input>

            <slot name="fiat-amount-append"></slot>
          </div>

          <token-address
            v-if="withAddress && hasFormattedAddress"
            v-bind="addressData"
            :external="external"
            class="input-value"
          ></token-address>
        </div>

        <div v-if="withSlider" class="input-line--footer-with-slider">
          <div class="delimiter"></div>
          <div class="slider-container-wrapper" @mousedown="handleSlideClick">
            <s-slider
              class="slider-container"
              :value="slideValue"
              :disabled="!withSlider || disabled"
              :show-tooltip="false"
              :marks="{ 0: '', 25: '', 50: '', 75: '', 100: '' }"
              @input="handleSlideInputChange"
            ></s-slider>
          </div>
        </div>
      </slot>

      <slot></slot>
    </template>
  </s-float-input>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { components } from '@wallet';
import { computed, ref, watch } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';
import { useWalletStore } from '@/stores/wallet';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

defineOptions({
  name: 'TokenInput',
  components: {
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    TokenAddress: components.TokenAddress,
  },
});

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    max?: string | number;
    token?: Nullable<RegisteredAccountAsset>;
    balance?: Nullable<CodecString>;
    title?: string;
    balanceText?: string;
    external?: boolean;
    loading?: boolean;
    disabled?: boolean;
    isMaxAvailable?: boolean;
    isSelectAvailable?: boolean;
    withSlider?: boolean;
    isFiatEditable?: boolean;
    sliderValue?: number;
    fiatDecimals?: number;
    withAddress?: boolean;
    withoutFiat?: boolean;
  }>(),
  {
    modelValue: undefined,
    token: null,
    balance: null,
    title: '',
    balanceText: '',
    external: false,
    loading: false,
    disabled: false,
    isMaxAvailable: false,
    isSelectAvailable: false,
    withSlider: false,
    isFiatEditable: true,
    sliderValue: 0,
    fiatDecimals: 2,
    withAddress: false,
    withoutFiat: false,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'max', token: Nullable<RegisteredAccountAsset>): void;
  (event: 'select'): void;
  (event: 'slide', value: string): void;
  (event: 'focus'): void;
}>();

const floatInput = ref<any>(null);
const fiatEl = ref<any>(null);

const fiatValue = ref('');
const fiatFocus = ref(false);

const delimiters = FPNumber.DELIMITERS_CONFIG;

const { t } = useTranslation();
const formattedAmount = useFormattedAmount();

const walletStore = useWalletStore();
const currencySymbol = computed(() => walletStore.currencySymbol ?? '');
const exchangeRate = computed(() => walletStore.exchangeRate ?? 1);
const currency = computed(() => walletStore.currency ?? null);
const currentValue = computed(() => props.modelValue ?? '');

const decimals = computed(() => {
  const token = props.token;
  if (!token) return FPNumber.DEFAULT_PRECISION;

  const tokenDecimals = props.external ? token.externalDecimals : token.decimals;
  return tokenDecimals ?? FPNumber.DEFAULT_PRECISION;
});

const tokenPrice = computed(() => {
  const token = props.token;
  if (!token) return FPNumber.ZERO;

  const price = formattedAmount.getAssetFiatPrice(token);
  return price ? FPNumber.fromCodecValue(price) : FPNumber.ZERO;
});

const hasFiatValue = computed(() => !(props.withoutFiat || tokenPrice.value.isZero()));

const fpBalance = computed(() =>
  formattedAmount.getFPNumberFromCodec(props.balance ?? ZeroStringValue, decimals.value)
);
const formattedBalance = computed(() => fpBalance.value.toLocaleString());
const formattedFiatBalance = computed(() => fpBalance.value.mul(tokenPrice.value).toLocaleString());

const isBalanceAvailable = computed(() => Boolean(props.balance && props.token));

const addressData = computed<Nullable<RegisteredAccountAsset>>(() => {
  if (!props.token) return null;

  return {
    ...props.token,
    address: typeof props.token.address === 'string' ? props.token.address : '',
    externalAddress: typeof props.token.externalAddress === 'string' ? props.token.externalAddress : '',
  };
});

const hasFormattedAddress = computed(() => {
  const target = addressData.value;
  if (!target) return false;

  const address = props.external ? target.externalAddress : target.address;
  return Boolean(address);
});

const maxValue = computed(() => props.max ?? formattedAmount.MaxInputNumber);

const calcFiatAmount = (amount: string | number): FPNumber => {
  if (!amount) return FPNumber.ZERO;
  const tokenRate = tokenPrice.value.mul(exchangeRate.value);
  return new FPNumber(amount).mul(tokenRate);
};

const maxFiatValue = computed(() => calcFiatAmount(maxValue.value));
const maxFiatValueFormatted = computed(() => maxFiatValue.value.toString());

const fiatAmount = computed(() => calcFiatAmount(currentValue.value));

const slideValue = computed(() => props.sliderValue);

const setFiatValue = (value: string): void => {
  fiatValue.value = value === maxFiatValueFormatted.value ? maxFiatValue.value.toFixed(props.fiatDecimals) : value;

  recalcValue(value);
};

const recalcValue = (value: string): void => {
  const result =
    !tokenPrice.value.isZero() && value
      ? new FPNumber(value).div(exchangeRate.value).div(tokenPrice.value).toString()
      : '';

  emit('update:modelValue', result);
};

const handleFiatFocus = (): void => {
  fiatFocus.value = true;
  emit('focus');
};

const handleFiatBlur = (): void => {
  fiatFocus.value = false;
};

const handleMax = (): void => {
  emit('max', props.token ?? null);
};

const handleMainInput = (value: string): void => {
  emit('update:modelValue', value);
};

const handleMainFocus = (): void => {
  emit('focus');
};

const handleSelectToken = (): void => {
  emit('select');
};

const handleSlideInputChange = (value: string): void => {
  emit('slide', value);
};

const handleSlideClick = (): void => {
  fiatEl.value?.$children?.[0]?.blur?.();
};

const focus = (): void => {
  floatInput.value?.inputComponent?.focus?.();
};

defineExpose({
  focus,
});

watch(
  fiatAmount,
  (amount) => {
    if (fiatFocus.value) return;
    fiatValue.value = amount.isZero() ? '' : amount.toFixed(props.fiatDecimals);
  },
  { immediate: true }
);

watch(
  currency,
  () => {
    setFiatValue(fiatValue.value);
  },
  { immediate: true }
);
</script>

<style lang="scss">
$el-input-class: '.el-input';

.s-input.token-input {
  // New soramitsu-ui input root became a flex column with `row-gap: 16px`,
  // which inflates token input height (131px vs 99px on polkaswap.io mobile).
  // Keep it gapless so top/content/bottom stack matches live proportions.
  row-gap: 0;

  // Keep swap token input compact even with the newer soramitsu-ui DOM that wraps
  // footer content into `.s-input__bottom` and adds extra vertical space by default.
  & > .s-input__bottom {
    min-height: 0;
    height: auto;
    padding: 0;
    display: block;
    width: 100%;
    gap: 0;
  }

  & > .s-input__content {
    padding-left: 0;
    padding-right: 0;
    gap: 0;

    #{$el-input-class} {
      #{$el-input-class}__inner {
        padding-top: 0;
      }
    }
    #{$el-input-class}__inner {
      height: var(--s-size-small);
      padding-right: 0;
      padding-left: 0;
      border-radius: 0 !important;
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-large);
      letter-spacing: -0.48px;
      line-height: var(--s-line-height-small);
      font-weight: 800;

      @include text-ellipsis;
    }
    .s-placeholder {
      display: none;
    }
  }

  &--fiat {
    padding: 0 !important;
    min-height: auto !important;
    height: 21px;
    box-shadow: none !important;
    border-radius: 0;

    & > .s-input__content {
      color: var(--s-color-fiat-value);
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
      font-size: var(--s-font-size-small);
      font-weight: 400;

      .input-prefix {
        padding-right: calc(var(--s-basic-spacing) / 4);
        color: inherit;
      }

      .s-input__left {
        color: inherit;
      }

      #{$el-input-class}__inner {
        color: inherit;
        font-size: inherit !important;
        line-height: inherit !important;
        letter-spacing: inherit;
      }
    }

    &:focus,
    &:focus-within {
      outline: none;
    }
  }
}

.input-line--footer-with-slider {
  width: 100%;

  @include input-slider;

  .el-slider__button {
    background-color: #fff;
    border-radius: 4px;
    transform: rotate(-45deg);
  }

  .el-slider__stop {
    height: 10px;
    width: 10px;
    border-radius: 2px;
    top: -1.8px;
    border: 1.3px solid var(--s-color-base-content-tertiary);
    transform: translateX(-50%) rotate(-45deg);
  }

  .asset-info {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  .delimiter {
    background-color: var(--s-color-base-border-secondary);
    width: 100%;
    height: 1px;
    margin: 14px 0 4px 0;
  }

  .slider-container-wrapper {
    width: 100%;
  }
}
</style>

<style lang="scss" scoped>
.token-input {
  @include buttons;
}
</style>
