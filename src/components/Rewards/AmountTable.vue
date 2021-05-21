<template>
  <component :is="wrapper" :class="['amount-table', { group }]" v-model="checkList">
    <template v-for="({ title, amount, symbol }, index) in items">
      <el-checkbox class="amount-table-checkbox" :key="index" v-if="!group" :label="index">
        <div class="amount-table-item">
          <div class="amount-table-item__title">{{ title }}</div>
          <div class="amount-table-item__amount">
            <span>{{ amount }}</span>&nbsp;<span>{{ symbol }}</span>
          </div>
        </div>
      </el-checkbox>
      <div v-else class="amount-table-item amount-table-item--row" :key="index">
        <div class="amount-table-item__title">{{ title }}</div>
        <div class="amount-table-item__amount">
          <span>{{ amount }}</span>&nbsp;<span>{{ symbol }}</span>
        </div>
      </div>
    </template>
  </component>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { RewardsAmountTableItem } from '@/types/rewards'

@Component
export default class AmountTable extends Vue {
  @Prop({ default: () => [], type: Array }) items!: Array<RewardsAmountTableItem>
  @Prop({ default: false, type: Boolean }) group!: boolean

  get wrapper (): string {
    return this.group ? 'el-checkbox' : 'el-checkbox-group'
  }

  checkList = []
}
</script>

<style lang="scss">
.amount-table {
  &.el-checkbox {
    color: inherit;

    .el-checkbox__label {
      flex-flow: column nowrap;
    }
  }

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
    }
  }
}
</style>

<style lang="scss" scoped>
$table-item-font-size: 13px;
$checkbox-width: 20px;

.amount-table {
  &.group {
    padding: $inner-spacing-mini $inner-spacing-mini / 2;
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

    &--row:not(:last-child) {
      margin-bottom: $inner-spacing-mini * 2;
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
