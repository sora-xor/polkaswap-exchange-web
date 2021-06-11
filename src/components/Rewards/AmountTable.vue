<template>
  <component :is="wrapper" :class="['amount-table', { group }]" v-model="innerModel">
    <template v-for="({ type, title, amount, symbol, rewards }, index) in formattedItems">
      <el-checkbox v-if="!group" class="amount-table-checkbox" :key="index" :label="type">
        <div :class="['amount-table-item', { rewards: rewards.length }]">
          <div class="amount-table-item__title">{{ title }}</div>
          <div class="amount-table-item__amount">
            <span>{{ amount }}</span>&nbsp;<span>{{ symbol }}</span>
          </div>
        </div>
      </el-checkbox>
      <div v-else :class="['amount-table-item', { rewards: rewards.length }]" :key="index">
        <div class="amount-table-item__title">{{ title }}</div>
        <div class="amount-table-item__amount">
          <span>{{ amount }}</span>&nbsp;<span>{{ symbol }}</span>
        </div>
      </div>
      <div v-if="rewards.length !== 0" :key="`${index}-inner`" class="amount-table-item-group">
        <div v-for="item in rewards" class="amount-table-item amount-table-item--inner" :key="`${index}-${item.type}`">
          <div class="amount-table-item__title">{{ item.title }}</div>
          <div class="amount-table-item__amount">
            <span>{{ item.amount }}</span>&nbsp;<span>{{ item.symbol }}</span>
          </div>
        </div>
      </div>
    </template>
  </component>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator'
import { RewardInfo } from '@sora-substrate/util'

import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { RewardsAmountTableItem, RewardInfoGroup } from '@/types/rewards'

@Component
export default class AmountTable extends Mixins(NumberFormatterMixin, TranslationMixin) {
  @Prop({ default: () => [], type: Array }) items!: Array<RewardInfo>
  @Prop({ default: () => [], type: [Array, Boolean] }) value!: Array<string> | boolean
  @Prop({ default: false, type: Boolean }) group!: boolean

  get wrapper (): string {
    return this.group ? 'el-checkbox' : 'el-checkbox-group'
  }

  get innerModel (): any {
    return this.value
  }

  set innerModel (value: any) {
    this.$emit('input', value)
  }

  get formattedItems (): Array<RewardsAmountTableItem> {
    return this.items.map(this.formatItem)
  }

  formatItem (item: RewardInfoGroup | RewardInfo): RewardsAmountTableItem {
    const key = `rewards.events.${item.type}`
    const title = this.te(key) ? this.t(key) : item.type
    const rewards = Array.isArray(item.rewards) ? item.rewards.map(this.formatItem) : []

    return {
      type: item.type,
      title,
      amount: this.formatCodecNumber(item.amount),
      symbol: item.asset.symbol,
      rewards
    }
  }
}
</script>

<style lang="scss">
.amount-table {
  &.el-checkbox {
    color: inherit;

    .el-checkbox__label {
      flex-flow: column nowrap;
    }

    .el-checkbox__inner {
      margin-top: 10px;
    }
  }

  & .el-checkbox {
    color: inherit;

    & > * {
      display: flex;
    }

    &__inner {
      margin-top: 10px;
    }

    &__label {
      white-space: normal;
      display: flex;
      flex: 1;
      color: inherit !important;
    }
  }
}
</style>

<style lang="scss" scoped>
$table-item-font-size: 13px;
$checkbox-width: 20px;

.amount-table {
  &.group {
    display: flex;
    flex-flow: row nowrap;
    padding: $inner-spacing-mini $inner-spacing-mini / 2;
    margin-right: 0;
  }

  &-checkbox {
    display: flex;
    margin-right: 0;
    padding: $inner-spacing-mini $inner-spacing-mini / 2;
  }

  &-item {
    display: flex;
    flex: 1;
    align-items: flex-start;
    justify-content: space-between;
    font-size: $table-item-font-size;
    line-height: $s-line-height-mini;
    background-color: rgba(0, 0, 0, 0.25);
    padding: $inner-spacing-small;
    border-top-left-radius: var(--s-border-radius-mini);
    border-top-right-radius: var(--s-border-radius-mini);

    & + & {
      padding-top: 0;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }

    &:last-child, &.rewards {
      border-bottom-left-radius: var(--s-border-radius-mini);
      border-bottom-right-radius: var(--s-border-radius-mini);
    }

    &-group {
      background-color: rgba(255, 255, 255, 0.1);
      border-bottom-left-radius: var(--s-border-radius-mini);
      border-bottom-right-radius: var(--s-border-radius-mini);
      margin: 0 $inner-spacing-small;
    }

    &--inner {
      background-color: unset;
    }

    &__title {
      font-weight: 300;
      text-transform: uppercase;
    }

    &__amount {
      flex: 1;
      font-weight: 600;
      text-align: right;
    }
  }
}
</style>
