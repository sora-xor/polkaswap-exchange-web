<template>
  <div class="sora-card sora-card-payment">
    <div class="sora-card__threshold">
      <token-logo :token="xor" :size="WALLET_CONSTS.LogoSize.LARGE"></token-logo>
      <h3 class="sora-card__threshold-title">{{ title }}</h3>
      <balance-indicator></balance-indicator>
    </div>
    <div class="sora-card__options--not-enough-euro s-flex">
      <s-button
        v-for="item in buyOptions"
        class="sora-card__btn sora-card__btn--buy s-typography-button--large"
        :key="item.type"
        :type="item.button"
        :loading="btnLoading"
        @click="buyTokens(item.type)"
      >
        <span class="text">{{ t(item.text) }}</span>
      </s-button>
    </div>
    <div class="delimiter">{{ t('card.or') }}</div>
    <div class="sora-card__application-fee-disclaimer">
      <p>{{ applicationFeeText }}</p>
      <p>{{ t('card.oneTimeApplicationFee') }}</p>
      <p>{{ t('card.applicationFeeNote') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WALLET_CONSTS, components } from '@wallet';
import { computed, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import router, { lazyComponent } from '@/router';
import store from '@/store';
import { PageNames } from '@/consts';

import type { FPNumber } from '@sora-substrate/math';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Fees } from '@/types/card';

enum BuyButtonType {
  Bridge,
  Paywings,
}

type BuyButton = { type: BuyButtonType; text: string; button: 'primary' | 'secondary' | 'tertiary' };

const BalanceIndicator = lazyComponent('SoraCardBalanceIndicator');

defineOptions({
  name: 'SoraCardPayment',
  components: {
    TokenLogo: components.TokenLogo,
  },
});

const emit = defineEmits<{
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();

const xorToDeposit = computed<FPNumber>(() => store.state.soraCard.xorToDeposit as FPNumber);
const wasEuroBalanceLoaded = computed<boolean>(() => store.state.soraCard.wasEuroBalanceLoaded as boolean);
const fees = computed<Fees>(() => store.state.soraCard.fees as Fees);
const isEuroBalanceEnough = computed<boolean>(() => Boolean(store.getters.soraCard?.isEuroBalanceEnough));
const isLoggedIn = computed<boolean>(() => Boolean(store.getters.wallet?.account?.isLoggedIn));
const xor = computed<Nullable<AccountAsset>>(() => store.getters.assets?.xor as Nullable<AccountAsset>);

watch(
  isEuroBalanceEnough,
  (enough) => {
    if (enough) emit('confirm');
  },
  { immediate: true }
);

const buyOptions = computed<Array<BuyButton>>(() => [
  { type: BuyButtonType.Bridge, text: 'card.bridgeTokensBtn', button: 'primary' },
]);

const title = computed(() => t('card.xorAmountNeededTitle', { value: xorToDeposit.value.format(3) }));

const btnLoading = computed(() => {
  if (!isLoggedIn.value) return false;
  return !wasEuroBalanceLoaded.value;
});

const applicationFee = computed<Nullable<string>>(() => fees.value.application);
const applicationFeeText = computed(() => t('card.applicationFee', { 0: applicationFee.value }));

const bridgeTokens = () => {
  if (!isEuroBalanceEnough.value) {
    router.push({ name: PageNames.Bridge, params: { amount: xorToDeposit.value.toString() } });
  }
};

const buyTokens = (type: BuyButtonType) => {
  if (type === BuyButtonType.Bridge) bridgeTokens();
};
</script>

<style lang="scss">
.sora-card {
  &__threshold {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .logo {
      margin-top: calc(var(--s-size-small) * -1);
      margin-bottom: $inner-spacing-big;
    }

    &-title {
      text-transform: none;
      margin: 0 80px;
      text-align: center;
      margin-bottom: $inner-spacing-big;
    }
  }
  &__application-fee-disclaimer {
    background-color: var(--s-color-base-border-primary);
    padding: 16px;
    margin-top: var(--s-basic-spacing);
    border-radius: calc(var(--s-border-radius-mini) / 2);
    width: 100%;

    p:nth-child(1) {
      font-size: var(--s-font-size-big);
      margin-bottom: 4px;
      font-weight: 500;
    }
    p:nth-child(2) {
      font-size: var(--s-font-size-small);
      margin-bottom: 4px;
    }
    p:nth-child(3) {
      font-size: var(--s-font-size-small);
      color: #efac47;
    }
  }
  &__btn {
    width: 100%;
    &--buy {
      margin-top: var(--s-size-mini);
      .text {
        font-size: var(--s-heading4-font-size);
      }
    }
  }

  &-payment {
    .delimiter {
      display: flex;
      flex-direction: row;
      color: var(--s-color-base-content-secondary);
      text-transform: uppercase;
      margin-top: $basic-spacing;
      margin-bottom: $basic-spacing;
    }
    .delimiter::before,
    .delimiter::after {
      content: '';
      flex: 1 1;
      border-bottom: 2px solid var(--s-color-base-border-primary);
      margin: auto;
    }
  }
}
</style>
