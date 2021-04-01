<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('swap.confirmSwap')"
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
    </div>
    <p :class="isExchangeB ? 'transaction-message' : 'transaction-message transaction-message--min-received'" v-html="t('swap.swapOutputMessage', { transactionValue : `<span class='transaction-number'>${ formattedMinMaxReceived }</span>` })" />
    <s-divider />
    <swap-info :show-tooltips="false" />
    <template #footer>
      <s-button
        type="primary"
        :disabled="loading"
        @click="handleConfirmSwap"
      >
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import { api } from '@soramitsu/soraneo-wallet-web'
import { CodecString, AccountAsset, LiquiditySourceTypes } from '@sora-substrate/util'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'

const namespace = 'swap'

@Component({
  components: {
    DialogBase,
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class ConfirmSwap extends Mixins(TransactionMixin, DialogMixin) {
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset
  @Getter('fromValue', { namespace }) fromValue!: string
  @Getter('toValue', { namespace }) toValue!: string
  @Getter('minMaxReceived', { namespace }) minMaxReceived!: CodecString
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean

  @Getter slippageTolerance!: number
  @Getter('swapLiquiditySource', { namespace }) liquiditySource!: LiquiditySourceTypes

  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean

  get formattedFromValue (): string {
    return this.getFPNumber(this.fromValue, this.tokenFrom?.decimals).format()
  }

  get formattedToValue (): string {
    return this.getFPNumber(this.toValue, this.tokenTo?.decimals).format()
  }

  get formattedMinMaxReceived (): string {
    const decimals = (this.isExchangeB ? this.tokenFrom : this.tokenTo)?.decimals
    return this.formatCodecNumber(this.minMaxReceived, decimals)
  }

  async handleConfirmSwap (): Promise<void> {
    await this.$emit('checkConfirm')
    if (this.isInsufficientBalance) {
      this.$alert(this.t('exchange.insufficientBalance', { tokenSymbol: this.tokenFrom ? this.tokenFrom.symbol : '' }), { title: this.t('errorText') })
      this.$emit('confirm')
    } else {
      try {
        await this.withNotifications(
          async () => await api.swap(
            this.tokenFrom.address,
            this.tokenTo.address,
            this.fromValue,
            this.toValue,
            this.slippageTolerance,
            this.isExchangeB,
            this.liquiditySource
          )
        )
        this.$emit('confirm', true)
      } catch (error) {
        this.$emit('confirm')
      }
    }
    this.isVisible = false
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
    font-feature-settings: $s-font-feature-settings-common;
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
  line-height: $s-line-height-small;
  &-info-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
  color: var(--s-color-base-content-tertiary);
  line-height: $s-line-height-big;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
