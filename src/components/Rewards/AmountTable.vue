<template>
  <div class="amount-table">
    <div class="amount-table-item">
      <div class="amount-table-item__title">{{ formatted.title }}</div>
      <template v-if="showTable">
        <s-checkbox class="amount-table-item-group" v-model="innerModel" size="big">
          <div class="amount-table-item-content">
            <div class="amount-table-item-content__header">
              <div v-for="(item, index) in formatted.limit" class="amount-table-item__amount" :key="index">
                <span class="amount-table-value">{{ item.amount }}</span>&nbsp;
                <span class="amount-table-symbol">{{ item.symbol }}</span>
              </div>
            </div>
            <div v-if="formatted.rewards.length !== 0" class="amount-table-item-content__body">
              <div v-for="item in formatted.rewards" :key="item.type">
                <s-divider class="amount-table-divider" />
                <div class="amount-table-subitem">
                  <div class="amount-table-subitem__title">- {{ item.title }}</div>
                  <div v-for="(item, index) in item.limit" :key="index">
                    <span class="amount-table-value">{{ item.amount }}</span>&nbsp;
                    <span class="amount-table-symbol">{{ item.symbol }}</span>&nbsp;
                  </div>
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

import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { RewardsAmountTableItem, RewardInfoGroup } from '@/types/rewards'

@Component
export default class AmountTable extends Mixins(NumberFormatterMixin, TranslationMixin) {
  @Prop({ default: () => {}, type: Object }) item!: RewardInfoGroup | RewardInfo
  @Prop({ default: true, type: Boolean }) showTable!: boolean
  @Prop({ default: false, type: Boolean }) value!: boolean

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
    const toLimit = (amount, symbol) => ({
      amount: this.formatCodecNumber(amount),
      symbol
    })

    const isGroup = ('rewards' in item) && Array.isArray(item.rewards)
    const key = `rewards.events.${item.type}`
    const title = this.te(key) ? this.t(key) : item.type
    const rewards = isGroup ? item.rewards.map(this.formatItem) : []
    const limit = isGroup
      ? item.limit
      : [toLimit(item.amount, item.asset.symbol)]

    return {
      type: item.type,
      title,
      limit,
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
    }
  }
}
</style>

<style lang="scss" scoped>
.amount-table {
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--s-border-radius-mini);
  padding: $inner-spacing-medium;

  &-symbol {
    font-size: var(--s-font-size-small);
  }

  &-value {
    font-size: var(--s-font-size-medium);
    font-weight: 600;
  }

  &-item {
    &-group {
      display: flex;
      flex-flow: nowrap;
      padding: 0;
      height: initial;
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

    &__amount {
      line-height: 20px;
    }
  }

  &-subitem {
    padding: $inner-spacing-mini 0;
    font-weight: 300;
    text-transform: uppercase;

    &__title {
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-reset);
    }
  }

  &-divider {
    opacity: 0.5;
  }

  @include vertical-divider('amount-table-divider', 0);
}
</style>
