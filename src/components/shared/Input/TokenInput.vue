<template>
  <s-float-input
    class="token-input"
    size="medium"
    ref="floatInput"
    has-locale-string
    format-on-blur
    inputmode="decimal"
    autocomplete="off"
    :aria-label="amountLabel"
    :aria-describedby="showExactAmount ? exactAmountId : undefined"
    :title="formattedExactAmount"
    :disabled="disabled"
    :value="currentValue"
    :max="maxValue"
    :decimals="decimals"
    :delimiters="delimiters"
    v-bind="$attrs"
    @update:model-value="handleMainInput"
    @focus="handleMainFocus"
    @blur="measureAmountAfterRender"
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
      <div v-if="showExactAmount" :id="exactAmountId" class="token-input__exact-amount">
        <span>{{ t('amountInput.exactAmount') }}</span>
        <span>{{ formattedExactAmount }} {{ token?.symbol }}</span>
      </div>
      <slot name="bottom">
        <div class="input-line input-line--footer">
          <div v-if="hasFiatValue || hasFiatAmountAppend" class="s-flex">
            <s-float-input
              v-if="hasFiatValue"
              ref="fiatEl"
              class="token-input--fiat"
              size="mini"
              has-locale-string
              format-on-blur
              inputmode="decimal"
              autocomplete="off"
              :aria-label="fiatAmountLabel"
              :decimals="fiatInputDecimals"
              :delimiters="$attrs.delimiters"
              :disabled="disabled"
              :max="maxFiatValueFormatted"
              :readonly="!isFiatEditable"
              :value="fiatDisplayValue"
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
import { useResizeObserver } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useSlots, watch } from 'vue';

import TokenSelectButton from '@/components/shared/Input/TokenSelectButton.vue';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { ZeroStringValue } from '@/consts';
import { useWalletStore } from '@/stores/wallet';
import { formatDecimalDisplay } from '@/lib/soramitsu-ui/components/Input/amountDisplay';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';
import type SFloatInput from '@/lib/soramitsu-ui/components/Input/SFloatInput.vue';
import WalletFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletFormattedAmountWithFiatValue from '@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue';
import WalletTokenAddress from '@/lib/soraneo-wallet/src/components/TokenAddress.vue';

defineOptions({
  name: 'TokenInput',
  components: {
    TokenSelectButton,
    FormattedAmount: WalletFormattedAmount,
    FormattedAmountWithFiatValue: WalletFormattedAmountWithFiatValue,
    TokenAddress: WalletTokenAddress,
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
    /** Fiat display precision while blurred; editing retains the token's canonical precision. */
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

const floatInput = ref<InstanceType<typeof SFloatInput> | null>(null);
const fiatEl = ref<any>(null);

const fiatValue = ref('');
const fiatFocus = ref(false);
const slots = useSlots();

const delimiters = FPNumber.DELIMITERS_CONFIG;

const { t } = useTranslation();
const formattedAmount = useFormattedAmount();

const walletStore = useWalletStore();
const currencySymbol = computed(() => walletStore.currencySymbol ?? '');
const exchangeRate = computed(() => walletStore.exchangeRate ?? 1);
const currency = computed(() => walletStore.currency ?? null);
const currentValue = computed(() => props.modelValue ?? '');
const exactAmountId = `token-amount-${useId()}`;
const amountLabel = computed(() =>
  t('amountInput.label', { field: props.title || t('amountInput.amount'), token: props.token?.symbol ?? '' })
);
const fiatAmountLabel = computed(() =>
  t('amountInput.fiatLabel', { field: props.title || t('amountInput.amount'), currency: currency.value ?? '' })
);
const formattedExactAmount = computed(() =>
  formatDecimalDisplay(currentValue.value, delimiters.decimal, delimiters.thousand)
);
const nativeAmountInput = computed(() => floatInput.value?.inputElementRef ?? null);
const showExactAmount = ref(false);
let mounted = false;
let observedFonts: FontFaceSet | undefined;

/** Repeat the exact value only when the native amount field cannot display all of it. */
const measureAmountOverflow = (): void => {
  if (!mounted) return;
  const input = nativeAmountInput.value;
  showExactAmount.value = Boolean(input?.value && input.clientWidth > 0 && input.scrollWidth > input.clientWidth);
};

/** Focus and blur change grouping in SFloatInput on the next render. */
const measureAmountAfterRender = (): void => {
  void nextTick(measureAmountOverflow);
};

watch([currentValue, nativeAmountInput], measureAmountOverflow, { flush: 'post' });
useResizeObserver(nativeAmountInput, measureAmountOverflow);

onMounted(() => {
  mounted = true;
  measureAmountOverflow();
  observedFonts = document.fonts;
  void observedFonts?.ready.then(measureAmountOverflow);
  observedFonts?.addEventListener('loadingdone', measureAmountOverflow);
});

onBeforeUnmount(() => {
  mounted = false;
  observedFonts?.removeEventListener('loadingdone', measureAmountOverflow);
});

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
const hasFiatAmountAppend = computed(() => Boolean(slots['fiat-amount-append']));

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

const fiatInputDecimals = computed(() => Math.max(decimals.value, props.fiatDecimals));
/** Display rounding never replaces the canonical fiat string used for editing or conversion. */
const fiatDisplayValue = computed(() => {
  if (fiatFocus.value || !fiatValue.value) return fiatValue.value;
  return new FPNumber(fiatValue.value).toFixed(props.fiatDecimals);
});

const slideValue = computed(() => props.sliderValue);

const setFiatValue = (value: string): void => {
  fiatValue.value = value;

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
  measureAmountAfterRender();
};

const handleMainFocus = (): void => {
  emit('focus');
  measureAmountAfterRender();
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

/** Selects the editable amount after focus removes its display grouping. */
const focusAndSelect = async (): Promise<void> => {
  const input = nativeAmountInput.value;
  if (!input || props.disabled) return;
  focus();
  await nextTick();
  if (nativeAmountInput.value === input && input.ownerDocument.activeElement === input) {
    input.select();
  }
};

defineExpose({
  focus,
  focusAndSelect,
});

watch(
  fiatAmount,
  (amount) => {
    if (fiatFocus.value) return;
    fiatValue.value = amount.isZero() ? '' : amount.toString();
  },
  { immediate: true }
);

// A display-currency change must not reinterpret or clear a canonical token draft.
watch(currency, () => {
  if (fiatFocus.value) setFiatValue(fiatValue.value);
});
</script>

<style lang="scss">
$el-input-class: '.el-input';

.s-input.token-input {
  // Keep keyboard focus on the recessed panel, including its fiat editor.
  transition: box-shadow 160ms ease-out;

  &:has(input.el-input__inner:focus-visible) {
    outline: none;
    box-shadow:
      var(--s-shadow-element),
      inset 0 0 0 2px var(--s-color-focus-ring);
    box-shadow:
      var(--s-shadow-element),
      inset 0 0 0 2px var(--s-color-focus-ring),
      0 0 0 4px color-mix(in srgb, var(--s-color-focus-ring) 18%, transparent);
  }

  input.el-input__inner:focus-visible {
    outline: none !important;
    outline-offset: 0 !important;
  }

  @media (forced-colors: active) {
    &:has(input.el-input__inner:focus-visible) {
      outline: 2px solid Highlight;
      outline-offset: 2px;
    }
  }

  // New soramitsu-ui input root became a flex column with `row-gap: 16px`,
  // which inflates token input height (131px vs 99px on polkaswap.io mobile).
  // Keep it gapless so top/content/bottom stack matches live proportions.
  row-gap: 0;

  // New soramitsu-ui wraps the header content with `.s-input__top`, which can
  // shrink the `From/Balance` row to its intrinsic width. Force the wrapper and
  // row to span the full token input width like live polkaswap.io.
  & > .s-input__top {
    display: block;
    width: 100%;
  }

  .input-line {
    width: 100%;
  }

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
    gap: 12px;

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

      text-overflow: clip;
    }
    .s-placeholder {
      display: none;
    }
  }

  .token-input__exact-amount {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 0;
    font-size: var(--s-font-size-mini);
    line-height: 1.5;
    color: var(--s-color-base-content-secondary);

    span:last-child {
      color: var(--s-color-base-content-primary);
      overflow-wrap: anywhere;
      user-select: text;
    }
  }

  @media (max-width: 640px) {
    & > .s-input__content {
      flex-direction: column-reverse;
      align-items: stretch;
      gap: 8px;

      & > .s-input__right {
        justify-content: flex-end;
      }
    }
  }

  &--fiat {
    padding: 0 !important;
    min-height: auto !important;
    height: 21px;
    box-shadow: none !important;
    border-radius: 0;
    border: 0;
    color: var(--s-color-fiat-value);

    & > .s-input__content {
      color: inherit;
      gap: 0;
      padding-left: 0;
      padding-right: 0;
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

      #{$el-input-class}__inner::placeholder {
        color: inherit;
      }
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
