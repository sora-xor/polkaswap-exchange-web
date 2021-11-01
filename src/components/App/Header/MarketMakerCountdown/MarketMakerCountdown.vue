<template>
  <s-tooltip v-if="accountMarketMakerInfo" popper-class="countdown-tooltip" :open-delay="0" :close-delay="500">
    <div slot="content" class="countdown-info">
      <div class="countdown-info-header">
        <div class="countdown-info-title">Market Maker Countdown</div>
        <div class="countdown-info-time">
          <formatted-amount :value="formattedBlocksLeft" />&nbsp;blocks / {{ daysLeft }} days left
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
          <span class="counter-transactions__unit">TXs</span>
        </div>
        <div class="counter-volume">
          <span>MM TX volume</span>
          <span class="counter-volume__value"><formatted-amount :value="formattedVolume" integer-only /></span>
        </div>
      </div>
      <s-divider class="countdown-info-divider" type="secondary" />
      <div class="countdown-info-footer">
        20 million PSWAP / month will be distributed to market makers with at least 500 tx / month valued over 1
        XOR.&nbsp;
        <a class="countdown-info-link" target="_blank" rel="nofollow noopener" :href="link">Learn more</a>
      </div>
    </div>
    <countdown unit="MM" :percentage="transactionsPercentage" :count="accountMarketMakerInfo.count" />
  </s-tooltip>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Getter, Action, State } from 'vuex-class';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import Countdown from './Countdown.vue';

import { Links, ZeroStringValue } from '@/consts';

import type { AccountMarketMakerInfo } from '@sora-substrate/util';

@Component({
  components: {
    Countdown,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class MarketMakerCountdown extends Mixins(mixins.NumberFormatterMixin) {
  @Action('subscribeOnAccountMarketMakerInfo', { namespace: 'rewards' })
  subscribeOnAccountMarketMakerInfo!: AsyncVoidFn;

  @Action('unsubscribeAccountMarketMakerInfo', { namespace: 'rewards' })
  unsubscribeAccountMarketMakerInfo!: AsyncVoidFn;

  @Getter isLoggedIn!: boolean;
  @Getter nodeIsConnected!: boolean;

  @State((state) => state.rewards.accountMarketMakerInfo) accountMarketMakerInfo!: Nullable<AccountMarketMakerInfo>;
  @State((state) => state.settings.blockNumber) blockNumber!: number;

  @Watch('isLoggedIn')
  @Watch('nodeIsConnected')
  private async updateSubscriptions(value: boolean) {
    if (value) {
      await this.subscribeOnAccountMarketMakerInfo();
    } else {
      await this.unsubscribeAccountMarketMakerInfo();
    }
  }

  readonly total = 500;
  readonly blocksInDay = 14400;
  readonly blocksInMonth = 30 * 14400;
  readonly link = Links.marketMaker;

  get transactionsPercentage(): number {
    if (!this.accountMarketMakerInfo) return 0;

    return Math.floor((100 * this.accountMarketMakerInfo.count) / this.total);
  }

  get blocksLeft(): number {
    return this.blocksInMonth - (this.blockNumber % this.blocksInMonth);
  }

  get daysLeft(): number {
    return Math.round(this.blocksLeft / this.blocksInDay);
  }

  get formattedBlocksLeft(): string {
    return this.formatStringValue(String(this.blocksLeft));
  }

  get formattedVolume(): string {
    if (!this.accountMarketMakerInfo) return ZeroStringValue;

    return this.formatCodecNumber(this.accountMarketMakerInfo.volume);
  }
}
</script>

<style lang="scss">
.countdown-tooltip.el-tooltip__popper.neumorphic {
  background-color: var(--s-color-utility-body);
  border-color: var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  box-shadow: var(--s-shadow-dialog);
  padding: 14px;
  max-width: 288px;
  width: 100%;
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
    flex-flow: row nowrap;
    justify-content: space-between;
    align-items: center;

    & > *:not(:first-child) {
      margin-left: $inner-spacing-mini;
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
    margin-left: $inner-spacing-mini / 2;
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
    margin-left: $inner-spacing-mini / 2;
  }
}
</style>
