<template>
  <div v-loading="parentLoading || loading" class="container">
    <generic-page-header has-button-back :title="t('addLiquidity.title')" :tooltip="t('pool.description')" @back="handleBack" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="firstTokenValue"
        :decimals="(firstToken || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax((firstToken || {}).address)"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setFirstTokenValue)"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && firstToken" class="input-title">
            <span class="input-title--uppercase">{{ t('createPair.balance') }}</span>
            <span class="input-title--uppercase input-title--primary">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button v-if="isFirstMaxButtonAvailable" class="el-button--max s-typography-button--small" type="primary" alternative size="mini" border-radius="mini" @click="handleMaxValue(firstToken, setFirstTokenValue)">
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" :token="firstToken" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <token-address v-if="firstToken" :name="firstToken.name" :symbol="firstToken.symbol" :address="firstToken.address" class="input-title" />
        </div>
      </s-float-input>
      <s-icon class="icon-divider" name="plus-16" />
      <s-float-input
        class="s-input--token-value"
        size="medium"
        :value="secondTokenValue"
        :decimals="(secondToken || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getMax((secondToken || {}).address)"
        :disabled="!areTokensSelected"
        @input="handleTokenChange($event, setSecondTokenValue)"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && secondToken" class="input-title">
            <span class="input-title--uppercase">{{ t('createPair.balance') }}</span>
            <span class="input-title--uppercase input-title--primary">{{ getTokenBalance(secondToken) }}</span>
          </div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <s-button v-if="isSecondMaxButtonAvailable" class="el-button--max s-typography-button--small" type="primary" alternative size="mini" border-radius="mini" @click="handleMaxValue(secondToken, setSecondTokenValue)">
            {{ t('buttons.max') }}
          </s-button>
          <token-select-button class="el-button--select-token" icon="chevron-down-rounded-16" :token="secondToken" @click="openSelectSecondTokenDialog" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <token-address v-if="secondToken" :name="secondToken.name" :symbol="secondToken.symbol" :address="secondToken.address" class="input-title" />
        </div>
      </s-float-input>
      <s-button type="primary" class="action-button s-typography-button--large" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="openConfirmDialog">
        <template v-if="!areTokensSelected">
          {{ t('buttons.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('addLiquidity.pairIsNotCreated') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>
      <slippage-tolerance class="slippage-tolerance-settings" />
    </s-form>

    <div v-if="areTokensSelected && isAvailable && !isNotFirstLiquidityProvider && emptyAssets" class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.firstLiquidityProvider') }}</p>
      <info-line>
        <template #info-line-prefix>
          <p class="info-line--first-liquidity" v-html="t('createPair.firstLiquidityProviderInfo')" />
        </template>
      </info-line>
    </div>

    <div v-if="areTokensSelected && isAvailable && !emptyAssets" class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.pricePool') }}</p>
      <info-line :label="t('addLiquidity.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol })" :value="formatStringValue(price)" />
      <info-line :label="t('addLiquidity.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })" :value="formatStringValue(priceReversed)" />
      <info-line :label="t('createPair.networkFee')" :value="`${formattedFee} ${KnownSymbols.XOR}`" :tooltip-content="t('networkFeeTooltipText')" />
    </div>

    <div v-if="areTokensSelected && isAvailable && (!emptyAssets || (liquidityInfo || {}).balance)" class="info-line-container">
      <p class="info-line-container__title">{{ t(`createPair.yourPosition${!emptyAssets ? 'Estimated' : ''}`) }}</p>
      <info-line :label="firstToken.symbol" :value="firstTokenPosition" />
      <info-line :label="secondToken.symbol" :value="secondTokenPosition" />
      <info-line :label="t('createPair.shareOfPool')" :value="`${shareOfPool}%`" />
    </div>

    <select-token :visible.sync="showSelectSecondTokenDialog" :connected="isLoggedIn" :asset="firstToken" @select="setSecondTokenAddress($event.address)" />

    <confirm-token-pair-dialog
      :visible.sync="showConfirmDialog"
      :parent-loading="loading"
      :share-of-pool="shareOfPool"
      :first-token="firstToken"
      :second-token="secondToken"
      :first-token-value="firstTokenValue"
      :second-token-value="secondTokenValue"
      :minted="formattedMinted"
      :price="price"
      :price-reversed="priceReversed"
      :slippage-tolerance="slippageTolerance"
      @confirm="handleConfirmAddLiquidity"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { FPNumber, AccountLiquidity, CodecString, KnownAssets, KnownSymbols } from '@sora-substrate/util'

import CreateTokenPairMixin from '@/components/mixins/TokenPairMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

import router, { lazyComponent } from '@/router'
import { Components } from '@/consts'

const namespace = 'addLiquidity'

const TokenPairMixin = CreateTokenPairMixin(namespace)

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    InfoLine: lazyComponent(Components.InfoLine),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress)
  }
})

export default class AddLiquidity extends Mixins(TokenPairMixin, NumberFormatterMixin) {
  @Getter('isNotFirstLiquidityProvider', { namespace }) isNotFirstLiquidityProvider!: boolean
  @Getter('shareOfPool', { namespace }) shareOfPool!: string
  @Getter('liquidityInfo', { namespace }) liquidityInfo!: AccountLiquidity

  @Action('setDataFromLiquidity', { namespace }) setDataFromLiquidity
  @Action('addLiquidity', { namespace }) addLiquidity
  @Action('resetFocusedField', { namespace }) resetFocusedField

  @Action('getAccountLiquidity', { namespace: 'pool' }) getAccountLiquidity!: () => Promise<void>
  @Action('createAccountLiquiditySubscription', { namespace: 'pool' }) createAccountLiquiditySubscription!: () => Promise<() => void>

  readonly delimiters = FPNumber.DELIMITERS_CONFIG

  accountLiquiditySubscription!: () => void

  async created (): Promise<void> {
    this.accountLiquiditySubscription = await this.createAccountLiquiditySubscription()

    await this.withApi(async () => {
      await Promise.all([
        this.getAssets(),
        this.getAccountLiquidity()
      ])

      if (this.firstAddress && this.secondAddress) {
        await this.setDataFromLiquidity({
          firstAddress: this.firstAddress,
          secondAddress: this.secondAddress
        })

        if (!this.liquidityInfo) {
          return this.handleBack()
        }
      } else {
        await this.setFirstTokenAddress(KnownAssets.get(KnownSymbols.XOR).address)
      }
    })
  }

  beforeDestroy (): void {
    if (typeof this.accountLiquiditySubscription === 'function') {
      this.accountLiquiditySubscription() // unsubscribe
    }
  }

  get firstAddress (): string {
    return router.currentRoute.params.firstAddress
  }

  get secondAddress (): string {
    return router.currentRoute.params.secondAddress
  }

  get chooseTokenClasses (): string {
    const buttonClass = 'el-button'
    const classes = [buttonClass, buttonClass + '--choose-token']

    if (this.secondAddress) {
      classes.push(`${buttonClass}--disabled`)
    }

    return classes.join(' ')
  }

  get emptyAssets (): boolean {
    if (!(this.firstTokenValue || this.secondTokenValue)) {
      return true
    }
    const first = new FPNumber(this.firstTokenValue)
    const second = new FPNumber(this.secondTokenValue)
    return (first.isNaN() || first.isZero()) || (second.isNaN() || second.isZero())
  }

  get firstTokenPosition (): string {
    return this.getTokenPosition(this.liquidityInfo?.firstBalance, this.firstTokenValue)
  }

  get secondTokenPosition (): string {
    return this.getTokenPosition(this.liquidityInfo?.secondBalance, this.secondTokenValue)
  }

  getTokenPosition (liquidityInfoBalance: string | undefined, tokenValue: string | CodecString | number): string {
    const prevPosition = FPNumber.fromCodecValue(liquidityInfoBalance ?? 0)
    if (!this.emptyAssets) {
      return prevPosition.add(new FPNumber(tokenValue)).toLocaleString()
    }
    return prevPosition.toLocaleString()
  }

  updatePrices (): void {
    this.getPrices({
      assetAAddress: this.firstAddress ?? this.firstToken.address,
      assetBAddress: this.secondAddress ?? this.secondToken.address,
      amountA: this.firstTokenValue,
      amountB: this.secondTokenValue
    })
  }

  handleConfirmAddLiquidity (): Promise<void> {
    return this.handleConfirm(this.addLiquidity)
  }
}
</script>

<style lang="scss">
.el-form--actions {
  .s-input--token-value .el-input .el-input__inner {
    @include text-ellipsis;
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include generic-input-lines;
  @include buttons;
  @include full-width-button('action-button');
}
@include vertical-divider('icon-divider', $inner-spacing-medium);
@include vertical-divider('el-divider');
</style>
