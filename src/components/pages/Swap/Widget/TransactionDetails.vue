<template>
  <base-widget v-bind="$attrs" :title="t('transaction.title')">
    <swap-transaction-details />
  </base-widget>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
  },
})
export default class SwapTransactionDetailsWidget extends Mixins(TranslationMixin) {}
</script>
