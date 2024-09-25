<template>
  <base-widget v-bind="$attrs" :title="t('transaction.title')">
    <div v-if="previewText" class="transaction-details-preview">{{ previewText }}</div>
    <swap-transaction-details v-else />
  </base-widget>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import SwapAmountsMixin from '@/components/mixins/SwapAmountsMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
  },
})
export default class SwapTransactionDetailsWidget extends Mixins(SwapAmountsMixin) {
  get previewText(): string {
    if (!this.areTokensSelected) return this.t('buttons.chooseTokens');
    if (this.areZeroAmounts) return this.t('buttons.enterAmount');
    if (this.hasZeroAmount) return this.t('selectToken.emptyListMessage');
    return '';
  }
}
</script>

<style lang="scss" scoped>
.transaction-details-preview {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}
</style>
