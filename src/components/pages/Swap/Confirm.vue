<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('swap.confirmSwap')"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
    custom-class="dialog--confirm-swap"
  >
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
    <p
      class="transaction-message"
      :class="{ 'transaction-message--min-received': !isExchangeB }"
      v-html="
        t(`swap.swap${isExchangeB ? 'Input' : 'Output'}Message`, {
          transactionValue: `<span class='transaction-number'>${formattedMinMaxReceived}</span>`,
        })
      "
    />
    <s-divider />
    <swap-transaction-details full expanded />
    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option" />
      <s-button
        type="primary"
        class="s-typography-button--large"
        :disabled="isInsufficientBalance"
        @click="handleConfirm"
      >
        {{ t('confirmText') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    AccountConfirmationOption: components.AccountConfirmationOption,
    SwapTransactionDetails: lazyComponent(Components.SwapTransactionDetails),
  },
})
export default class SwapConfirm extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.swap.fromValue private fromValue!: string;
  @state.swap.toValue private toValue!: string;
  @state.swap.isExchangeB isExchangeB!: boolean;

  @getter.swap.minMaxReceived private minMaxReceived!: CodecString;
  @getter.swap.tokenFrom tokenFrom!: AccountAsset;
  @getter.swap.tokenTo tokenTo!: AccountAsset;

  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean;
  @Prop({ default: false, type: Boolean }) readonly appendToBody!: boolean;

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

  async handleConfirm(): Promise<void> {
    this.$emit('confirm');
    this.closeDialog();
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
.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
