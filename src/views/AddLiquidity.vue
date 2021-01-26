<template>
  <div class="container">
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
            <s-input
              v-model="addLiquidityModel.firstTokenValue"
              v-float
              class="s-input--token-value"
              :value="firstTokenValue"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="handleFirstTokenChange"
              @blur="handleInputBlur(true)"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button v-if="connected && addLiquidityModel.firstTokenValue !== firstToken.balance" :disabled="!areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleFirstMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ getAssetSymbol(firstToken.symbol) }}
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
            <s-input
              v-model="addLiquidityModel.secondTokenValue"
              v-float
              class="s-input--token-value"
              :value="secondTokenValue"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="handleSecondTokeChange"
              @blur="handleInputBlur(false)"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button v-if="connected && addLiquidityModel.secondTokenValue !== secondToken.balance" :disabled="!areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleSecondMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
              <token-logo :token="secondToken" size="small" />
              {{ getAssetSymbol(secondToken.symbol) }}
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
          {{ t('createPair.unsuitableAssets') }}
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

    <info-card v-if="areTokensSelected && isAvailable" :title="t('createPair.pricePool')">
      <div class="card__data">
        <div>
          {{
            t('createPair.firstPerSecond', {
              first: getAssetSymbol(firstToken.symbol),
              second: getAssetSymbol(secondToken.symbol)
            })
          }}
        </div>
        <div>{{ price }} {{ getAssetSymbol(firstToken.symbol) }}</div>
      </div>
      <div class="card__data">
        <div>
          {{
            t('createPair.firstPerSecond', {
              first: getAssetSymbol(secondToken.symbol),
              second: getAssetSymbol(firstToken.symbol)
            })
          }}
        </div>
        <div>{{ priceReversed }} {{ getAssetSymbol(secondToken.symbol) }}</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.shareOfPool') }}</div>
        <div>{{ shareOfPool }}%</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.networkFee') }}</div>
        <div>{{ fee }} XOR</div>
      </div>
    </info-card>

    <info-card v-if="areTokensSelected && isAvailable" :title="t('createPair.yourPosition')">
      <div class="card__data card__data_assets">
        <s-row flex>
          <pair-token-logo class="pair-token-logo" :first-token="firstToken" :second-token="secondToken" size="mini" />
          {{
            t('createPair.firstSecondPoolTokens', {
              first: getAssetSymbol(firstToken.symbol),
              second: getAssetSymbol(secondToken.symbol)
            })
          }}
        </s-row>
        <div>{{ minted }}</div>
      </div>
      <s-divider />
      <div class="card__data">
        <div>{{ getAssetSymbol(firstToken.symbol) }}</div>
        <div>{{ firstTokenPosition }}</div>
      </div>
      <div class="card__data">
        <div>{{ getAssetSymbol(secondToken.symbol) }}</div>
        <div>{{ secondTokenPosition }}</div>
      </div>
    </info-card>

    <select-token :visible.sync="showSelectFirstTokenDialog" accountAssetsOnly notNullBalanceOnly :asset="secondToken" @select="setFirstToken" />
    <select-token :visible.sync="showSelectSecondTokenDialog" accountAssetsOnly notNullBalanceOnly :asset="firstToken" @select="setSecondToken" />

    <confirm-add-liquidity :visible.sync="showConfirmDialog" @confirm="handleConfirmAddLiquidity" />
    <result-dialog :visible.sync="isCreatePairConfirmed" :type="t('createPair.add')" :message="resultMessage" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'
import { lazyComponent } from '@/router'
import { formatNumber, getAssetSymbol, isNumberValue, isWalletConnected } from '@/utils'
import { Components } from '@/consts'
import { KnownAssets, KnownSymbols, FPNumber } from '@sora-substrate/util'

const namespace = 'addLiquidity'

@Component({
  components: {
    GenericHeader: lazyComponent(Components.GenericHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    InfoCard: lazyComponent(Components.InfoCard),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmAddLiquidity: lazyComponent(Components.ConfirmAddLiquidity),
    ResultDialog: lazyComponent(Components.ResultDialog)
  }
})
export default class AddLiquidity extends Mixins(TranslationMixin, LoadingMixin, InputFormatterMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number
  @Getter('isAvailable', { namespace }) isAvailable!: boolean
  @Getter('minted', { namespace }) minted!: string
  @Getter('fee', { namespace }) fee!: string
  @Getter('shareOfPool', { namespace }) shareOfPool!: string
  @Getter('price', { namespace: 'prices' }) price!: string | number
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string | number

  @Action('setDataFromLiquidity', { namespace }) setDataFromLiquidity
  @Action('setFirstToken', { namespace }) setFirstToken
  @Action('setSecondToken', { namespace }) setSecondToken
  @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
  @Action('setSecondTokenValue', { namespace }) setSecondTokenValue
  @Action('addLiquidity', { namespace }) addLiquidity
  @Action('resetFocusedField', { namespace }) resetFocusedField
  @Action('resetData', { namespace }) resetData
  @Action('getAccountAssets', { namespace: 'assets' }) getAccountAssets
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

  getAssetSymbol = getAssetSymbol

  async mounted () {
    this.resetData()
    this.resetPrices()

    await this.withApi(async () => {
      await this.getAccountAssets()
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

  get firstTokenPosition (): string {
    return '0'
  }

  get secondTokenPosition (): string {
    return '0'
  }

  get areTokensSelected (): boolean {
    return this.firstToken && this.secondToken
  }

  get isEmptyBalance (): boolean {
    return +this.firstTokenValue === 0 || +this.secondTokenValue === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.connected && this.areTokensSelected) {
      // TODO: Ask could we have empty/zero first/second amount?
      const firstBalance = new FPNumber(this.firstToken.balance, this.firstToken.decimals)
      const firstValue = new FPNumber(this.addLiquidityModel.firstTokenValue, this.firstToken.decimals)
      if (FPNumber.lt(firstBalance, firstValue)) {
        this.insufficientBalanceTokenSymbol = this.firstToken.symbol
        return true
      }

      const secondBalance = new FPNumber(this.secondToken.balance, this.secondToken.decimals)
      const secondValue = new FPNumber(this.addLiquidityModel.secondTokenValue, this.secondToken.decimals)
      if (FPNumber.lt(secondBalance, secondValue)) {
        this.insufficientBalanceTokenSymbol = this.secondToken.symbol
        return true
      }
      // TODO: Add checking for XOR - fee
    }
    return false
  }

  get resultMessage (): string {
    return this.t('exchange.transactionMessage', {
      firstToken: this.getTokenValue(this.firstToken, this.firstTokenValue),
      secondToken: this.getTokenValue(this.secondToken, this.secondTokenValue)
    })
  }

  getTokenValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  openSelectFirstTokenDialog (): void {
    this.showSelectFirstTokenDialog = true
  }

  openSelectSecondTokenDialog (): void {
    this.showSelectSecondTokenDialog = true
  }

  handleFirstMaxValue (): void {
    // TODO: Is it correct just copy asset balance here? If we have XOR we should subtract fee
    this.addLiquidityModel.firstTokenValue = this.firstToken.balance
  }

  handleSecondMaxValue (): void {
    // TODO: Is it correct just copy asset balance here?
    this.addLiquidityModel.secondTokenValue = this.secondToken.balance
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
      this.addLiquidityModel.firstTokenValue = ''
      return
    }
    this.addLiquidityModel.secondTokenValue = ''
  }

  handleInputBlur (isFirstToken: boolean): void {
    if (isFirstToken) {
      if (+this.addLiquidityModel.firstTokenValue === 0) {
        this.resetInputField()
      } else {
        this.addLiquidityModel.firstTokenValue = this.trimNeedlesSymbols(this.addLiquidityModel.firstTokenValue)
      }
    } else {
      if (+this.addLiquidityModel.secondTokenValue === 0) {
        this.resetInputField(false)
      } else {
        this.addLiquidityModel.secondTokenValue = this.trimNeedlesSymbols(this.addLiquidityModel.secondTokenValue)
      }
    }
    this.resetFocusedField()
  }

  getTokenBalance (token: any): string {
    return token ? token.balance : ''
  }

  async handleConfirmAddLiquidity () {
    try {
      await this.addLiquidity()
      this.showConfirmDialog = false
      this.isCreatePairConfirmed = true
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
.container {
  @include container-styles;
}

.el-form--actions {
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
}

@include vertical-divider;
@include vertical-divider('el-divider');
</style>
