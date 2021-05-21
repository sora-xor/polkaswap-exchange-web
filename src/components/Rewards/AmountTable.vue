<template>
  <div class="amount-table">
    <el-checkbox-group v-model="checkList">
    <div v-for="({ title, amount, symbol }, index) in items" :key="index" class="amount-table-item">
      <el-checkbox v-if="!group || index === 0" :label="index"></el-checkbox>
      <div class="amount-table-item__title">{{ title }}</div>
      <div class="amount-table-item__amount">
        <span>{{ amount }}</span>&nbsp;<span>{{ symbol }}</span>
      </div>
    </div>
    </el-checkbox-group>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { RewardsAmountTableItem } from '@/types/rewards'

@Component
export default class AmountTable extends Vue {
  @Prop({ default: () => [], type: Array }) items!: Array<RewardsAmountTableItem>
  @Prop({ default: false, type: Boolean }) group!: boolean

  checkList = []
}
</script>

<style lang="scss" scoped>
$table-item-font-size: 13px;

.amount-table {
  &-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    font-size: $table-item-font-size;
    line-height: $s-line-height-mini;
    padding: $inner-spacing-mini $inner-spacing-mini / 2;

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
