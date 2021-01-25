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
            <s-input
              :value="firstTokenValue"
              v-float
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="setFirstTokenValue"
              @blur="resetFocusedField"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button v-if="connected" :disabled="!areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleFirstMaxValue">
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
              :value="secondTokenValue"
              v-float
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="setSecondTokenValue"
              @blur="resetFocusedField"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button v-if="connected" :disabled="!areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleSecondMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
              <token-logo :token="secondToken" size="small" />
              {{ getAssetSymbol(secondToken.symbol) }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
            {{t('swap.chooseToken')}}
          </s-button>
        </div>
      </div>
        <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="showConfirmDialog = true">
        <template v-if="!areTokensSelected">
          {{ t('swap.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('createPair.unsuitableAssets') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('swap.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          <!-- TODO: Add insufficientBalanceTokenSymbol here -->
          <!-- {{ t('createPair.insufficientBalance', { tokenSymbol: getAssetSymbol(insufficientBalanceTokenSymbol)}) }} -->
          {{ t('createPair.insufficientBalance') }}
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
        <div>{{ firstPerSecondPrice }} {{ getAssetSymbol(firstToken.symbol) }}</div>
      </div>
      <div class="card__data">
        <div>
          {{
            t('createPair.firstPerSecond', {
              first: getAssetSymbol(firstToken.symbol),
              second: getAssetSymbol(secondToken.symbol)
            })
          }}
        </div>
        <div>{{ secondPerFirstPrice }} {{ getAssetSymbol(secondToken.symbol) }}</div>
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

    <info-card v-if="areTokensSelected && isAvailable" :title="t('createPair.yourPosition') ">
      <div class="card__data card__data_assets">
        <s-row flex>
          <pair-token-logo class="pair-token-logo" :first-token="firstToken" :second-token="secondToken" size="mini" />
          {{
            t('createPair.firstSecondPoolTokens', {
              first: getAssetSymbol(firstToken.symbol),
              second: getAssetSymbol(secondToken.symbol)
            })
          }}:
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
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import router, { lazyComponent } from '@/router'
import { formatNumber, getAssetSymbol, isWalletConnected } from '@/utils'
import { Components, PageNames } from '@/consts'
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
export default class AddLiquidity extends Mixins(TranslationMixin, LoadingMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number
  @Getter('isAvailable', { namespace }) isAvailable!: boolean
  @Getter('minted', { namespace }) minted!: string
  @Getter('fee', { namespace }) fee!: string
  @Getter('shareOfPool', { namespace }) shareOfPool!: string

  @Action('setDataFromLiquidity', { namespace }) setDataFromLiquidity
  @Action('setFirstToken', { namespace }) setFirstToken
  @Action('setSecondToken', { namespace }) setSecondToken
  @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
  @Action('setSecondTokenValue', { namespace }) setSecondTokenValue
  @Action('addLiquidity', { namespace }) addLiquidity
  @Action('resetFocusedField', { namespace }) resetFocusedField
  @Action('resetData', { namespace }) resetData
  @Action('getAccountAssets', { namespace: 'assets' }) getAccountAssets

  showSelectFirstTokenDialog = false
  showSelectSecondTokenDialog = false
  inputPlaceholder: string = formatNumber(0, 1)
  insufficientBalanceTokenSymbol = ''
  showConfirmDialog = false
  isCreatePairConfirmed = false

  getAssetSymbol = getAssetSymbol

  async mounted () {
    this.resetData()

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

  formatNumber = formatNumber

  get connected (): boolean {
    return isWalletConnected()
  }

  get firstPerSecondPrice (): string {
    return this.firstTokenValue && this.secondTokenValue
      ? new FPNumber(this.firstTokenValue).div(new FPNumber(this.secondTokenValue)).toFixed(2) || '0'
      : '0'
  }

  get secondPerFirstPrice (): string {
    return this.firstTokenValue && this.secondTokenValue
      ? new FPNumber(this.secondTokenValue).div(new FPNumber(this.firstTokenValue)).toFixed(2) || '0'
      : '0'
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
    if (this.areTokensSelected) {
      let firstValue = new FPNumber(this.firstTokenValue, this.firstToken.decimals)
      const firstBalance = new FPNumber(this.firstToken.balance, this.firstToken.decimals)
      let secondValue = new FPNumber(this.secondTokenValue, this.secondToken.decimals)
      const secondBalance = new FPNumber(this.secondToken.balance, this.secondToken.decimals)

      // TODO: Set appropriate insufficientBalanceTokenSymbol
      if (this.firstToken.symbol === KnownSymbols.XOR) {
        firstValue = firstValue.add(new FPNumber(this.fee, this.firstToken.decimals))
      } else {
        secondValue = secondValue.add(new FPNumber(this.fee, this.secondToken.decimals))
      }

      return FPNumber.gt(firstValue, firstBalance) || FPNumber.gt(secondValue, secondBalance)
    }

    return true
  }

  get resultMessage (): string {
    return this.t('createPair.transactionMessage', {
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
    this.setFirstTokenValue(this.firstToken.balance)
  }

  handleSecondMaxValue (): void {
    this.setSecondTokenValue(this.secondToken.balance)
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
.el-form--actions {
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
