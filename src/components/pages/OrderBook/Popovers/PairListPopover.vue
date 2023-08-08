<template>
  <div class="order-book-popover">
    <div>
      <span>Choose orderbook</span>
      <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </div>
    <s-table :data="tableItems" :highlight-current-row="false">
      <s-table-column>
        <template #header>
          <span>Token pair</span>
        </template>
        <template v-slot="{ row }">
          <pair-token-logo :first-token="row.baseAsset" :second-token="row.targetAsset" size="small" />
          <div>
            <div>{{ row.pair }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Price</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.price }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Volume</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.volume }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Daily change</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.dailyChange }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Status</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.status }}</span>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import { api, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { Asset, Whitelist } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class PairListPopover extends Mixins(TranslationMixin) {
  @state.orderBook.orderBooks orderBooks!: any;

  get tableItems() {
    return [
      { pair: 'XOR-XST', price: '50.12', dailyChange: '+34.30%', volume: '334,13.99', status: 'active' },
      { pair: 'XOR-ETH', price: '43.1', dailyChange: '-80.01%', volume: '114,03.45', status: 'inactive' },
      { pair: 'XOR-XST', price: '50.12', dailyChange: '+34.30%', volume: '334,13.99', status: 'active' },
    ];
  }

  mounted(): void {
    console.log('orderBooks', this.orderBooks);
  }
}
</script>

<style lang="scss">
.order-book-popover {
  width: 600px;
}
</style>
