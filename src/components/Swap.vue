<template>
  <s-form
    v-model="formModel"
    class="el-form--swap"
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
            :disabled="!areTokensSelected"
            @change="handleChangeFieldFrom"
            @blur="handleBlurFieldFrom"
          />
        </s-form-item>
        <div v-if="tokenFrom" class="token">
          <!-- TODO: Fix secondary сolors in UI Library and project -->
          <s-button v-if="connected && areTokensSelected" class="el-button--max" type="tertiary" size="small" borderRadius="mini" @click="handleMaxFromValue">
            {{ t('exchange.max') }}
          </s-button>
          <s-button class="el-button--choose-token" type="tertiary" size="small" borderRadius="medium" icon="chevron-bottom-rounded" @click="openSelectTokenDialog(true)">
            <token-logo :token="tokenFrom" size="small" />
            {{ tokenFrom.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" borderRadius="mini" icon="chevron-bottom-rounded" @click="openSelectTokenDialog(true)">
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
            :disabled="!areTokensSelected"
            @change="handleChangeFieldTo"
            @blur="handleBlurFieldTo"
          />
        </s-form-item>
        <div v-if="tokenTo" class="token">
          <s-button class="el-button--choose-token" type="tertiary" size="small" borderRadius="medium" icon="chevron-bottom-rounded" @click="openSelectTokenDialog">
            <token-logo :token="tokenTo" size="small" />
            {{ tokenTo.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" borderRadius="mini" icon="chevron-bottom-rounded" @click="openSelectTokenDialog">
          {{ t('swap.chooseToken') }}
        </s-button>
      </div>
    </div>
    <swap-info v-if="areTokensSelected" :showPrice="true" :showSlippageTolerance="true" />
    <s-button v-if="!connected" type="primary" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <!-- <template v-if="!areTokensSelected">
      {{ t('swap.chooseTokens') }}
    </template> -->
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
    <swap-info v-if="areTokensSelected" />
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
    // TODO 4 alexnatalia - What is a point to change to give access to change tis field. We can't calculate the second value - just copy it
    if (this.areTokensSelected && !this.isFieldToFocused) {
      this.isFieldFromFocused = true
      if (+this.formModel.from === 0) {
        this.formModel.to = formatNumber(0, 4)
      } else {
        this.formModel.to = formatNumber(+this.formModel.from * this.tokenFrom.price / this.tokenTo.price, 4)
      }
      this.setToValue(this.formModel.to)
    }
    this.setFromValue(this.formModel.from)
  }

  handleChangeFieldTo (): void {
    if (this.areTokensSelected && !this.isFieldFromFocused) {
      this.isFieldToFocused = true
      if (+this.formModel.to === 0) {
        this.formModel.from = formatNumber(0, 4)
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
.el-form--swap {
  @include s-input-styles;
  @include token-buttons-styles;
}
</style>

<style lang="scss" scoped>
.el-form--swap {
  display: flex;
  flex-direction: column;
  align-items: center;
  .input-container {
    position: relative;
    padding: $inner-spacing-small $inner-spacing-medium $inner-spacing-mini;
    width: 100%;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-mini);
    .input-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      + .input-line {
        margin-top: $inner-spacing-small;
      }
    }
    .el-form-item {
      margin-bottom: 0;
      width: 50%;
    }
    .input-title,
    .token-balance {
      display: inline-flex;
      align-items: baseline;
    }
    .input-title {
      font-weight: $s-font-weight-medium;
      &-estimated {
        margin-left: $inner-spacing-mini / 2;
        font-size: var(--s-font-size-mini);
        font-weight: $s-font-weight-mini;
      }
    }
    @include token-styles;
  }
  .s-input {
    min-height: 0;
  }
  .s-tertiary {
    padding: $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini;
  }
  .el-button {
    &--switch-tokens {
      &,
      & + .input-container {
        margin-top: $inner-spacing-mini;
      }
    }
    &--max,
    &--empty-token,
    &--choose-token {
      font-weight: $s-font-weight-big;
      font-feature-settings: $s-font-feature-settings-title;
    }
    &--max {
      margin-right: $inner-spacing-mini;
      padding-right: $inner-spacing-mini;
      height: var(--s-size-mini);
    }
    &--empty-token {
      position: absolute;
      right: $inner-spacing-mini;
      bottom: $inner-spacing-mini;
    }
    &--choose-token {
      margin-left: 0;
      margin-right: -$inner-spacing-mini;
      padding-left: $inner-spacing-mini / 2;
      background-color: var(--s-color-base-background);
      border-color: var(--s-color-base-background);
      color: var(--s-color-base-content-primary);
      &:hover, &:active, &:focus {
        background-color: var(--s-color-base-background-hover);
        border-color: var(--s-color-base-background-hover);
        color: var(--s-color-base-content-primary);
      }
    }
  }
  .s-primary {
    margin-top: $inner-spacing-medium;
    width: 100%;
  }
}
</style>
