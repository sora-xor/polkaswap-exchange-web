<template>
  <dialog-base :visible.sync="isVisible">
    <template #title>
      <slot name="title">
        <span class="el-dialog__title">{{ t('confirmTransactionText') }}</span>
      </slot>
    </template>
    <slot name="content-title" />
    <div :class="assetsClasses">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmount }}</span>
        <div v-if="asset" class="token">
          <i class="network-icon network-icon--sora" />
          {{ tokenSymbol }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmount }}</span>
        <div v-if="asset" class="token token-ethereum">
          <i :class="`network-icon network-icon--${getNetworkIcon(network)}`" />
          {{ tokenSymbol }}
        </div>
      </div>
    </div>
    <s-divider class="s-divider--dialog" />
    <bridge-transaction-details
      :evm-token-symbol="evmTokenSymbol"
      :external-fee="externalFee"
      :sora-network-fee="soraNetworkFee"
    />
    <template #footer>
      <s-button
        type="primary"
        class="s-typography-button--large"
        :loading="loading"
        :disabled="isConfirmButtonDisabled"
        @click="handleConfirm"
      >
        <template v-if="!isValidNetwork">
          {{ t('changeNetworkText') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol }) }}
        </template>
        <template v-else>
          {{ confirmText }}
        </template>
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { CodecString } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { ZeroStringValue, Components } from '@/consts';
import { lazyComponent } from '@/router';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails),
  },
})
export default class ConfirmBridgeTransactionDialog extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.LoadingMixin,
  mixins.DialogMixin,
  TranslationMixin,
  NetworkFormatterMixin
) {
  @Prop({ default: 0, type: [Number, String] }) readonly network!: BridgeNetworkId;
  @Prop({ default: ZeroStringValue, type: String }) readonly amount!: string;
  @Prop({ default: () => undefined, type: Object }) readonly asset!: Nullable<Asset>;
  @Prop({ default: '', type: String }) readonly evmTokenSymbol!: string;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;
  @Prop({ default: true, type: Boolean }) readonly isValidNetwork!: boolean;
  @Prop({ default: true, type: Boolean }) readonly isSoraToEvm!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean;
  @Prop({ default: '', type: String }) readonly confirmButtonText!: string;

  get confirmText(): string {
    return this.confirmButtonText || this.t('confirmText');
  }

  get isConfirmButtonDisabled(): boolean {
    return !this.isValidNetwork || this.isInsufficientBalance;
  }

  get assetsClasses(): Array<string> {
    const assetsClass = 'tokens';
    const classes = [assetsClass];

    if (!this.isSoraToEvm) {
      classes.push(`${assetsClass}--reverse`);
    }

    return classes;
  }

  get formattedAmount(): string {
    return this.amount ? this.formatStringValue(this.amount, this.asset?.decimals) : '';
  }

  get tokenSymbol(): string {
    return this.asset?.symbol || '';
  }

  async handleConfirm(): Promise<void> {
    this.$emit('confirm', true);
    this.closeDialog();
  }
}
</script>

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
  &--reverse {
    flex-direction: column-reverse;
  }
}
@include vertical-divider;
@include vertical-divider('s-divider--dialog', $inner-spacing-medium);
.token {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  letter-spacing: var(--s-letter-spacing-mini);
  &-value {
    margin-right: $inner-spacing-medium;
  }
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
  .network-icon {
    margin-right: $inner-spacing-medium;
    width: var(--s-size-small);
    height: var(--s-size-small);
  }
}
</style>
