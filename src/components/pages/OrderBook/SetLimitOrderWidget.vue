<template>
  <div class="order-book-widget" v-loading="loadingState">
    <div class="order-book-tabs">
      <s-tabs :value="currentTab" type="card" @input="handleChangeTab">
        <s-tab
          v-for="bookTab in LimitOrderTabsItems"
          :key="bookTab"
          :label="t(`orderBook.${bookTab}`)"
          :name="bookTab"
        />
      </s-tabs>
    </div>
    <div>
      <buy-sell />
    </div>
  </div>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, mutation, state } from '@/store/decorators';

@Component({
  components: {
    BuySell: lazyComponent(Components.BuySell),
  },
})
export default class SetLimitOrderWidget extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @getter.orderBook.baseAsset baseAsset!: any;
  @getter.orderBook.baseAsset quoteAsset!: any;

  @mutation.orderBook.setSide setSide!: (side: PriceVariant) => void;

  readonly LimitOrderTabsItems = PriceVariant;

  currentTab = PriceVariant.Buy;

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  handleChangeTab(side: PriceVariant): void {
    this.currentTab = side;
    this.setSide(side);
  }
}
</script>

<style lang="scss">
$book-tabs-height: 64px;

.order-book-tabs {
  border-radius: var(--s-border-radius-small);
  padding-top: 0;
  padding-right: 0;
  padding-left: 0;
  .s-tabs {
    background-color: inherit;
    &,
    .el-tabs__header,
    .el-tabs__nav-wrap,
    .el-tabs__active-bar {
      border-top-right-radius: inherit;
      border-top-left-radius: inherit;
    }
  }
  .el-tabs__header,
  .el-tabs__nav {
    width: 100%;
  }
  .el-tabs__header .el-tabs {
    &__nav,
    &__nav-wrap,
    &__item {
      height: $book-tabs-height;
      line-height: $book-tabs-height;
    }
    &__nav {
      .el-tabs__item {
        width: 50%;
      }
    }
    &__nav-wrap {
      .el-tabs__item {
        &,
        &.is-active {
          @include page-header-title(true);
          border-top-right-radius: 0;
          border-top-left-radius: inherit;
        }
        &:last-child {
          border-top-right-radius: inherit;
          border-top-left-radius: 0;
        }
      }
    }
  }
  .s-tabs + * {
    padding-top: $inner-spacing-big;
    padding-right: $inner-spacing-big;
    padding-left: $inner-spacing-big;
  }
}
</style>
