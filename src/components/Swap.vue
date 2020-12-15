<template>
  <s-form
    v-model="formModel"
    class="el-form--actions"
    :show-message="false"
  >
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">{{ t('exchange.from') }}</div>
        <div v-if="connected && tokenFrom" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ getTokenBalance(tokenFrom) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-input
            v-model="formModel.from"
            v-float="formModel.from"
            class="s-input--token-value"
            :placeholder="inputPlaceholder"
            @change="handleChangeFieldFrom"
            @blur="handleBlurFieldFrom"
          />
        </s-form-item>
        <div v-if="tokenFrom" class="token">
          <s-button v-if="connected && areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxFromValue">
            {{ t('exchange.max') }}
          </s-button>
          <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog(true)">
            <token-logo :token="tokenFrom" size="small" />
            {{ tokenFrom.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog(true)">
          {{ t('swap.chooseToken') }}
        </s-button>
      </div>
    </div>
    <s-button class="el-button--switch-tokens" type="action" icon="change-positions" @click="handleSwitchTokens" />
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">
          <span>{{ t('exchange.to') }}</span>
          <span v-if="tokenTo" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="connected && tokenTo" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ getTokenBalance(tokenTo) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-input
            v-model="formModel.to"
            v-float="formModel.to"
            class="s-input--token-value"
            :placeholder="inputPlaceholder"
            @change="handleChangeFieldTo"
            @blur="handleBlurFieldTo"
          />
        </s-form-item>
        <div v-if="tokenTo" class="token">
          <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog">
            <token-logo :token="tokenTo" size="small" />
            {{ tokenTo.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog">
          {{ t('swap.chooseToken') }}
        </s-button>
      </div>
    </div>
    <swap-info v-if="connected && areTokensSelected" :show-price="true" :show-slippage-tolerance="true" />
    <s-button v-if="!connected" type="primary" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button v-else type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance" @click="handleConfirmSwap">
      <template v-if="isEmptyBalance">
        {{ t('swap.enterAmount') }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('swap.insufficientBalance', { tokenSymbol: tokenFrom.symbol }) }}
      </template>
      <template v-else>
        {{ t('exchange.Swap') }}
      </template>
    </s-button>
    <swap-info v-if="connected && areTokensSelected" />
    <select-token :visible.sync="showSelectTokenDialog" @select="selectToken" />

    <confirm-swap :visible.sync="showConfirmSwapDialog" @confirm="confirmSwap" />
    <result-dialog :visible.sync="isSwapConfirmed" :type="t('exchange.Swap')" :message="resultMessage" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { formatNumber, isWalletConnected } from '@/utils'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'

@Component({
  components: {
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SelectToken: lazyComponent(Components.SelectToken),
    ConfirmSwap: lazyComponent(Components.ConfirmSwap),
    ResultDialog: lazyComponent(Components.ResultDialog)
  }
})
export default class Swap extends Mixins(TranslationMixin) {
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number
  @Getter toValue!: number
  @Action setTokenFrom
  @Action setTokenTo
  @Action setFromValue
  @Action setToValue
  @Action setTokenFromPrice

  inputPlaceholder: string = formatNumber(0, 2)
  isFieldFromFocused = false
  isFieldToFocused = false
  isTokenFromSelected = false
  showSelectTokenDialog = false
  showConfirmSwapDialog = false
  isSwapConfirmed = false

  formModel = {
    from: formatNumber(0, 1),
    to: formatNumber(0, 1)
  }

  get connected (): boolean {
    return isWalletConnected()
  }

  get areTokensSelected (): boolean {
    return this.tokenFrom && this.tokenTo
  }

  get isEmptyBalance (): boolean {
    return +this.formModel.from === 0 || +this.formModel.to === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.areTokensSelected) {
      return +this.formModel.from > this.tokenFrom.balance
    }
    return true
  }

  get resultMessage (): string {
    return this.t('swap.transactionMessage', {
      tokenFromValue: this.getSwapValue(this.tokenFrom, this.fromValue),
      tokenToValue: this.getSwapValue(this.tokenTo, this.toValue)
    })
  }

  getSwapValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  getTokenBalance (token: any): string {
    if (token) {
      return formatNumber(token.balance, 2)
    }
    return ''
  }

  handleChangeFieldFrom (): void {
    if (!this.isFieldToFocused) {
      this.isFieldFromFocused = true
      if (!this.connected || !this.areTokensSelected || +this.formModel.from === 0) {
        this.formModel.to = formatNumber(0, 1)
      } else {
        this.formModel.to = formatNumber(+this.formModel.from * this.tokenFrom.price / this.tokenTo.price, 4)
      }
      this.setToValue(this.formModel.to)
    }
    this.setFromValue(this.formModel.from)
  }

  handleChangeFieldTo (): void {
    if (!this.isFieldFromFocused) {
      this.isFieldToFocused = true
      if (!this.connected || !this.areTokensSelected || +this.formModel.to === 0) {
        this.formModel.from = formatNumber(0, 1)
      } else {
        this.formModel.from = formatNumber(+this.formModel.to * this.tokenTo.price / this.tokenFrom.price, 4)
      }
      this.setFromValue(this.formModel.from)
    }
    this.setToValue(this.formModel.to)
  }

  handleBlurFieldFrom (): void {
    this.isFieldFromFocused = false
  }

  handleBlurFieldTo (): void {
    this.isFieldToFocused = false
  }

  handleSwitchTokens (): void {
    const currentTokenFrom = this.tokenFrom
    const currentFieldFromValue = this.formModel.from
    this.isFieldFromFocused = true
    this.isFieldToFocused = true
    this.setTokenFrom(this.tokenTo)
    this.setTokenTo(currentTokenFrom)
    this.formModel.from = this.formModel.to
    this.formModel.to = currentFieldFromValue
    this.isFieldFromFocused = false
    this.isFieldToFocused = false
    this.setTokenFromPrice(true)
  }

  handleMaxFromValue (): void {
    this.formModel.from = this.tokenFrom.balance
  }

  handleConnectWallet (): void {
    router.push({ name: PageNames.Wallet })
  }

  openSelectTokenDialog (isTokenFrom: boolean): void {
    if (isTokenFrom) {
      this.isTokenFromSelected = true
    }
    this.showSelectTokenDialog = true
  }

  selectToken (token: any): void {
    if (token) {
      console.log('selected token: ', token)
      // TODO 4 alexnatalia: Add Account token if connected
      if (this.isTokenFromSelected) {
        this.setTokenFrom(token)
        this.isTokenFromSelected = false
      } else {
        this.setTokenTo(token)
      }
    }
  }

  handleConfirmSwap (): void {
    this.showConfirmSwapDialog = true
  }

  confirmSwap (isSwapConfirmed: boolean): void {
    this.isSwapConfirmed = isSwapConfirmed
  }

  submitSwap (message: string): void {
    this.$notify({
      message: message,
      title: this.t('exchange.Swap'),
      type: 'success'
    })
  }
}
</script>

<style lang="scss">
.el-form--actions {
  .el-button--switch-tokens {
    @include switch-button-inherit-styles('medium');
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
  @include vertical-divider('el-button--switch-tokens');

  .input-title-estimated {
    margin-left: $inner-spacing-mini / 2;
    font-size: var(--s-font-size-mini);
    @include font-weight;
  }

  .el-button--switch-tokens {
    @include switch-button(var(--s-size-medium));
  }
}
</style>
