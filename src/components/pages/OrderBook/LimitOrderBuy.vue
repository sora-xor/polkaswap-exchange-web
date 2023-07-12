<template>
  <div class="order-book">
    <el-popover trigger="click" :visible-arrow="false">
      <pair-list-popover />
      <div slot="reference">
        <div class="order-book-choose-pair" @click="openSelectPair">
          <div>TOKEN PAIR</div>
          <div class="order-book-choose-btn">
            <div class="order-book-pair-name">
              <pair-token-logo :first-token="tokenFrom" :second-token="tokenTo" />
              <span>XST-XOR</span>
            </div>
            <s-icon :name="icon" class="order-book-choose-btn-icon" />
          </div>
          <div class="delimiter" />
          <div class="order-book-pair-data">
            <div class="order-book-pair-data-item"><span>Price</span><span>834,104.00</span></div>
            <div class="order-book-pair-data-item"><span>Change</span><span>+12.90%</span></div>
            <div class="order-book-pair-data-item"><span>Volume</span><span>381,381.00</span></div>
          </div>
        </div>
      </div>
    </el-popover>

    <s-tabs class="order-book-tab" v-model="currentTypeTab" type="rounded" @click="handleTabClick">
      <s-tab v-for="tab in OrderBookTabs" :key="tab" :label="t(`orderBook.${tab}`)" :name="tab" />
    </s-tabs>

    <token-input
      :balance="getTokenBalance(tokenFrom)"
      :is-max-available="false"
      :title="'Limit price'"
      :token="tokenFrom"
      :value="fromValue"
      @input="handleInputFieldFrom"
      class="order-book-input"
    />

    <token-input
      :balance="getTokenBalance(tokenFrom)"
      :is-max-available="isMaxSwapAvailable"
      :title="'Amount'"
      :token="tokenTo"
      :value="toValue"
      @input="handleInputFieldFrom"
      @focus="handleFocusField(false)"
      @max="handleMaxValue"
      @select="openSelectTokenDialog(true)"
      class="order-book-input"
    />

    <s-button type="primary" class="buy-btn s-typography-button--medium" @click="handleConfirm">
      <span> {{ t(buttonText) }}</span>
    </s-button>
    <book-transaction-details :info-only="false" class="info-line-container" />
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';
import { AlertTypeTabs, OrderBookTabs } from '@/types/tabs';
import {
  isMaxButtonAvailable,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  asZeroValue,
  getAssetBalance,
  debouncedInputHandler,
} from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    BookTransactionDetails: lazyComponent(Components.BookTransactionDetails),
    TokenInput: lazyComponent(Components.TokenInput),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PairListPopover: lazyComponent(Components.PairListPopover),
  },
})
export default class LimitOrderBuy extends Mixins(TranslationMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  currentTypeTab: OrderBookTabs = OrderBookTabs.Limit;
  tokenFrom = '';
  tokenTo = '';
  isSelectPairOpen = false;

  readonly OrderBookTabs = OrderBookTabs;

  get buttonText(): string {
    if (!this.isLoggedIn) {
      return 'connectWalletText';
    }

    return 'buy xst';
  }

  get icon(): string {
    return this.isSelectPairOpen ? 'arrows-circle-chevron-bottom-24' : 'arrows-circle-chevron-top-24';
  }

  getTokenBalance(token: AccountAsset): CodecString {
    return getAssetBalance(token);
  }

  handleMaxValue(): void {
    const max = getMaxValue(this.tokenFrom, this.networkFee);

    this.handleInputFieldFrom(max);
  }

  openSelectPair(): void {
    this.isSelectPairOpen = !this.isSelectPairOpen;
  }

  get isMaxSwapAvailable(): boolean {
    if (!(this.tokenFrom && this.tokenTo)) return false;
    return (
      this.isLoggedIn &&
      isMaxButtonAvailable(
        this.areTokensSelected,
        this.tokenFrom,
        this.fromValue,
        this.networkFee,
        this.xor,
        false,
        this.isXorOutputSwap
      )
    );
  }

  handleTabClick(): void {}

  handleConfirm(): void {}
}
</script>

<style lang="scss">
.setup-price-alert {
  @include custom-tabs;

  &__tab {
    margin-bottom: #{$basic-spacing-medium};
  }
}

.buy-btn {
  width: 100%;
  background-color: #34ad87 !important;
}
</style>

<style lang="scss" scoped>
.order-book {
  &-choose-pair {
    width: 100%;
    background-color: #ede4e7;
    border-radius: 20px;
    margin-bottom: 8px;
    padding: 10px 16px;
  }

  &-choose-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;

    &-icon {
      &:hover {
        cursor: pointer;
      }
    }
  }

  &-pair-name {
    display: flex;
    align-items: center;
    font-size: 20px;
    font-weight: 700;
  }

  &-pair-data {
    display: flex;

    &-item {
      display: flex;
      flex-direction: column;
      margin-right: 42px;
    }
  }

  &-input {
    margin-bottom: 8px;
  }

  .delimiter {
    background-color: #fff;
    margin: 8px 0;
    height: 1px;
    width: 100%;
  }
}
</style>
