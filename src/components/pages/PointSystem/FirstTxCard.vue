<template>
  <div class="task-card">
    <p>Your first SORA Network Transaction</p>
    <p>{{ this.date }}</p>
    <s-divider />
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { CalculateCategoryPointResult } from '@/types/pointSystem';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class FirstTxCard extends Mixins(mixins.FormattedAmountMixin, mixins.NumberFormatterMixin) {
  @Prop({ required: true, type: Number })
  readonly date!: number;
}
</script>

<style lang="scss" scoped></style>
