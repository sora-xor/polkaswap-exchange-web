<template>
  <div class="order-book-popover">
    <div>
      <span>Choose orderbook</span>
      <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </div>
    <s-table :data="tableItems" :highlight-current-row="false" @cell-click="chooseBook">
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
import { OrderBookStatus } from '@sora-substrate/util/build/orderBook/types';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter, action, mutation } from '@/store/decorators';

import type { Asset, AccountAsset, Whitelist } from '@sora-substrate/util/build/assets/types';

interface OrderBook {
  readonly orderBookId: any;
  readonly status: OrderBookStatus;
  readonly lastOrderId: number;
  readonly tickSize: FPNumber;
  readonly stepLotSize: FPNumber;
  readonly minLotSize: FPNumber;
  readonly maxLotSize: FPNumber;
}

interface BookFields {
  pair: string;
  baseAsset?: Nullable<AccountAsset>;
  targetAsset?: Nullable<AccountAsset>;
  price?: string;
  dailyChange?: string;
  volume?: string;
  status: string;
}

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class PairListPopover extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.orderBook.orderBooks orderBooks!: Record<string, OrderBook>;

  @mutation.orderBook.setBaseAssetAddress setBaseAssetAddress!: (address: string) => void;
  @mutation.orderBook.resetAsks resetAsks!: () => void;
  @mutation.orderBook.resetBids resetBids!: () => void;

  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

  @action.orderBook.getOrderBooksInfo getOrderBooksInfo!: AsyncFnWithoutArgs;

  orderBooksFormatted: Array<BookFields> = [];

  get tableItems() {
    return this.orderBooksFormatted;
  }

  deserializeKey(key: string) {
    const [base, quote] = key.split(',');
    return { base, quote };
  }

  chooseBook(row): void {
    this.setBaseAssetAddress(row.baseAsset.address);
  }

  prepareOrderBooks() {
    Object.entries(this.orderBooks).forEach(([orderBookId, value]) => {
      if (!orderBookId) return null;

      const { base, quote } = this.deserializeKey(orderBookId);

      const row = {
        baseAsset: this.getAsset(base),
        targetAsset: this.getAsset(quote),
        pair: `${this.getAsset(base)?.symbol}-${this.getAsset(quote)?.symbol}`,
        status: this.mapBookStatus(value.status),
        price: '50.34',
        dailyChange: '+34.30%',
        volume: '3343242000',
      };

      this.orderBooksFormatted.push(row);
    });
  }

  mapBookStatus(status: OrderBookStatus): string {
    switch (status) {
      case OrderBookStatus.Trade:
        return 'Active';
      case OrderBookStatus.PlaceAndCancel:
        return 'Placeable';
      case OrderBookStatus.OnlyCancel:
        return 'Cancelable';
      case OrderBookStatus.Stop:
        return 'Inactive';
      default:
        return 'Unknown';
    }
  }

  async mounted(): Promise<void> {
    await this.withApi(async () => {
      await this.getOrderBooksInfo();
    });

    this.prepareOrderBooks();
  }
}
</script>

<style lang="scss">
.order-book-popover {
  width: 600px;
}
</style>
