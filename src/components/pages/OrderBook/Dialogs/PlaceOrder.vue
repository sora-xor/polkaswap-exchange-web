<template>
  <dialog-base :visible.sync="isVisible" :title="title" custom-class="dialog--confirm-swap">
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ upperText }}</span>
        <token-logo class="token-logo" :token="baseAsset" />
      </div>
      <div class="tokens-info-container">
        <span class="token-value">{{ lowerText }}</span>
        <token-logo class="token-logo" :token="quoteAsset" />
      </div>
    </div>

    <place-transaction-details class="transaction-details" :is-market-type="isMarketType" />
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="loading" @click="handleConfirmSwap">
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    PlaceTransactionDetails: lazyComponent(Components.PlaceTransactionDetails),
  },
})
export default class PlaceLimitOrder extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.orderBook.baseValue baseValue!: string;
  @state.orderBook.quoteValue quoteValue!: string;
  @state.orderBook.side side!: PriceVariant;
  @state.settings.slippageTolerance private slippageTolerance!: string;
  @state.swap.fromValue private fromValue!: string;
  @state.swap.toValue private toValue!: string;
  @state.swap.selectedDexId private selectedDexId!: number;

  @getter.swap.minMaxReceived private minMaxReceived!: CodecString;
  @getter.swap.swapLiquiditySource private liquiditySource!: LiquiditySourceTypes;
  @getter.swap.tokenFrom tokenFrom!: AccountAsset;
  @getter.swap.tokenTo tokenTo!: AccountAsset;

  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;

  @Prop({ default: false, type: Boolean }) readonly isMarketType!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean;
  @Prop({ default: true, type: Boolean }) readonly isBuySide!: boolean;

  get formattedFromValue(): string {
    return this.formatStringValue(this.fromValue, this.tokenFrom?.decimals);
  }

  get title(): string {
    return this.isMarketType ? 'Place market order' : 'Place limit order';
  }

  get upperText(): string {
    const symbol = this.baseAsset?.symbol;

    if (this.isMarketType) {
      return this.isBuySide ? `Buy ${this.toValue} ${symbol}` : `Sell ${this.baseValue} ${symbol}`;
    } else {
      return this.isBuySide ? `Buy ${this.baseValue} ${symbol}` : `Sell ${this.baseValue} ${symbol}`;
    }
  }

  get lowerText(): string {
    const price = this.quoteValue;
    const symbol = this.quoteAsset?.symbol;

    return `at ${price} ${symbol}`;
  }

  get formattedToValue(): string {
    return this.formatStringValue(this.toValue, this.tokenTo?.decimals);
  }

  async limitOrder() {
    return await api.orderBook.placeLimitOrder(
      this.baseAsset.address,
      this.quoteAsset.address,
      this.quoteValue,
      this.baseValue,
      this.side
    );
  }

  async marketOrder() {
    return await api.swap.execute(
      this.tokenFrom,
      this.tokenTo,
      this.fromValue,
      this.toValue,
      this.slippageTolerance,
      this.isBuySide,
      LiquiditySourceTypes.OrderBook,
      this.selectedDexId
    );
  }

  async handleConfirmSwap(): Promise<void> {
    if (this.isInsufficientBalance) {
      this.$alert(
        this.t('exchange.insufficientBalance', { tokenSymbol: this.tokenFrom ? this.tokenFrom.symbol : '' }),
        { title: this.t('errorText') }
      );
      this.$emit('confirm');
    } else {
      const orderExtrinsic = this.isMarketType ? this.marketOrder : this.limitOrder;

      try {
        await this.withNotifications(orderExtrinsic);
        this.$emit('confirm', true);
      } catch (error) {
        this.$emit('confirm');
      }
    }
    this.isVisible = false;
  }
}
</script>

<style lang="scss">
.dialog--confirm-swap {
  .transaction-number {
    color: var(--s-color-base-content-primary);
    font-weight: 600;
    word-break: break-all;
  }
}

.limit-order-type--buy {
  .info-line-value {
    color: #34ad87;
  }
}

.limit-order-type--sell {
  .info-line-value {
    color: #f754a3;
  }
}
</style>

<style lang="scss" scoped>
.transaction-details {
  margin-top: $basic-spacing;
}

.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    align-items: center;
    font-weight: 800;
  }

  .token-logo {
    margin-left: $basic-spacing;
  }
}
</style>
