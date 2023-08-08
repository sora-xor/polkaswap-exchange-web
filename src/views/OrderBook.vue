<template>
  <div class="order-book-widgets">
    <set-limit-order-widget />
    <history-order-widget />
    <book-charts-widget />
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    SetLimitOrderWidget: lazyComponent(Components.SetLimitOrderWidget),
    HistoryOrderWidget: lazyComponent(Components.HistoryOrderWidget),
    BookChartsWidget: lazyComponent(Components.BookChartsWidget),
  },
})
export default class OrderBook extends Mixins(TranslationMixin) {}
</script>

<style lang="scss">
.order-book {
  &-widgets {
    display: flex;
    margin-left: calc($sidebar-max-width + 8px);
  }

  &-widget {
    margin: 8px;
    padding: unset;
    background-color: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-dialog);
    color: var(--s-color-base-content-primary);
    border-radius: var(--s-border-radius-small);
  }
}
</style>
