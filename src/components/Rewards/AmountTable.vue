<template>
  <div class="amount-table">
    <div v-for="({ title, amount, symbol }, index) in items" :key="index" class="amount-table-item">
      <div class="amount-table-item__title">{{ title }}</div>
      <div class="amount-table-item__amount">
        <span>{{ amount }}</span>&nbsp;<span>{{ symbol }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { RewardsAmountTableItem } from '@/types/rewards'

@Component
export default class AmountTable extends Vue {
  @Prop({ default: () => [], type: Array }) items!: Array<RewardsAmountTableItem>
}
</script>

<style lang="scss" scoped>
.amount-table {
  &-item {
    color: white;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    font-size: 13px;
    line-height: $s-line-height-mini;
    padding: $inner-spacing-mini 0;

    &__title {
      font-weight: 300;
      text-transform: uppercase;
      width: 60%;
    }

    &__amount {
      font-weight: 600;
      width: 40%;
      text-align: right;
    }
  }
}
</style>
