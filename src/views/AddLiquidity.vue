<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header has-button-back :title="t('addLiquidity.title')" :tooltip="t('pool.description')" @back="handleBack" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <div class="input-container">
        <div class="input-line-header">
          <div class="input-title p4">{{ t('createPair.deposit') }}</div>
          <div v-if="isLoggedIn && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div class="input-line-content">
          <s-form-item>
            <s-float-input
              class="s-input--token-value"
              :value="firstTokenValue"
              :decimals="(firstToken || {}).decimals"
              :max="getMax((firstToken || {}).address)"
              :disabled="!areTokensSelected"
              @input="handleTokenChange($event, setFirstTokenValue)"
              @blur="resetFocusedField"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button v-if="isFirstMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue(firstToken, setFirstTokenValue)">
              {{ t('buttons.max') }}
            </s-button>
            <s-button class="el-button--choose-token el-button--disabled" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>
      <s-icon class="icon-divider" name="plus-16" />
      <div class="input-container">
        <div class="input-line-header">
          <div class="input-title p4">
            <span>{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isLoggedIn && secondToken" class="token-balance">
            <span class="token-balance-title">{{ t('exchange.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(secondToken) }}</span>
          </div>
        </div>
        <div class="input-line-content">
          <s-form-item>
            <s-float-input
              class="s-input--token-value"
              :value="secondTokenValue"
              :decimals="(secondToken || {}).decimals"
              :max="getMax((secondToken || {}).address)"
              :disabled="!areTokensSelected"
              @input="handleTokenChange($event, setSecondTokenValue)"
              @blur="resetFocusedField"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button v-if="isSecondMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue(secondToken, setSecondTokenValue)">
              {{ t('buttons.max') }}
            </s-button>
            <s-button
              :class="chooseTokenClasses"
              type="tertiary"
              size="small"
              border-radius="medium"
              :icon="!secondAddress ? 'chevron-down-rounded-16' : undefined"
              icon-position="right"
              @click="!secondAddress ? openSelectSecondTokenDialog() : undefined"
            >
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-down-rounded-16" icon-position="right" @click="openSelectSecondTokenDialog">
            {{ t('buttons.chooseToken') }}
          </s-button>
        </div>
      </div>
        <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="openConfirmDialog">
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
      <p class="p2">{{ t('createPair.firstLiquidityProvider') }}</p>
      <info-line>
        <template #info-line-prefix>
          <p class="info-line--first-liquidity" v-html="t('createPair.firstLiquidityProviderInfo')" />
        </template>
      </info-line>
    </div>

    <div v-if="areTokensSelected && isAvailable && !emptyAssets" class="info-line-container">
      <p class="p2">{{ t('createPair.pricePool') }}</p>
      <info-line :label="t('addLiquidity.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol })" :value="price" />
      <info-line :label="t('addLiquidity.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })" :value="priceReversed" />
      <info-line :label="t('createPair.shareOfPool')" :value="`${shareOfPool}%`" />
      <info-line :label="t('createPair.networkFee')" :value="`${formattedFee} ${KnownSymbols.XOR}`" />
    </div>

    <div v-if="areTokensSelected && isAvailable && (!emptyAssets || (liquidityInfo || {}).balance)" class="info-line-container">
      <p class="p2">{{ t(`createPair.yourPosition${!emptyAssets ? 'Estimated' : ''}`) }}</p>
      <info-line
        :label="t('createPair.firstSecondPoolTokens', { first: firstToken.symbol, second: secondToken.symbol })"
        :value="poolTokenPosition"
      >
        <template #info-line-prefix>
          <pair-token-logo class="pair-token-logo" :first-token="firstToken" :second-token="secondToken" size="mini" />
        </template>
      </info-line>
      <s-divider />
      <info-line :label="firstToken.symbol" :value="firstTokenPosition" />
      <info-line :label="secondToken.symbol" :value="secondTokenPosition" />
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
import { FPNumber, AccountLiquidity, CodecString } from '@sora-substrate/util'

import CreateTokenPairMixin from '@/components/mixins/TokenPairMixin'

import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'

const namespace = 'addLiquidity'

const TokenPairMixin = CreateTokenPairMixin(namespace)

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    InfoLine: lazyComponent(Components.InfoLine),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmTokenPairDialog: lazyComponent(Components.ConfirmTokenPairDialog)
  }
})

export default class AddLiquidity extends Mixins(TokenPairMixin) {
  @Getter('isNotFirstLiquidityProvider', { namespace }) isNotFirstLiquidityProvider!: boolean
  @Getter('shareOfPool', { namespace }) shareOfPool!: string
  @Getter('accountLiquidity', { namespace: 'pool' }) accountLiquidity!: Array<AccountLiquidity>

  @Action('setDataFromLiquidity', { namespace }) setDataFromLiquidity
  @Action('addLiquidity', { namespace }) addLiquidity
  @Action('resetFocusedField', { namespace }) resetFocusedField

  @Action('updateAccountLiquidity', { namespace: 'pool' }) updateAccountLiquidity
  @Action('destroyUpdateAccountLiquiditySubscription', { namespace: 'pool' }) destroyUpdateAccountLiquiditySubscription

  destroyed (): void {
    this.destroyUpdateAccountLiquiditySubscription()
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

  get liquidityInfo () {
    return this.accountLiquidity.find(l => l.firstAddress === this.firstToken?.address && l.secondAddress === this.secondToken?.address)
  }

  get emptyAssets (): boolean {
    if (!(this.firstTokenValue || this.secondTokenValue)) {
      return true
    }
    const first = new FPNumber(this.firstTokenValue)
    const second = new FPNumber(this.secondTokenValue)
    return (first.isNaN() || first.isZero()) || (second.isNaN() || second.isZero())
  }

  get poolTokenPosition (): string {
    return this.getTokenPosition(this.liquidityInfo?.balance, this.minted, true)
  }

  get firstTokenPosition (): string {
    return this.getTokenPosition(this.liquidityInfo?.firstBalance, this.firstTokenValue)
  }

  get secondTokenPosition (): string {
    return this.getTokenPosition(this.liquidityInfo?.secondBalance, this.secondTokenValue)
  }

  async afterApiConnect (): Promise<void> {
    await this.updateAccountLiquidity()

    if (this.firstAddress && this.secondAddress) {
      await this.setDataFromLiquidity({
        firstAddress: this.firstAddress,
        secondAddress: this.secondAddress
      })
    }
    // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
    if (this.firstAddress && this.secondAddress && !this.liquidityInfo) {
      router.push({ name: PageNames.Pool })
    }
  }

  getTokenPosition (liquidityInfoBalance: string | undefined, tokenValue: string | CodecString | number, isPoolToken = false): string {
    const prevPosition = FPNumber.fromCodecValue(liquidityInfoBalance ?? 0)
    if (!this.emptyAssets) {
      return prevPosition.add(isPoolToken ? FPNumber.fromCodecValue(tokenValue) : new FPNumber(tokenValue)).format()
    }
    return prevPosition.format()
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
  @include input-form-styles;
  @include full-width-button;
}
.input-container {
  @include buttons;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
