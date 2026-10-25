<template>
  <s-card :class="['demeter-pool-card', { border }]">
    <pool-info>
      <template #prepend>
        <div class="demeter-pool-card-status">
          <s-icon
            v-if="hasStake"
            name="basic-placeholder-24"
            size="12"
            :class="['demeter-pool-card-status-icon', { active: activeStatus }]"
          ></s-icon>
          <span class="demeter-pool-card-status-title">{{ title }}</span>
        </div>
      </template>

      <info-line
        v-if="isLoggedIn && showBalance"
        value-can-be-hidden
        :label="t('demeterFarming.info.owned', { symbol: poolAssetSymbol })"
        :value="poolAssetBalanceFormatted"
        :fiat-value="poolAssetBalanceFiat"
      ></info-line>
      <info-line v-if="pricesAvailable" :value="apr">
        <template #info-line-prefix>
          <div class="apr">
            <span class="apr-label">{{ TranslationConsts.APR }}</span>
            <calculator-button @click="calculator">
              <span>{{ t('demeterFarming.calculator') }}</span>
            </calculator-button>
          </div>
        </template>
      </info-line>
      <info-line v-if="pricesAvailable" :label="t('demeterFarming.info.totalLiquidityLocked')" :value="tvl"></info-line>
      <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol"></info-line>

      <info-line
        v-if="hasStake || hasRewards"
        value-can-be-hidden
        :label="t('demeterFarming.info.earned', { symbol: rewardAssetSymbol })"
        :value="rewardsFormatted"
        :fiat-value="rewardsFiat"
      ></info-line>
      <info-line
        v-if="hasStake"
        key="has-stake"
        value-can-be-hidden
        :label="poolShareText"
        :value="poolShareFormatted"
        :fiat-value="poolShareFiat"
      ></info-line>
      <info-line
        v-else
        key="no-stake"
        :label="t('demeterFarming.info.fee')"
        :label-tooltip="t('demeterFarming.info.feeTooltip')"
        :value="depositFeeFormatted"
      ></info-line>

      <template #buttons v-if="hasStake || hasRewards">
        <s-button type="secondary" class="s-typography-button--medium" @click="claim" :disabled="!hasRewards">{{
          t('demeterFarming.actions.claim')
        }}</s-button>
        <s-button type="secondary" class="s-typography-button--medium" @click="remove" :disabled="!hasStake">{{
          t('demeterFarming.actions.remove')
        }}</s-button>
      </template>

      <template #append>
        <template v-if="activeStatus">
          <s-button
            v-if="isLoggedIn"
            key="connected"
            type="primary"
            class="s-typography-button--large action-button"
            :disabled="depositDisabled"
            @click="add"
          >
            {{ primaryButtonText }}
          </s-button>
          <s-button
            v-else
            type="primary"
            key="disconnected"
            class="s-typography-button--large action-button"
            @click="connectSoraWallet"
          >
            {{ t('connectWalletText') }}
          </s-button>
        </template>

        <a :href="link" target="_blank" rel="nofollow noopener" class="demeter-pool-card-copyright">
          {{ t('demeterFarming.poweredBy') }}
        </a>
      </template>
    </pool-info>
  </s-card>
</template>

<script lang="ts" setup>
import { computed, toRefs, type PropType } from 'vue';

import PoolInfo from '@/components/shared/PoolInfo.vue';
import { Links, ZeroStringValue } from '@/consts';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTranslation } from '@/composables/useTranslation';
import CalculatorButton from '@/modules/staking/demeter/components/CalculatorButton.vue';

import { useDemeterPoolStatus } from '../composables/useDemeterPoolStatus';
import { useDemeterPoolCard } from '../composables/useDemeterPoolCard';

import type { DemeterPoolStatusComposable } from '../composables/useDemeterPoolStatus';
import type { DemeterAsset, DemeterPool, DemeterAccountPool } from '../types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { Nullable } from '@/types/common';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

defineOptions({
  inheritAttrs: false,
  components: {
    InfoLine: WalletComponentInfoLine,
  },
});

const props = defineProps({
  border: { type: Boolean, default: false },
  showBalance: { type: Boolean, default: false },
  liquidity: { type: Object as PropType<Nullable<AccountLiquidity>>, default: null },
  pool: { type: Object as PropType<Nullable<DemeterPool>>, default: null },
  accountPool: { type: Object as PropType<Nullable<DemeterAccountPool>>, default: null },
  poolAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  rewardAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  apr: { type: String, default: ZeroStringValue },
  tvl: { type: String, default: ZeroStringValue },
});

const emit = defineEmits(['add', 'remove', 'claim', 'calculator']);

const { border, showBalance, liquidity, pool, accountPool, poolAsset, rewardAsset, apr, tvl } = toRefs(props);

const { t, TranslationConsts } = useTranslation();
const { connectSoraWallet, isLoggedIn } = useInternalConnect();

const statusApi: DemeterPoolStatusComposable = useDemeterPoolStatus({
  liquidity,
  pool,
  accountPool,
  poolAsset,
  rewardAsset,
});

const cardApi = useDemeterPoolCard(statusApi);

const link = Links.demeterFarmingPlatform;

const title = computed(() => {
  const key = statusApi.activeStatus.value ? (statusApi.hasStake.value ? 'active' : 'inactive') : 'stopped';
  return t(`demeterFarming.staking.${key}`);
});

const primaryButtonText = computed(() => t(`demeterFarming.actions.${statusApi.hasStake.value ? 'add' : 'start'}`));

const pricesAvailable = computed(() => statusApi.pricesAvailable.value);
const hasStake = computed(() => statusApi.hasStake.value);
const hasRewards = computed(() => cardApi.hasRewards.value);
const depositDisabled = computed(() => statusApi.depositDisabled.value);

const poolAssetBalanceFormatted = computed(() => statusApi.poolAssetBalance.value.toLocaleString());
const poolAssetBalanceFiat = computed(() => {
  const asset = statusApi.poolAsset.value;
  if (!asset) return null;
  return statusApi.getFiatAmountByFPNumber(statusApi.poolAssetBalance.value, asset);
});

const rewardAssetSymbol = computed(() => cardApi.rewardAssetSymbol.value);
const poolAssetSymbol = computed(() => cardApi.poolAssetSymbol.value);
const rewardsFormatted = computed(() => cardApi.rewardsFormatted.value);
const rewardsFiat = computed(() => cardApi.rewardsFiat.value);
const poolShareFormatted = computed(() => cardApi.poolShareFormatted.value);
const poolShareFiat = computed(() => cardApi.poolShareFiat.value);
const depositFeeFormatted = computed(() => cardApi.depositFeeFormatted.value);
const poolShareText = computed(() => t('demeterFarming.info.poolShare', cardApi.poolShareTextArgs.value));

const add = () => emit('add', statusApi.emitParams.value);
const remove = () => emit('remove', statusApi.emitParams.value);
const claim = () => emit('claim', statusApi.emitParams.value);
const calculator = () => emit('calculator', statusApi.emitParams.value);

defineExpose({
  border,
  showBalance,
  title,
  primaryButtonText,
  poolAssetBalanceFormatted,
  poolAssetBalanceFiat,
  connectSoraWallet,
  isLoggedIn,
  pricesAvailable,
  hasStake,
  hasRewards,
  depositDisabled,
  rewardAssetSymbol,
  poolAssetSymbol,
  rewardsFormatted,
  rewardsFiat,
  poolShareFormatted,
  poolShareFiat,
  depositFeeFormatted,
  poolShareText,
  add,
  remove,
  claim,
  calculator,
  statusApi,
  cardApi,
  link,
  apr,
  tvl,
});
</script>

<style lang="scss">
.demeter-pool-card.s-card.neumorphic {
  background: var(--s-color-base-on-accent);

  @include full-width-button('action-button', 0);

  &.border {
    border: 1px solid var(--s-color-theme-accent);
  }
}
</style>

<style lang="scss" scoped>
.demeter-pool-card {
  &-status {
    &-icon {
      margin-right: $inner-spacing-small;
      color: var(--s-color-status-error);

      &.active {
        color: var(--s-color-status-success);
      }
    }

    &-title {
      font-size: var(--s-font-size-medium);
      font-weight: 600;
      line-height: var(--s-line-height-reset);
      text-transform: uppercase;
    }
  }

  &-copyright {
    font-size: var(--s-font-size-mini);
    font-weight: 400;
    line-height: var(--s-line-height-reset);
    text-transform: uppercase;
    opacity: 0.75;
    color: var(--s-color-base-content-primary);
    text-decoration: none;

    @include focus-outline;
  }
}

.apr {
  display: flex;
  align-items: center;

  &-label {
    margin-right: $inner-spacing-mini;
  }
}
</style>
