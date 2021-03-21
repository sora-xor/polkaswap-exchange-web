<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header has-button-back :title="t('addLiquidity.title')" :tooltip="t('pool.description')" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('createPair.deposit') }}</div>
          <div v-if="connected && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-float-input
              class="s-input--token-value"
              :decimals="firstToken && firstToken.decimals"
              :value="firstTokenValue"
              :disabled="!areTokensSelected"
              @input="handleTokenChange($event, setFirstTokenValue)"
              @blur="resetFocusedField"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button v-if="isFirstMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue(firstToken, setFirstTokenValue)">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>
      <s-icon class="icon-divider" name="plus-16" />
      <div :class="computedClasses">
        <div class="input-line">
          <div class="input-title">
            <span>{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="connected && secondToken" class="token-balance">
            <span class="token-balance-title">{{ t('exchange.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(secondToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-float-input
              class="s-input--token-value"
              :decimals="secondToken && secondToken.decimals"
              :value="secondTokenValue"
              :disabled="!areTokensSelected"
              @input="handleTokenChange($event, setSecondTokenValue)"
              @blur="resetFocusedField"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button v-if="isSecondMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue(secondToken, setSecondTokenValue)">
              {{ t('exchange.max') }}
            </s-button>
            <s-button
              class="el-button--choose-token"
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
            {{ t('exchange.chooseToken') }}
          </s-button>
        </div>
      </div>
        <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="openConfirmDialog">
        <template v-if="!areTokensSelected">
          {{ t('exchange.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('addLiquidity.pairIsNotCreated') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('exchange.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>
    </s-form>

    <info-card
      v-if="areTokensSelected && isAvailable && !isNotFirstLiquidityProvider && emptyAssets"
      :title="t('createPair.firstLiquidityProvider')"
    >
      <div class="card__data">
        <p v-html="t('createPair.firstLiquidityProviderInfo')" />
      </div>
    </info-card>

    <info-card v-if="areTokensSelected && isAvailable && !emptyAssets" :title="t('createPair.pricePool')">
      <div class="card__data">
        <div>
          {{
            t('createPair.firstPerSecond', {
              first: firstToken.symbol,
              second: secondToken.symbol
            })
          }}
        </div>
        <div>{{ price }}</div>
      </div>
      <div class="card__data">
        <div>
          {{
            t('createPair.firstPerSecond', {
              first: secondToken.symbol,
              second: firstToken.symbol
            })
          }}
        </div>
        <div>{{ priceReversed }}</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.shareOfPool') }}</div>
        <div>{{ shareOfPool }}%</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.networkFee') }}</div>
        <div>{{ formattedFee }} {{ KnownSymbols.XOR }}</div>
      </div>
    </info-card>

    <info-card
      v-if="areTokensSelected && isAvailable && (!emptyAssets || (liquidityInfo || {}).balance)"
      :title="t(`createPair.yourPosition${!emptyAssets ? 'Estimated' : ''}`)"
    >
      <div class="card__data card__data_assets">
        <s-row flex>
          <pair-token-logo class="pair-token-logo" :first-token="firstToken" :second-token="secondToken" size="mini" />
          {{
            t('createPair.firstSecondPoolTokens', {
              first: firstToken.symbol,
              second: secondToken.symbol
            })
          }}
        </s-row>
        <div>{{ poolTokenPosition }}</div>
      </div>
      <s-divider />
      <div class="card__data">
        <div>{{ firstToken.symbol }}</div>
        <div>{{ firstTokenPosition }}</div>
      </div>
      <div class="card__data">
        <div>{{ secondToken.symbol }}</div>
        <div>{{ secondTokenPosition }}</div>
      </div>
    </info-card>

    <select-token :visible.sync="showSelectFirstTokenDialog" :connected="connected" account-assets-only not-null-balance-only :asset="secondToken" @select="setFirstTokenAddress($event.address)" />
    <select-token :visible.sync="showSelectSecondTokenDialog" :connected="connected" :asset="firstToken" @select="setSecondTokenAddress($event.address)" />

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
    InfoCard: lazyComponent(Components.InfoCard),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
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

  get firstAddress (): string {
    return this.$route.params.firstAddress
  }

  get secondAddress (): string {
    return this.$route.params.secondAddress
  }

  get computedClasses (): string {
    const componentClass = 'input-container'
    const classes = [componentClass, componentClass + '--second']

    if (this.secondAddress) {
      classes.push(`${componentClass}--disabled-select`)
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
  @include buttons(true);
  &--second:not(.input-container--disabled-select) {
    @include buttons();
  }
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
