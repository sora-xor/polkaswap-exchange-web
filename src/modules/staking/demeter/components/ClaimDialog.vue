<template>
  <dialog-base v-model:visible="isVisible" :title="t('demeterFarming.actions.claim')">
    <div class="claim-dialog">
      <div class="claim-dialog-title">
        <token-logo class="claim-dialog-logo" :token="rewardAsset" size="large"></token-logo>

        <formatted-amount
          value-can-be-hidden
          symbol-as-decimal
          :value="rewardsFormatted"
          :font-size-rate="FontSizeRate.SMALL"
          :asset-symbol="rewardAssetSymbol"
          class="claim-dialog-value"
        ></formatted-amount>
        <formatted-amount
          value-can-be-hidden
          is-fiat-value
          :value="rewardsFiat"
          :font-size-rate="FontSizeRate.MEDIUM"
          class="claim-dialog-value--fiat"
        ></formatted-amount>
      </div>

      <div class="claim-dialog-info">
        <info-line
          :label="t('networkFeeText')"
          :label-tooltip="t('networkFeeTooltipText')"
          :value="networkFeeFormatted"
          :asset-symbol="xorSymbol"
          :fiat-value="getFiatAmountByCodecString(networkFee)"
          is-formatted
        ></info-line>
      </div>

      <s-button
        type="primary"
        class="s-typography-button--large action-button"
        :loading="parentLoading"
        :disabled="isInsufficientXorForFee"
        @click="confirm"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else>
          {{ t('signAndClaimText') }}
        </template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, toRefs, type PropType } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { FontSizeRate } from '@/lib/soraneo-wallet/src/consts';
import { useDemeterPoolCard } from '../composables/useDemeterPoolCard';
import { useDemeterPoolStatus } from '../composables/useDemeterPoolStatus';

import type { DemeterAsset, DemeterPool, DemeterAccountPool } from '../types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { Nullable } from '@/types/common';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
    InfoLine: WalletComponentInfoLine,
    TokenLogo: WalletComponentTokenLogo,
    FormattedAmount: WalletComponentFormattedAmount,
  },
});

const props = defineProps({
  parentLoading: { type: Boolean, default: false },
  liquidity: { type: Object as PropType<Nullable<AccountLiquidity>>, default: null },
  pool: { type: Object as PropType<Nullable<DemeterPool>>, default: null },
  accountPool: { type: Object as PropType<Nullable<DemeterAccountPool>>, default: null },
  poolAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  rewardAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', payload: Nullable<DemeterAccountPool>): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { liquidity, pool, accountPool, poolAsset, rewardAsset } = toRefs(props);

const statusApi = useDemeterPoolStatus({
  liquidity,
  pool,
  accountPool,
  poolAsset,
  rewardAsset,
});
const cardApi = useDemeterPoolCard(statusApi);

const { t } = useTranslation();

const rewardAssetSymbol = computed(() => cardApi.rewardAssetSymbol.value);
const rewardsFormatted = computed(() => cardApi.rewardsFormatted.value);
const rewardsFiat = computed(() => cardApi.rewardsFiat.value);
const networkFee = computed(() => cardApi.networkFee.value);
const networkFeeFormatted = computed(() => cardApi.networkFeeFormatted.value);
const xorSymbol = XOR.symbol;
const isInsufficientXorForFee = computed(() => cardApi.isInsufficientXorForFee.value);
const parentLoading = computed(() => props.parentLoading);

const getFiatAmountByCodecString = statusApi.getFiatAmountByCodecString;

const confirm = () => {
  emit('confirm', statusApi.accountPool.value ?? null);
};
</script>

<style lang="scss" scoped>
.claim-dialog {
  @include full-width-button('action-button');

  & > *:not(:last-child) {
    margin-top: $inner-spacing-medium;
  }

  &-logo {
    margin-bottom: $inner-spacing-mini;
  }

  &-title {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
  }

  &-value {
    font-size: var(--s-font-size-large);
    font-weight: 700;
    line-height: var(--s-line-height-reset);

    &--fiat {
      font-size: var(--s-font-size-big);
      font-weight: 600;
      line-height: var(--s-line-height-small);
    }
  }
}
</style>
