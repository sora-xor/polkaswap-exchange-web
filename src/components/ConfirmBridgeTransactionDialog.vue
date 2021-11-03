<template>
  <dialog-base :visible.sync="isVisible">
    <template #title>
      <slot name="title">
        <span class="el-dialog__title">{{ t('confirmBridgeTransactionDialog.confirmTransaction') }}</span>
      </slot>
    </template>
    <slot name="content-title" />
    <div :class="assetsClasses">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmount }}</span>
        <div v-if="asset" class="token">
          <i class="s-icon--network s-icon-sora" />
          {{ tokenSymbol }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmount }}</span>
        <div v-if="asset" class="token token-ethereum">
          <i :class="`s-icon--network s-icon-${getEvmIcon(evmNetwork)}`" />
          {{ tokenSymbol }}
        </div>
      </div>
    </div>
    <s-divider class="s-divider--dialog" />
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedSoraNetworkFee"
      :asset-symbol="KnownSymbols.XOR"
      :fiat-value="getFiatAmountByCodecString(soraNetworkFee)"
      is-formatted
    />
    <info-line
      :label="t('bridge.ethereumNetworkFee')"
      :label-tooltip="t('ethNetworkFeeTooltipText')"
      :value="formattedEvmNetworkFee"
      :asset-symbol="currentEvmTokenSymbol"
      is-formatted
    />
    <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
    <!-- <info-line
      :label="t('bridge.total')"
      :label-tooltip="t('bridge.tooltipValue')"
      :value="`~${soraTotal}`"
      :asset-symbol="KnownSymbols.XOR"
    /> -->
    <template #footer>
      <s-button
        type="primary"
        class="s-typography-button--large"
        :loading="loading"
        :disabled="isConfirmButtonDisabled"
        @click="handleConfirm"
      >
        <template v-if="!isValidNetworkType">
          {{ t('confirmBridgeTransactionDialog.changeNetwork') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol }) }}
        </template>
        <template v-else>
          {{ confirmText }}
        </template>
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { KnownSymbols, CodecString, BridgeNetworks } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import DialogBase from '@/components/DialogBase.vue';
import { EvmSymbol, ZeroStringValue } from '@/consts';

import type { Asset } from '@sora-substrate/util';

@Component({
  components: {
    DialogBase,
    InfoLine: components.InfoLine,
  },
})
export default class ConfirmBridgeTransactionDialog extends Mixins(
  mixins.FormattedAmountMixin,
  TranslationMixin,
  DialogMixin,
  mixins.LoadingMixin,
  NetworkFormatterMixin
) {
  @Prop({ default: ZeroStringValue, type: String }) readonly amount!: string;
  @Prop({ default: () => undefined, type: Object }) readonly asset!: Nullable<Asset>;
  @Prop({ default: BridgeNetworks.ETH_NETWORK_ID, type: Number }) readonly evmNetwork!: BridgeNetworks;
  @Prop({ default: ZeroStringValue, type: String }) readonly evmNetworkFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;
  @Prop({ default: true, type: Boolean }) readonly isValidNetworkType!: boolean;
  @Prop({ default: true, type: Boolean }) readonly isSoraToEvm!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean;
  @Prop({ default: '', type: String }) readonly confirmButtonText!: string;

  readonly KnownSymbols = KnownSymbols;

  get confirmText(): string {
    return this.confirmButtonText || this.t('confirmBridgeTransactionDialog.buttonConfirm');
  }

  get isConfirmButtonDisabled(): boolean {
    return !this.isValidNetworkType || this.isInsufficientBalance;
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

  get formattedSoraNetworkFee(): string {
    return this.formatCodecNumber(this.soraNetworkFee);
  }

  get formattedEvmNetworkFee(): string {
    return this.formatCodecNumber(this.evmNetworkFee);
  }

  get tokenSymbol(): string {
    return this.asset?.symbol || '';
  }

  get currentEvmTokenSymbol(): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return EvmSymbol.VT;
    }
    return EvmSymbol.ETH;
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
  .s-icon {
    &-sora,
    &-eth {
      margin-right: $inner-spacing-medium;
      font-size: 21px;
    }
  }
}
</style>
