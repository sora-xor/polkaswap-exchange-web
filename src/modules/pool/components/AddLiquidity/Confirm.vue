<template>
  <dialog-base
    v-model:visible="isVisible"
    :title="t('confirmSupply.title')"
    v-if="firstToken && secondToken"
    append-to-body
  >
    <div class="pool-tokens-amount">{{ shareOfPool }}%</div>
    <s-row v-if="firstToken && secondToken" flex align="middle" class="pool-tokens">
      <pair-token-logo :first-token="firstToken" :second-token="secondToken" size="small"></pair-token-logo>
      {{ t('createPair.firstSecondPoolTokens', { first: firstToken.symbol, second: secondToken.symbol }) }}
    </s-row>
    <div class="output-description">
      {{ t('confirmSupply.outputDescription', { slippageTolerance: formattedSlippageTolerance }) }}
    </div>
    <s-divider></s-divider>
    <info-line
      :label="`${firstToken.symbol} ${t('createPair.deposit')}`"
      :value="formattedFirstTokenValue"
      :fiat-value="fiatFirstAmount"
      is-formatted
    >
      <template #info-line-prefix>
        <token-logo class="token-logo" :token="firstToken" size="small"></token-logo>
      </template>
    </info-line>
    <info-line
      :label="`${secondToken.symbol} ${t('createPair.deposit')}`"
      :value="formattedSecondTokenValue"
      :fiat-value="fiatSecondAmount"
      is-formatted
    >
      <template #info-line-prefix>
        <token-logo class="token-logo" :token="secondToken" size="small"></token-logo>
      </template>
    </info-line>
    <info-line
      :label="t('priceText')"
      :value="`1 ${firstToken.symbol} = ${formattedPriceReversed}`"
      :asset-symbol="secondToken.symbol"
    ></info-line>
    <info-line :value="`1 ${secondToken.symbol} = ${formattedPrice}`" :asset-symbol="firstToken.symbol"></info-line>
    <info-line v-if="strategicBonusApy" :label="t('pool.strategicBonusApy')" :value="strategicBonusApy"></info-line>
    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option"></account-confirmation-option>
      <s-button
        type="primary"
        class="s-typography-button--large"
        :loading="parentLoading"
        :disabled="!!insufficientBalanceTokenSymbol"
        @click="handleConfirm"
      >
        <template v-if="insufficientBalanceTokenSymbol">
          {{ t('insufficientBalanceText', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { components } from '@wallet';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { usePoolApy } from '@/modules/pool/composables/usePoolApy';
import { lazyComponent } from '@/router';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

type Props = {
  shareOfPool?: string;
  firstToken: Nullable<AccountAsset>;
  secondToken: Nullable<AccountAsset>;
  firstTokenValue?: string;
  secondTokenValue?: string;
  price?: string;
  priceReversed?: string;
  slippageTolerance?: string;
  insufficientBalanceTokenSymbol?: string;
  parentLoading?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  shareOfPool: '100',
  firstTokenValue: '',
  secondTokenValue: '',
  price: '0',
  priceReversed: '0',
  slippageTolerance: '0',
  insufficientBalanceTokenSymbol: '',
  parentLoading: false,
});

const emit = defineEmits<{
  (event: 'confirm'): void;
  (event: 'close'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const { formatStringValue, getFiatAmount, getFPNumberFromCodec, Hundred } = useFormattedAmount();
const { getPoolApy } = usePoolApy();

const shareOfPool = toRef(props, 'shareOfPool');
const firstToken = toRef(props, 'firstToken');
const secondToken = toRef(props, 'secondToken');
const firstTokenValue = toRef(props, 'firstTokenValue');
const secondTokenValue = toRef(props, 'secondTokenValue');
const price = toRef(props, 'price');
const priceReversed = toRef(props, 'priceReversed');
const slippageTolerance = toRef(props, 'slippageTolerance');
const insufficientBalanceTokenSymbol = toRef(props, 'insufficientBalanceTokenSymbol');
const parentLoading = toRef(props, 'parentLoading');

const formattedFirstTokenValue = computed(() =>
  firstToken.value ? formatStringValue(firstTokenValue.value, firstToken.value.decimals) : '0'
);

const formattedSecondTokenValue = computed(() =>
  secondToken.value ? formatStringValue(secondTokenValue.value, secondToken.value.decimals) : '0'
);

const fiatFirstAmount = computed(() =>
  firstToken.value ? getFiatAmount(firstTokenValue.value, firstToken.value) : null
);

const fiatSecondAmount = computed(() =>
  secondToken.value ? getFiatAmount(secondTokenValue.value, secondToken.value) : null
);

const formattedPrice = computed(() => formatStringValue(price.value));
const formattedPriceReversed = computed(() => formatStringValue(priceReversed.value));
const formattedSlippageTolerance = computed(() => formatStringValue(slippageTolerance.value));

const strategicBonusApy = computed(() => {
  const apy = getPoolApy(firstToken.value?.address ?? null, secondToken.value?.address ?? null);
  if (!apy) return null;
  return `${getFPNumberFromCodec(apy).mul(Hundred).toLocaleString()}%`;
});

const closeDialog = (): void => {
  emit('close');
  isVisible.value = false;
};

const handleConfirm = () => {
  emit('confirm');
  closeDialog();
};

const DialogBase = components.DialogBase;
const TokenLogo = components.TokenLogo;
const InfoLine = components.InfoLine;
const AccountConfirmationOption = components.AccountConfirmationOption;
const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
</script>

<style lang="scss" scoped>
.tokens {
  line-height: var(--s-line-height-big);
  .token {
    &-logo {
      display: inline-block;
      margin-right: $inner-spacing-mini;
    }
  }
  > .s-row:first-child {
    margin-bottom: $inner-spacing-mini;
  }
}

.tokens,
.pair-info {
  padding-left: $inner-spacing-mini;
  padding-right: $inner-spacing-mini;
}

.output-description {
  margin-top: $inner-spacing-mini;
  margin-bottom: $inner-spacing-mini;
  font-size: var(--s-font-size-mini);
  line-height: var(--s-line-height-big);
  text-align: center;
  max-width: 300px;
  margin: auto;
}

.pair-info {
  line-height: var(--s-line-height-big);
  color: var(--s-color-base-content-secondary);
  margin-top: $inner-spacing-big;
  &__line {
    margin-top: $inner-spacing-mini;
  }
}

.price {
  text-align: right;
  div:last-child {
    margin-top: $inner-spacing-mini;
  }
}

.supply-info {
  display: flex;
  justify-content: space-between;
}

.pool-tokens-amount {
  font-size: var(--s-heading1-font-size);
  font-weight: var(--s-heading1-font-weight);
  text-align: center;
  margin-bottom: $inner-spacing-mini;
}

.pool-tokens {
  justify-content: center;
  margin-bottom: $inner-spacing-big;
}

.confirmation-option {
  margin-bottom: $inner-spacing-mini;
}
</style>
