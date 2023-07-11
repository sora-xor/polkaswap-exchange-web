<template>
  <div class="container">
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
      <buy v-if="currentTab === LimitOrderTabsItems.buy" />
      <sell v-else-if="currentTab === LimitOrderTabsItems.sell" />
    </div>
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, LimitOrderTabsItems } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    Buy: lazyComponent(Components.OrderBookBuy),
    Sell: lazyComponent(Components.OrderBookSell),
  },
})
export default class SetLimitOrder extends Mixins(TranslationMixin) {
  readonly LimitOrderTabsItems = LimitOrderTabsItems;

  currentTab = LimitOrderTabsItems.buy;

  handleChangeTab(tabName: LimitOrderTabsItems): void {
    this.currentTab = tabName;
  }
}
</script>

<style lang="scss">
$book-tabs-height: 64px;

.order-book-tabs {
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
