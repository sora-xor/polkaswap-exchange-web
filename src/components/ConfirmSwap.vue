<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="isSwapAndSend ? t(`send.confirmSwapAndSend`) : t('swap.confirmSwap')"
    custom-class="dialog--confirm-swap"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <div v-if="tokenFrom" class="token">
          <token-logo :token="tokenFrom" />
          {{ tokenFrom.symbol }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedToValue }}</span>
        <div v-if="tokenTo" class="token">
          <token-logo :token="tokenTo" />
          {{ tokenTo.symbol }}
        </div>
      </div>
      <template v-if="isSwapAndSend">
        <div v-if="isSwapAndSend && from" class="confirm-from">{{ from }}</div>
        <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
        <div class="tokens-info-container">
          <span class="token-value">{{ formattedToValue }}</span>
          <div v-if="tokenTo" class="token">
            <token-logo :token="tokenTo" />
            {{ tokenTo.symbol }}
          </div>
        </div>
        <div v-if="isSwapAndSend && to" class="confirm-to">{{ to }}</div>
      </template>
    </div>
    <p
      v-if="!isSwapAndSend"
      class="transaction-message"
      :class="{ 'transaction-message--min-received': !isExchangeB }"
      v-html="
        t(`swap.swap${isExchangeB ? 'Input' : 'Output'}Message`, {
          transactionValue: `<span class='transaction-number'>${formattedMinMaxReceived}</span>`,
        })
      "
    />
    <s-divider />
    <swap-transaction-details />
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="loading" @click="handleConfirmSwap">
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter, State } from 'vuex-class';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import type { CodecString } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { LiquiditySourceTypes } from '@sora-substrate/util/build/swap/consts';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';

const namespace = 'swap';

@Component({
  components: {
    DialogBase,
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
  },
})
export default class ConfirmSwap extends Mixins(mixins.TransactionMixin, DialogMixin) {
  @State((state) => state[namespace].fromValue) fromValue!: string;
  @State((state) => state[namespace].toValue) toValue!: string;
  @State((state) => state[namespace].isExchangeB) isExchangeB!: boolean;

  @Getter slippageTolerance!: string;
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset;
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset;
  @Getter('minMaxReceived', { namespace }) minMaxReceived!: CodecString;
  @Getter('swapLiquiditySource', { namespace }) liquiditySource!: LiquiditySourceTypes;

  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isSwapAndSend!: boolean;
  @Prop({ default: '', type: String }) readonly from!: string;
  @Prop({ default: '', type: String }) readonly to!: string;
  @Prop({ default: '', type: String }) readonly valueTo!: string;

  get formattedFromValue(): string {
    return this.formatStringValue(this.fromValue, this.tokenFrom?.decimals);
  }

  get formattedToValue(): string {
    return this.formatStringValue(this.toValue, this.tokenTo?.decimals);
  }

  get formattedMinMaxReceived(): string {
    const decimals = (this.isExchangeB ? this.tokenFrom : this.tokenTo)?.decimals;
    return this.formatCodecNumber(this.minMaxReceived, decimals);
  }

  async handleConfirmSwap(): Promise<void> {
    if (this.isInsufficientBalance) {
      this.$alert(
        this.t('exchange.insufficientBalance', { tokenSymbol: this.tokenFrom ? this.tokenFrom.symbol : '' }),
        { title: this.t('errorText') }
      );
      this.$emit('confirm');
    } else {
      console.log(
        this.tokenFrom,
        this.tokenTo,
        this.fromValue,
        this.toValue,
        this.valueTo,
        this.to,
        this.slippageTolerance,
        this.isExchangeB,
        this.liquiditySource
      );
      try {
        await this.withNotifications(async () => {
          if (this.isSwapAndSend) {
            await api.swap.executeSwapAndSend(
              this.tokenFrom,
              this.tokenTo,
              this.fromValue,
              this.toValue,
              this.valueTo,
              this.to,
              this.slippageTolerance,
              this.isExchangeB,
              this.liquiditySource
            );
          } else {
            await api.swap.execute(
              this.tokenFrom,
              this.tokenTo,
              this.fromValue,
              this.toValue,
              this.slippageTolerance,
              this.isExchangeB,
              this.liquiditySource
            );
          }
        });
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
  .transaction-message {
    .min-received-label {
      display: none;
    }
    &--min-received {
      .min-received-label {
        display: inline;
      }
    }
  }
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

.confirm {
  &-from,
  &-to {
    font-size: var(--s-font-size-mini);
    font-weight: 500;
    line-height: var(--s-line-height-small);
    margin-top: $inner-spacing-mini;
  }
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
