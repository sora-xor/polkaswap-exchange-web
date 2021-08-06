<template>
  <div class="amount-table">
    <div class="amount-table-item">
      <div class="amount-table-item__title">{{ formatted.title }}</div>
      <template v-if="showTable">
        <div v-if="formatted.subtitle" class="amount-table-item__subtitle">{{ formatted.subtitle }}</div>
        <s-checkbox class="amount-table-item-group" v-model="innerModel" size="big">
          <div class="amount-table-item-content">
            <div class="amount-table-item-content__header">
              <div v-for="(item, index) in formatted.limit" class="amount-table-item__amount" :key="index">
                <formatted-amount
                  class="amount-table-value"
                  :value="isCodecString ? getFPNumberFromCodec(item.amount, item.asset.decimals).toLocaleString() : item.amount"
                  :font-size-rate="FontSizeRate.MEDIUM"
                  :asset-symbol="item.asset.symbol"
                >
                  <s-tooltip v-if="formatted.total && index === 0" popper-class="amount-table-tooltip" placement="right" border-radius="mini">
                    <div slot="content" class="amount-table-tooltip-content">
                      <div>{{ t('rewards.totalVested') }}:</div>
                      <formatted-amount
                        class="amount-table-value"
                        :value="formatted.total.amount"
                        :font-size-rate="FontSizeRate.MEDIUM"
                        :asset-symbol="formatted.total.asset.symbol"
                        symbol-as-decimal
                      />
                    </div>
                    <s-icon name="info-16" size="14px" class="amount-table-value-icon" />
                  </s-tooltip>
                </formatted-amount>
                <formatted-amount :value="getFiatAmountByCodecString(item.amount, item.asset)" is-fiat-value with-left-shift :font-size-rate="FontSizeRate.MEDIUM" />
              </div>
            </div>
            <div v-if="formatted.rewards.length !== 0" class="amount-table-item-content__body">
              <div v-for="(item, index) in formatted.rewards" :key="item.type">
                <s-divider v-if="!simpleGroup || index === 0" :class="['amount-table-divider', theme]" />
                <div class="amount-table-subitem">
                  <div class="amount-table-subitem__title">
                    <template v-if="simpleGroup">—</template>
                    <template v-else-if="formatted.total">{{ t('rewards.totalVested') }} {{ t('rewards.forText') }}</template>
                    {{ item.title }}
                  </div>
                  <template v-if="!simpleGroup">
                    <div v-for="(item, index) in item.limit" :key="index" class="amount-table-subitem__row">
                      <formatted-amount class="amount-table-value" :value="formatCodecNumber(item.amount)" :asset-symbol="item.asset.symbol" :font-size-rate="FontSizeRate.MEDIUM" />
                      <formatted-amount :value="getFiatAmountByCodecString(item.amount, item.asset)" is-fiat-value with-left-shift :font-size-rate="FontSizeRate.MEDIUM" />
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </s-checkbox>
      </template>
    </div>
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator'
import { RewardInfo } from '@sora-substrate/util'
import { FormattedAmountMixin, FormattedAmount, FontSizeRate } from '@soramitsu/soraneo-wallet-web'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { RewardsAmountTableItem, RewardInfoGroup } from '@/types/rewards'

@Component({
  components: {
    FormattedAmount
  }
})
export default class AmountTable extends Mixins(FormattedAmountMixin, TranslationMixin) {
  readonly FontSizeRate = FontSizeRate

  @Prop({ default: () => {}, type: Object }) item!: RewardInfoGroup | RewardInfo
  @Prop({ default: true, type: Boolean }) showTable!: boolean
  @Prop({ default: false, type: Boolean }) simpleGroup!: boolean
  @Prop({ default: false, type: Boolean }) value!: boolean
  @Prop({ default: false, type: Boolean }) isCodecString!: boolean
  @Prop({ default: Theme.LIGHT, type: String }) theme!: Theme

  get innerModel (): any {
    return this.value
  }

  set innerModel (value: any) {
    this.$emit('input', value)
  }

  get formatted (): RewardsAmountTableItem {
    return this.formatItem(this.item)
  }

  formatItem (item: RewardInfoGroup | RewardInfo): RewardsAmountTableItem {
    const toLimit = (amount, asset) => ({
      amount: amount,
      asset: asset
    })

    const key = `rewards.events.${item.type}`
    const title = this.te(key) ? this.t(key) : item.type
    const subtitle = 'title' in item ? item.title : ''
    const total = 'total' in item ? item.total : undefined
    const rewards = ('rewards' in item) && Array.isArray(item.rewards) ? item.rewards.map(this.formatItem) : []
    const limit = ('rewards' in item) && Array.isArray(item.rewards)
      ? (item as RewardInfoGroup).limit
      : [toLimit((item as RewardInfo).amount, (item as RewardInfo).asset)]

    return {
      type: item.type,
      title,
      subtitle,
      limit,
      total,
      rewards
    }
  }
}
</script>

<style lang="scss">
.amount-table {
  & .el-checkbox {
    color: inherit;

    & > * {
      display: flex;
    }

    &__label {
      white-space: normal;
      display: flex;
      flex: 1;
      color: inherit !important;
      padding-left: $inner-spacing-mini;
    }

    &__inner {
      border-radius: 6px !important;
      border: 2px solid var(--s-color-status-error);
      background: var(--s-color-status-error-background);

      &:after {
        left: 4px;
      }
    }
  }

  &-item-group.el-checkbox.s-big {
    padding: 0;
    height: initial;
  }

  &-tooltip.el-tooltip__popper.neumorphic.is-light {
    background-color: var(--s-color-status-success);
  }

  &-divider.s-divider-secondary.dark {
    background-color: var(--s-color-base-content-secondary);
  }
}
</style>

<style lang="scss" scoped>
.amount-table {
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--s-border-radius-mini);
  padding: $inner-spacing-medium;

  &.rewards-table {
    .formatted-amount {
      flex-wrap: wrap;
    }
    .formatted-amount--fiat-value {
      font-weight: 400;
    }
  }

  &-value {
    font-size: var(--s-font-size-medium);
    font-weight: 600;
    &-icon {
      margin-left: $inner-spacing-mini / 2;
    }
  }

  &-item {
    &-group {
      display: flex;
      flex-flow: nowrap;
    }

    &-content {
      display: flex;
      flex-flow: column nowrap;
      flex: 1;

      &__header {
        display: flex;
        flex: 1;
        flex-flow: column nowrap;
      }

      &__body {
        margin-top: $inner-spacing-small;
      }
    }

    &__title {
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-medium);
      font-weight: 400;
      text-transform: uppercase;
      margin-bottom: $inner-spacing-mini;
    }

    &__subtitle {
      font-size: var(--s-font-size-small);
      line-height: var(--s-line-height-reset);
      font-weight: 300;
      text-transform: uppercase;
      margin-bottom: $inner-spacing-mini / 2;
    }

    &__amount {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      line-height: 20px;
    }
  }

  &-subitem {
    margin: $inner-spacing-mini 0;
    font-weight: 300;
    text-transform: uppercase;

    &__title {
      line-height: var(--s-line-height-reset);
    }

    &__row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
    }
  }

  &-divider {
    opacity: 0.5;
  }

  &-tooltip-content {
    font-size: var(--s-font-size-small);
    text-transform: uppercase;
  }

  @include vertical-divider('amount-table-divider', 0);
}
</style>
