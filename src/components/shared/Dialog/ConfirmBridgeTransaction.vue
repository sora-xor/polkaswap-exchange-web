<template>
  <dialog-base :visible.sync="isVisible">
    <template #title>
      <slot name="title">
        <span class="el-dialog__title">{{ t('confirmTransactionText') }}</span>
      </slot>
    </template>
    <slot name="content-title" />
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmountSend }}</span>
        <div v-if="asset" class="token">
          <i :class="`network-icon network-icon--${getNetworkIcon(isSoraToEvm ? 0 : network)}`" />
          {{ isSoraToEvm ? tokenSymbol : tokenSymbol2 }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmountReceived }}</span>
        <div v-if="asset" class="token">
          <i :class="`network-icon network-icon--${getNetworkIcon(isSoraToEvm ? network : 0)}`" />
          {{ isSoraToEvm ? tokenSymbol2 : tokenSymbol }}
        </div>
      </div>
    </div>
    <s-divider class="s-divider--dialog" />
    <bridge-transaction-details
      :asset="asset"
      :native-token="nativeToken"
      :external-transfer-fee="externalTransferFee"
      :external-network-fee="externalNetworkFee"
      :sora-network-fee="soraNetworkFee"
      :network-name="networkName"
    />
    <template #footer>
      <!-- <account-confirmation-option with-hint class="confirmation-option" /> -->
      <s-button type="primary" class="s-typography-button--big" :loading="loading" @click="handleConfirm">
        {{ confirmText }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { CodecString } from '@sora-substrate/sdk';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { ZeroStringValue, Components } from '@/consts';
import { lazyComponent } from '@/router';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    AccountConfirmationOption: components.AccountConfirmationOption,
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
  @Prop({ default: 0, type: [Number, String] }) readonly networkType!: BridgeNetworkType;
  @Prop({ default: ZeroStringValue, type: String }) readonly amountSend!: string;
  @Prop({ default: ZeroStringValue, type: String }) readonly amountReceived!: string;
  @Prop({ default: () => null, type: Object }) readonly asset!: Nullable<RegisteredAccountAsset>;
  @Prop({ default: () => null, type: Object }) readonly nativeToken!: Nullable<RegisteredAccountAsset>;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalTransferFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalNetworkFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;
  @Prop({ default: true, type: Boolean }) readonly isSoraToEvm!: boolean;
  @Prop({ default: '', type: String }) readonly confirmButtonText!: string;

  get confirmText(): string {
    return this.confirmButtonText || this.t('confirmText');
  }

  get formattedAmountSend(): string {
    return this.amountSend ? this.formatStringValue(this.amountSend) : '';
  }

  get formattedAmountReceived(): string {
    return this.amountReceived ? this.formatStringValue(this.amountReceived) : '';
  }

  get tokenSymbol(): string {
    return this.asset?.symbol || '';
  }

  get tokenSymbol2(): string {
    return (this.asset as any).externalSymbol ?? this.tokenSymbol;
  }

  get networkName(): string {
    return this.getNetworkName(this.networkType, this.network);
  }

  async handleConfirm(): Promise<void> {
    this.$emit('confirm');
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
.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
</style>
