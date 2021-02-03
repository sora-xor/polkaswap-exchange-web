<template>
  <div class="container" v-loading="parentLoading">
    <generic-header :title="t('addLiquidity.title')" :tooltip="t('pool.description')" />
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
            <!-- v-model="addLiquidityModel.firstTokenValue" -->
            <s-input
              v-float
              class="s-input--token-value"
              :value="firstTokenValue"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="setFirstTokenValue"
              @blur="handleInputBlur(true)"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button v-if="isFirstMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleFirstMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>
      <s-icon class="icon-divider" name="plus-rounded" size="medium" />
      <div class="input-container">
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
            <!-- v-model="addLiquidityModel.secondTokenValue" -->
            <s-input
              v-float
              class="s-input--token-value"
              :value="secondTokenValue"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="setSecondTokenValue"
              @blur="handleInputBlur(false)"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button v-if="isSecondMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleSecondMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
            {{ t('exchange.chooseToken') }}
          </s-button>
        </div>
      </div>
        <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="showConfirmDialog = true">
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
        <div>{{ price }} {{ firstToken.symbol }}</div>
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
        <div>{{ priceReversed }} {{ secondToken.symbol }}</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.shareOfPool') }}</div>
        <div>{{ shareOfPool }}%</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.networkFee') }}</div>
        <div>{{ fee }} {{ KnownSymbols.XOR }}</div>
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

    <select-token :visible.sync="showSelectFirstTokenDialog" account-assets-only not-null-balance-only :asset="secondToken" @select="setFirstToken" />
    <select-token :visible.sync="showSelectSecondTokenDialog" :asset="firstToken" @select="setSecondToken" />

    <confirm-add-liquidity :visible.sync="showConfirmDialog" @confirm="handleConfirmAddLiquidity" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { AccountAsset, KnownAssets, KnownSymbols, FPNumber } from '@sora-substrate/util'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'
import router, { lazyComponent } from '@/router'
import { formatNumber, isNumberValue, isWalletConnected, isMaxButtonAvailable, getMaxValue, isXorAccountAsset } from '@/utils'
import { Components, PageNames } from '@/consts'

const namespace = 'addLiquidity'

@Component({
  components: {
    GenericHeader: lazyComponent(Components.GenericHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    InfoCard: lazyComponent(Components.InfoCard),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmAddLiquidity: lazyComponent(Components.ConfirmAddLiquidity)
  }
})
export default class AddLiquidity extends Mixins(TransactionMixin, LoadingMixin, InputFormatterMixin) {
  readonly KnownSymbols = KnownSymbols

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number
  @Getter('isAvailable', { namespace }) isAvailable!: boolean
  @Getter('isNotFirstLiquidityProvider', { namespace }) isNotFirstLiquidityProvider!: boolean
  @Getter('minted', { namespace }) minted!: string
  @Getter('fee', { namespace }) fee!: string
  @Getter('shareOfPool', { namespace }) shareOfPool!: string
  @Getter('price', { namespace: 'prices' }) price!: string | number
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string | number
  @Getter('accountLiquidity', { namespace: 'pool' }) accountLiquidity!: Array<any>

  @Action('setDataFromLiquidity', { namespace }) setDataFromLiquidity
  @Action('setFirstToken', { namespace }) setFirstToken
  @Action('setSecondToken', { namespace }) setSecondToken
  @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
  @Action('setSecondTokenValue', { namespace }) setSecondTokenValue
  @Action('getNetworkFee', { namespace }) getNetworkFee
  @Action('addLiquidity', { namespace }) addLiquidity
  @Action('resetFocusedField', { namespace }) resetFocusedField
  @Action('resetData', { namespace }) resetData
  @Action('getPrices', { namespace: 'prices' }) getPrices
  @Action('resetPrices', { namespace: 'prices' }) resetPrices

  showSelectFirstTokenDialog = false
  showSelectSecondTokenDialog = false
  inputPlaceholder: string = formatNumber(0, 1)
  insufficientBalanceTokenSymbol = ''
  showConfirmDialog = false
  isCreatePairConfirmed = false

  addLiquidityModel = {
    firstTokenValue: '',
    secondTokenValue: ''
  }

  async mounted () {
    this.resetData()
    this.resetPrices()
    this.insufficientBalanceTokenSymbol = ''

    await this.withApi(async () => {
      await this.setFirstToken(KnownAssets.get(KnownSymbols.XOR))

      if (this.firstAddress && this.secondAddress) {
        await this.setDataFromLiquidity({
          firstAddress: this.firstAddress,
          secondAddress: this.secondAddress
        })
      }
    })
  }

  get firstAddress (): string {
    return this.$route.params.firstAddress
  }

  get secondAddress (): string {
    return this.$route.params.secondAddress
  }

  get connected (): boolean {
    return isWalletConnected()
  }

  get isFirstMaxButtonAvailable (): boolean {
    return isMaxButtonAvailable(this.areTokensSelected, this.firstToken, this.firstTokenValue, this.fee)
  }

  get isSecondMaxButtonAvailable (): boolean {
    return isMaxButtonAvailable(this.areTokensSelected, this.secondToken, this.secondTokenValue, this.fee)
  }

  get liquidityInfo () {
    return this.accountLiquidity.find(l => l.firstAddress === this.firstToken.address && l.secondAddress === this.secondToken.address)
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
    const prevPosition = new FPNumber(this.liquidityInfo ? this.liquidityInfo.balance : 0)
    if (!this.emptyAssets) {
      return prevPosition.add(new FPNumber(this.minted)).toString()
    }
    return prevPosition.toString()
  }

  get firstTokenPosition (): string {
    const prevPosition = new FPNumber(this.liquidityInfo ? this.liquidityInfo.firstBalance : 0)
    if (!this.emptyAssets) {
      return prevPosition.add(new FPNumber(this.firstTokenValue)).toString()
    }
    return prevPosition.toString()
  }

  get secondTokenPosition (): string {
    const prevPosition = new FPNumber(this.liquidityInfo ? this.liquidityInfo.secondBalance : 0)
    if (!this.emptyAssets) {
      return prevPosition.add(new FPNumber(this.secondTokenValue)).toString()
    }
    return prevPosition.toString()
  }

  get areTokensSelected (): boolean {
    return this.firstToken && this.secondToken
  }

  get isEmptyBalance (): boolean {
    if (+this.firstTokenValue === 0 || +this.secondTokenValue === 0) {
      return true
    }
    this.updatePrices()
    return false
  }

  get isInsufficientBalance (): boolean {
    if (this.connected && this.areTokensSelected) {
      if (isXorAccountAsset(this.firstToken) || isXorAccountAsset(this.secondToken)) {
        if (this.hasInsufficientBalance(this.firstToken, this.firstTokenValue, this.fee)) {
          this.insufficientBalanceTokenSymbol = this.firstToken.symbol
          return true
        }
        if (this.hasInsufficientBalance(this.secondToken, this.secondTokenValue, this.fee)) {
          this.insufficientBalanceTokenSymbol = this.secondToken.symbol
          return true
        }
      }
    }
    return false
  }

  hasInsufficientBalance (asset: AccountAsset, amount: number, fee: string): boolean {
    if (+asset.balance === 0) {
      return true
    }
    const decimals = asset.decimals
    const fpBalance = new FPNumber(asset.balance, decimals)
    const fpAmount = new FPNumber(amount, decimals)
    if (isXorAccountAsset(asset)) {
      const fpFee = new FPNumber(fee, decimals)
      return FPNumber.lt(fpBalance, fpAmount.add(fpFee))
    }
    return FPNumber.lt(fpBalance, fpAmount)
  }

  getTokenValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  // We don't need it for now
  // openSelectFirstTokenDialog (): void {
  //   this.showSelectFirstTokenDialog = true
  // }

  openSelectSecondTokenDialog (): void {
    this.showSelectSecondTokenDialog = true
  }

  async handleFirstMaxValue (): Promise<void> {
    await this.getNetworkFee()
    this.setFirstTokenValue(getMaxValue(this.firstToken, this.fee))
  }

  async handleSecondMaxValue (): Promise<void> {
    await this.getNetworkFee()
    this.setSecondTokenValue(getMaxValue(this.secondToken, this.fee))
  }

  updatePrices (): void {
    this.getPrices({
      assetAAddress: this.firstAddress ? this.firstAddress : this.firstToken.address,
      assetBAddress: this.secondAddress ? this.secondAddress : this.secondToken.address,
      amountA: this.firstTokenValue,
      amountB: this.secondTokenValue
    })
  }

  async handleFirstTokenChange (): Promise<any> {
    this.addLiquidityModel.firstTokenValue = this.formatNumberField(this.addLiquidityModel.firstTokenValue)
    if (!isNumberValue(this.addLiquidityModel.firstTokenValue)) {
      await this.promiseTimeout()
      this.resetInputField()
      return
    }
    this.setFirstTokenValue(this.addLiquidityModel.firstTokenValue)
    this.updatePrices()
  }

  async handleSecondTokeChange (): Promise<any> {
    this.addLiquidityModel.secondTokenValue = this.formatNumberField(this.addLiquidityModel.secondTokenValue)
    if (!isNumberValue(this.addLiquidityModel.secondTokenValue)) {
      await this.promiseTimeout()
      this.resetInputField(false)
      return
    }
    this.setSecondTokenValue(this.addLiquidityModel.secondTokenValue)
    this.updatePrices()
  }

  resetInputField (isFirstTokenField = true): void {
    if (isFirstTokenField) {
      this.setFirstTokenValue(0)
      return
    }
    this.setSecondTokenValue(0)
  }

  handleInputBlur (isFirstToken: boolean): void {
    // if (isFirstToken) {
    //   if (+this.addLiquidityModel.firstTokenValue === 0) {
    //     this.resetInputField()
    //   } else {
    //     this.addLiquidityModel.firstTokenValue = this.trimNeedlesSymbols(this.addLiquidityModel.firstTokenValue)
    //   }
    // } else {
    //   if (+this.addLiquidityModel.secondTokenValue === 0) {
    //     this.resetInputField(false)
    //   } else {
    //     this.addLiquidityModel.secondTokenValue = this.trimNeedlesSymbols(this.addLiquidityModel.secondTokenValue)
    //   }
    // }
    this.resetFocusedField()
  }

  getTokenBalance (token: any): string {
    return token ? token.balance : ''
  }

  async handleConfirmAddLiquidity () {
    try {
      await this.withNotifications(this.addLiquidity)
      this.showConfirmDialog = false
      router.push({ name: PageNames.Pool })
    } catch (error) {
      console.error(error)
      this.$alert(this.t(error.message), { title: this.t('errorText') })
    }
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
  @include buttons;
  @include full-width-button;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
