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
          {{ formatAssetSymbol(asset.symbol) }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedAmount }}</span>
        <div v-if="asset" class="token token-ethereum">
          <i :class="`s-icon--network s-icon-${getEvmIcon(evmNetwork)}`" />
          {{ formatAssetSymbol(asset.symbol) }}
        </div>
      </div>
    </div>
    <s-divider class="s-divider--dialog" />
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formatFee(soraNetworkFee, formattedSoraNetworkFee)"
      :asset-symbol="KnownSymbols.XOR"
      :fiat-value="getFiatAmountByCodecString(soraNetworkFee)"
      is-formatted
    />
    <info-line
      :label="t('bridge.ethereumNetworkFee')"
      :label-tooltip="t('ethNetworkFeeTooltipText')"
      :value="formatFee(evmNetworkFee, formattedEvmNetworkFee)"
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
      <s-button type="primary" class="s-typography-button--large" :loading="loading" :disabled="!isValidNetworkType" @click="handleConfirm">
        <template v-if="!isValidNetworkType">
          {{ t('confirmBridgeTransactionDialog.changeNetwork') }}
        </template>
        <template v-else-if="isEthereumToSoraConfirmation">
          {{ t('confirmBridgeTransactionDialog.confirm', { direction: t('confirmBridgeTransactionDialog.sora') }) }}
        </template>
        <template v-else>
          {{ confirmText }}
        </template>
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { KnownSymbols, CodecString, BridgeNetworks } from '@sora-substrate/util'
import { FormattedAmountMixin, InfoLine } from '@soramitsu/soraneo-wallet-web'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'
import DialogBase from '@/components/DialogBase.vue'
import { EvmSymbol } from '@/consts'
import { formatAssetSymbol } from '@/utils'

const namespace = 'bridge'

@Component({
  components: {
    DialogBase,
    InfoLine
  }
})
export default class ConfirmBridgeTransactionDialog extends Mixins(
  FormattedAmountMixin,
  TranslationMixin,
  DialogMixin,
  LoadingMixin,
  NetworkFormatterMixin
) {
  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean
  @Getter('isSoraToEvm', { namespace }) isSoraToEvm!: boolean
  @Getter('asset', { namespace }) asset!: any
  @Getter('amount', { namespace }) amount!: string
  @Getter('evmNetworkFee', { namespace }) evmNetworkFee!: CodecString
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString
  @Getter('evmNetwork', { namespace: 'web3' }) evmNetwork!: BridgeNetworks
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm
  @Action('setTransactionStep', { namespace }) setTransactionStep

  // TODO: Check/Ask if the Bridge could have the same errors as other projects
  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean
  @Prop({ default: false, type: Boolean }) readonly isEthereumToSoraConfirmation!: boolean
  @Prop({ default: '', type: String }) readonly confirmButtonText!: string

  EvmSymbol = EvmSymbol
  KnownSymbols = KnownSymbols
  formatAssetSymbol = formatAssetSymbol

  get confirmText (): string {
    return this.confirmButtonText || this.t('confirmBridgeTransactionDialog.buttonConfirm')
  }

  get formattedAmount (): string {
    return this.amount ? this.formatStringValue(this.amount, this.asset?.decimals) : ''
  }

  get assetsClasses (): string {
    const assetsClass = 'tokens'
    const classes = [assetsClass]

    if (!this.isSoraToEvm) {
      classes.push(`${assetsClass}--reverse`)
    }

    return classes.join(' ')
  }

  get formattedSoraNetworkFee (): string {
    return this.formatCodecNumber(this.soraNetworkFee)
  }

  get formattedEvmNetworkFee (): string {
    return this.formatCodecNumber(this.evmNetworkFee)
  }

  get currentEvmTokenSymbol (): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return this.EvmSymbol.VT
    }
    return this.EvmSymbol.ETH
  }

  formatFee (fee: string, formattedFee: string): string {
    return fee !== '0' ? formattedFee : '0'
  }

  async handleConfirm (): Promise<void> {
    await this.$emit('checkConfirm')
    // TODO: Check isInsufficientBalance for both Networks
    if (this.isInsufficientBalance) {
      this.$alert(this.t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: this.asset ? this.asset.symbol : '' }), { title: this.t('errorText') })
      this.$emit('confirm')
    } else {
      await this.setTransactionConfirm(true)
      await this.setTransactionStep(1)
      this.$emit('confirm', true)
    }
    this.isVisible = false
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
    &-sora, &-eth {
      margin-right: $inner-spacing-medium;
      font-size: 21px;
    }
  }
}
</style>
