<template>
  <el-popover
    v-if="accountMarketMakerInfo"
    popper-class="countdown-tooltip"
    trigger="click"
    :visible-arrow="false"
    @show="disableTooltip(true)"
    @hide="disableTooltip(false)"
  >
    <div class="countdown-info">
      <div class="countdown-info-header">
        <div class="countdown-info-title">{{ t('marketMakerCountdown.title') }}</div>
        <div class="countdown-info-time">
          <formatted-amount :value="formattedBlocksLeft" />&nbsp; {{ t('marketMakerCountdown.blocks') }} /
          {{ formattedDaysLeft }} {{ t('marketMakerCountdown.daysLeft') }}
        </div>
      </div>
      <el-progress
        class="countdown-info-progress"
        :percentage="transactionsPercentage"
        :show-text="false"
        color="var(--s-color-theme-accent);"
      />
      <div class="countdown-info-counters">
        <div class="counter-transactions">
          <span class="counter-transactions__current">{{ accountMarketMakerInfo.count }}</span>
          <span class="counter-transactions__total">&nbsp;/&nbsp;{{ total }}</span>
          <span class="counter-transactions__unit">{{ t('marketMakerCountdown.txs') }}</span>
        </div>
        <div class="counter-volume">
          <span>{{ t('marketMakerCountdown.volume') }}</span>
          <span class="counter-volume__value">
            <formatted-amount :value="formattedVolume" integer-only />&nbsp;
            {{ XOR.symbol }}
          </span>
        </div>
      </div>
      <s-divider class="countdown-info-divider" type="secondary" />
      <div class="countdown-info-footer">
        {{ t('marketMakerCountdown.description') }}&nbsp;
        <a class="countdown-info-link" target="_blank" rel="nofollow noopener" :href="link">{{ t('learnMoreText') }}</a>
      </div>
    </div>
    <s-tooltip slot="reference" :content="t('marketMakerCountdown.title')" :disabled="tooltipDisabled" tabindex="-1">
      <countdown unit="MM" :percentage="transactionsPercentage" :count="accountMarketMakerInfo.count" />
    </s-tooltip>
  </el-popover>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountMarketMakerInfo } from '@sora-substrate/util/build/rewards/types';

import Countdown from './Countdown.vue';
import TranslationMixin from '@/components/mixins/TranslationMixin';

import { Links, ZeroStringValue } from '@/consts';
import { action, getter, mutation, state } from '@/store/decorators';

const REQUIRED_TX_COUNT = 500;
const BLOCKS_IN_DAY = 14_400;
const BLOCKS_IN_MONTH = BLOCKS_IN_DAY * 30;

@Component({
  components: {
    Countdown,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class MarketMakerCountdown extends Mixins(mixins.NumberFormatterMixin, TranslationMixin) {
  @action.rewards.subscribeOnAccountMarketMakerInfo private subscribe!: AsyncFnWithoutArgs;
  @mutation.rewards.unsubscribeAccountMarketMakerInfo private unsubscribe!: FnWithoutArgs;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  @state.settings.blockNumber private blockNumber!: number;
  @state.rewards.accountMarketMakerInfo accountMarketMakerInfo!: Nullable<AccountMarketMakerInfo>;

  @Watch('isLoggedIn')
  @Watch('nodeIsConnected')
  private async updateSubscriptions(value: boolean) {
    if (value) {
      await this.subscribe();
    } else {
      this.unsubscribe();
    }
  }

  readonly XOR = XOR;
  readonly total = REQUIRED_TX_COUNT;
  readonly link = Links.marketMaker;

  tooltipDisabled = false;

  get transactionsPercentage(): number {
    if (!this.accountMarketMakerInfo) return 0;

    return Math.min(Math.floor((100 * this.accountMarketMakerInfo.count) / this.total), 100);
  }

  get blocksLeft(): number {
    return BLOCKS_IN_MONTH - (this.blockNumber % BLOCKS_IN_MONTH);
  }

  get daysLeft(): number {
    return Math.floor(this.blocksLeft / BLOCKS_IN_DAY);
  }

  get formattedBlocksLeft(): string {
    return this.formatStringValue(String(this.blocksLeft));
  }

  get formattedDaysLeft(): string {
    return this.daysLeft === 0 ? '< 1' : String(this.daysLeft);
  }

  get formattedVolume(): string {
    if (!this.accountMarketMakerInfo) return ZeroStringValue;

    return this.formatCodecNumber(this.accountMarketMakerInfo.volume);
  }

  disableTooltip(flag = false): void {
    this.tooltipDisabled = flag;
  }
}
</script>

<style lang="scss">
.countdown-tooltip.el-popover.el-popper {
  background-color: var(--s-color-utility-body);
  border-color: var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  box-shadow: var(--s-shadow-dialog);
  padding: 14px;
  max-width: 288px;
  width: 100%;
  font-size: var(--s-font-size-extra-mini);
}

.countdown-info-progress .el-progress-bar__outer {
  background-color: var(--s-color-utility-body);
  box-shadow: var(--s-shadow-element);
}
</style>

<style lang="scss" scoped>
.countdown-info {
  color: var(--s-color-base-content-primary);
  font-weight: 400;
  line-height: var(--s-line-height-medium);
  letter-spacing: var(--s-letter-spacing-small);
  word-break: keep-all;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-mini;
  }

  &-title {
    font-size: var(--s-font-size-small);
    font-weight: 300;
  }

  &-time {
    display: flex;
    color: var(--s-color-base-content-secondary);
  }

  &-counters {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    align-items: center;

    & > *:not(:last-child) {
      margin-right: $inner-spacing-mini;
    }
  }

  &-divider {
    margin: unset;
  }

  &-link {
    color: var(--s-color-theme-accent);
  }
}

.counter-transactions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  font-size: var(--s-font-size-extra-small);
  color: var(--s-color-theme-accent);

  &__current {
    font-weight: 600;
    font-size: var(--s-font-size-medium);
  }

  &__unit {
    margin-left: $inner-spacing-tiny;
  }
}

.counter-volume {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  color: var(--s-color-base-content-secondary);

  &__value {
    display: flex;
    color: var(--s-color-base-content-primary);
    margin-left: $inner-spacing-tiny;
  }
}
</style>
