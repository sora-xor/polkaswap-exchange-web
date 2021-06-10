<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('confirmBridgeTransactionDialog.confirmTransaction')"
  >
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
      :tooltip-content="t('networkFeeTooltipText')"
      :value="formatFee(soraNetworkFee, formattedSoraNetworkFee)"
      :asset-symbol="KnownSymbols.XOR"
    />
    <info-line
      :label="t('bridge.ethereumNetworkFee')"
      :tooltip-content="t('ethNetworkFeeTooltipText')"
      :value="formatFee(evmNetworkFee, formattedEvmNetworkFee)"
      :asset-symbol="currentEvmTokenSymbol"
    />
    <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
    <!-- <info-line
      :label="t('bridge.total')"
      :tooltip-content="t('bridge.tooltipValue')"
      :value="`~${soraTotal}`"
      :asset-symbol="KnownSymbols.XOR"
    /> -->
    <template #footer>
      <s-button type="primary" class="s-typography-button--big" :loading="loading" :disabled="!isValidNetworkType" @click="handleConfirm">
        <template v-if="!isValidNetworkType">
          {{ t('confirmBridgeTransactionDialog.changeNetwork') }}
        </template>
        <template v-else-if="isEthereumToSoraConfirmation">
          {{ t('confirmBridgeTransactionDialog.confirm', { direction: t('confirmBridgeTransactionDialog.sora') }) }}
        </template>
        <template v-else>
          {{ t('confirmBridgeTransactionDialog.buttonConfirm') }}
        </template>
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { KnownSymbols, CodecString, BridgeNetworks } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import DialogBase from '@/components/DialogBase.vue'
import { lazyComponent } from '@/router'
import { Components, EvmSymbol } from '@/consts'
import { formatAssetSymbol } from '@/utils'

const namespace = 'bridge'

@Component({
  components: {
    DialogBase,
    InfoLine: lazyComponent(Components.InfoLine)
  }
})
export default class ConfirmBridgeTransactionDialog extends Mixins(
  TranslationMixin,
  DialogMixin,
  LoadingMixin,
  NetworkFormatterMixin,
  NumberFormatterMixin
) {
  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean
  @Getter('isSoraToEvm', { namespace }) isSoraToEvm!: boolean
  @Getter('asset', { namespace }) asset!: any
  @Getter('amount', { namespace }) amount!: string
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString
  @Getter('evmNetworkFee', { namespace }) evmNetworkFee!: CodecString
  @Getter('evmNetwork', { namespace: 'web3' }) evmNetwork!: BridgeNetworks
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm
  @Action('setTransactionStep', { namespace }) setTransactionStep

  // TODO: Check/Ask if the Bridge could have the same errors as other projects
  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean
  @Prop({ default: false, type: Boolean }) readonly isEthereumToSoraConfirmation!: boolean

  EvmSymbol = EvmSymbol
  KnownSymbols = KnownSymbols
  formatAssetSymbol = formatAssetSymbol

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
    if (!fee) {
      return '-'
    }
    if (fee === '0') {
      return fee
    }
    return `~${formattedFee}`
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
  line-height: $s-line-height-small;
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
  letter-spacing: $s-letter-spacing-mini;
  &-value {
    margin-right: $inner-spacing-medium;
  }
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
  &-evm {
    @include evm-logo-styles;
  }
  .s-icon {
    &-sora, &-eth {
      margin-right: $inner-spacing-medium;
    }
  }
}
</style>
