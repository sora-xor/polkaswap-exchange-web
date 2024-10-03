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
          />
          <span class="demeter-pool-card-status-title">{{ title }}</span>
        </div>
      </template>

      <info-line
        v-if="isLoggedIn && showBalance"
        value-can-be-hidden
        :label="t('demeterFarming.info.owned', { symbol: poolAssetSymbol })"
        :value="poolAssetBalanceFormatted"
        :fiat-value="poolAssetBalanceFiat"
      />
      <info-line v-if="pricesAvailable" :value="apr">
        <template #info-line-prefix>
          <div class="apr">
            <span class="apr-label">{{ TranslationConsts.APR }}</span>
            <calculator-button @click.native="calculator">
              <span>{{ t('demeterFarming.calculator') }}</span>
            </calculator-button>
          </div>
        </template>
      </info-line>
      <info-line v-if="pricesAvailable" :label="t('demeterFarming.info.totalLiquidityLocked')" :value="tvl" />
      <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol" />

      <info-line
        v-if="hasStake || hasRewards"
        value-can-be-hidden
        :label="t('demeterFarming.info.earned', { symbol: rewardAssetSymbol })"
        :value="rewardsFormatted"
        :fiat-value="rewardsFiat"
      />
      <info-line
        v-if="hasStake"
        key="has-stake"
        value-can-be-hidden
        :label="poolShareText"
        :value="poolShareFormatted"
        :fiat-value="poolShareFiat"
      />
      <info-line
        v-else
        key="no-stake"
        :label="t('demeterFarming.info.fee')"
        :label-tooltip="t('demeterFarming.info.feeTooltip')"
        :value="depositFeeFormatted"
      />

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

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import { Components, Links } from '@/consts';
import { lazyComponent } from '@/router';

import { demeterStakingLazyComponent } from '../../router';
import { DemeterStakingComponents } from '../consts';
import PoolCardMixin from '../mixins/PoolCardMixin';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    CalculatorButton: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorButton),
    PoolInfo: lazyComponent(Components.PoolInfo),
    InfoLine: components.InfoLine,
  },
})
export default class PoolCard extends Mixins(PoolCardMixin, InternalConnectMixin) {
  @Prop({ default: false, type: Boolean }) readonly border!: boolean;
  @Prop({ default: false, type: Boolean }) readonly showBalance!: boolean;

  readonly link = Links.demeterFarmingPlatform;

  get title(): string {
    const key = this.activeStatus ? (this.hasStake ? 'active' : 'inactive') : 'stopped';

    return this.t(`demeterFarming.staking.${key}`);
  }

  get primaryButtonText(): string {
    return this.t(`demeterFarming.actions.${this.hasStake ? 'add' : 'start'}`);
  }

  get poolAssetBalanceFormatted(): string {
    return this.poolAssetBalance.toLocaleString();
  }

  get poolAssetBalanceFiat(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.poolAssetBalance, this.poolAsset as AccountAsset);
  }
}
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
