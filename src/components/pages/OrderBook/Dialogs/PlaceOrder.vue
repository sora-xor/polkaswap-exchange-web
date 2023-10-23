<template>
  <dialog-base :visible.sync="isVisible" :title="'Place limit order'" custom-class="dialog--confirm-swap">
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <div v-if="tokenFrom" class="token">
          <token-logo class="token-logo" :token="tokenFrom" />
          {{ tokenFrom.symbol }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedToValue }}</span>
        <div v-if="tokenTo" class="token">
          <token-logo class="token-logo" :token="tokenTo" />
          {{ tokenTo.symbol }}
        </div>
      </div>
    </div>
    <s-divider />
    <place-transaction-details />
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="loading" @click="handleConfirmSwap">
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
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
  @state.settings.slippageTolerance private slippageTolerance!: string;
  @state.swap.fromValue private fromValue!: string;
  @state.swap.toValue private toValue!: string;
  @state.swap.selectedDexId private selectedDexId!: number;

  @getter.swap.minMaxReceived private minMaxReceived!: CodecString;
  @getter.swap.swapLiquiditySource private liquiditySource!: LiquiditySourceTypes;
  @getter.swap.tokenFrom tokenFrom!: AccountAsset;
  @getter.swap.tokenTo tokenTo!: AccountAsset;

  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean;

  get formattedFromValue(): string {
    return this.formatStringValue(this.fromValue, this.tokenFrom?.decimals);
  }

  get formattedToValue(): string {
    return this.formatStringValue(this.toValue, this.tokenTo?.decimals);
  }

  async handleConfirmSwap(): Promise<void> {
    // TODO eith
    if (this.isInsufficientBalance) {
      this.$alert(
        this.t('exchange.insufficientBalance', { tokenSymbol: this.tokenFrom ? this.tokenFrom.symbol : '' }),
        { title: this.t('errorText') }
      );
      this.$emit('confirm');
    } else {
      try {
        await this.withNotifications(
          async () =>
            await api.swap.execute(
              this.tokenFrom,
              this.tokenTo,
              this.fromValue,
              this.toValue,
              this.slippageTolerance,
              false,
              LiquiditySourceTypes.OrderBook,
              this.selectedDexId
            )
        );
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
</style>

<style lang="scss" scoped>
.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 800;
  }
}
.token {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  &-value {
    margin-right: $inner-spacing-medium;
  }
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.transaction-message {
  margin-top: $inner-spacing-mini;
  color: var(--s-color-base-content-primary);
  line-height: var(--s-line-height-big);
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
