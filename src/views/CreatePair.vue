<template>
  <div class="container" v-loading="parentLoading">
    <generic-header :title="t('createPair.title')" :tooltip="t('pool.description')" />
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
              v-model="createPairModel.firstTokenValue"
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
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
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
            <s-input
              v-model="createPairModel.secondTokenValue"
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
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
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
      <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="handleConfirmCreatePair">
        <template v-if="!areTokensSelected">
          {{ t('exchange.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('createPair.alreadyCreated') }}
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

    <info-card v-if="areTokensSelected && isAvailable && isEmptyBalance" class="card--first-liquidity" :title="t('createPair.firstLiquidityProvider')">
      <div class="card__data">
        <p v-html="t('createPair.firstLiquidityProviderInfo')" />
      </div>
    </info-card>

    <info-card v-if="areTokensSelected && isAvailable && !isEmptyBalance" :title="t('createPair.pricePool')">
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
        <div>100%</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.networkFee') }}</div>
        <div>{{ fee }} {{ KnownSymbols.XOR }}</div>
      </div>
    </info-card>

    <info-card
      v-if="areTokensSelected && isAvailable && !isEmptyBalance"
      :title="t('createPair.yourPositionEstimated')"
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
        <div>{{ minted }}</div>
      </div>
      <s-divider />
      <div class="card__data">
        <div>{{ firstToken.symbol }}</div>
        <div>{{ firstTokenValue }}</div>
      </div>
      <div class="card__data">
        <div>{{ secondToken.symbol }}</div>
        <div>{{ secondTokenValue }}</div>
      </div>
    </info-card>

    <select-token :visible.sync="showSelectFirstTokenDialog" account-assets-only not-null-balance-only :asset="secondToken" @select="setFirstToken" />
    <select-token :visible.sync="showSelectSecondTokenDialog" :asset="firstToken" @select="setSecondToken" />

    <confirm-create-pair :visible.sync="showConfirmCreatePairDialog" @confirm="confirmCreatePair" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { KnownAssets, KnownSymbols, FPNumber } from '@sora-substrate/util'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'
import { formatNumber, isNumberValue, isWalletConnected, isXorAccountAsset, isMaxButtonAvailable, getMaxValue } from '@/utils'

const namespace = 'createPair'

@Component({
  components: {
    GenericHeader: lazyComponent(Components.GenericHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    InfoCard: lazyComponent(Components.InfoCard),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmCreatePair: lazyComponent(Components.ConfirmCreatePair),
    ResultDialog: lazyComponent(Components.ResultDialog)
  }
})

export default class CreatePair extends Mixins(TransactionMixin, LoadingMixin, InputFormatterMixin) {
  readonly KnownSymbols = KnownSymbols

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number
  @Getter('isAvailable', { namespace }) isAvailable!: boolean
  @Getter('minted', { namespace }) minted!: string
  @Getter('fee', { namespace }) fee!: string
  @Getter('price', { namespace: 'prices' }) price!: string | number
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string | number

  @Action('setFirstToken', { namespace }) setFirstToken
  @Action('setSecondToken', { namespace }) setSecondToken
  @Action('getNetworkFee', { namespace }) getNetworkFee
  @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
  @Action('setSecondTokenValue', { namespace }) setSecondTokenValue
  @Action('createPair', { namespace }) createPair
  @Action('resetData', { namespace }) resetData
  @Action('getPrices', { namespace: 'prices' }) getPrices
  @Action('resetPrices', { namespace: 'prices' }) resetPrices

  showSelectFirstTokenDialog = false
  showSelectSecondTokenDialog = false
  inputPlaceholder: string = formatNumber(0, 1)
  showConfirmCreatePairDialog = false
  insufficientBalanceTokenSymbol = ''

  // TODO: Remove createPairModel
  createPairModel = {
    firstTokenValue: '',
    secondTokenValue: ''
  }

  async mounted () {
    await this.withApi(async () => {
      this.resetPrices()
      await this.setFirstToken(KnownAssets.get(KnownSymbols.XOR))
    })
  }

  get connected (): boolean {
    return isWalletConnected()
  }

  get areTokensSelected (): boolean {
    return this.firstToken && this.secondToken
  }

  get isEmptyBalance (): boolean {
    return +this.firstTokenValue === 0 || +this.secondTokenValue === 0
  }

  get isFirstMaxButtonAvailable (): boolean {
    return isMaxButtonAvailable(this.areTokensSelected, this.firstToken, this.firstTokenValue, this.fee)
  }

  get isSecondMaxButtonAvailable (): boolean {
    return isMaxButtonAvailable(this.areTokensSelected, this.secondToken, this.secondTokenValue, this.fee)
  }

  get isInsufficientBalance (): boolean {
    if (this.connected && this.areTokensSelected) {
      const firstBalance = new FPNumber(this.firstToken.balance, this.firstToken.decimals)
      const firstValue = new FPNumber(this.firstTokenValue, this.firstToken.decimals)
      // Now first asset is XOR so we should change it later
      const fee = new FPNumber(this.fee, this.firstToken.decimals)
      if (FPNumber.lt(firstBalance, firstValue.add(fee))) {
        this.insufficientBalanceTokenSymbol = this.firstToken.symbol
        return true
      }
      const secondBalance = new FPNumber(this.secondToken.balance, this.secondToken.decimals)
      const secondValue = new FPNumber(this.secondTokenValue, this.secondToken.decimals)
      if (FPNumber.lt(secondBalance, secondValue)) {
        this.insufficientBalanceTokenSymbol = this.secondToken.symbol
        return true
      }
    }
    return false
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
    this.createPairModel.firstTokenValue = getMaxValue(this.firstToken, this.fee)
  }

  async handleSecondMaxValue (): Promise<void> {
    await this.getNetworkFee()
    this.createPairModel.secondTokenValue = getMaxValue(this.secondToken, this.fee)
  }

  updatePrices (): void {
    this.getPrices({
      assetAAddress: this.firstToken.address,
      assetBAddress: this.secondToken.address,
      amountA: this.firstTokenValue,
      amountB: this.secondTokenValue
    })
  }

  async handleFirstTokenChange (): Promise<any> {
    this.createPairModel.firstTokenValue = this.formatNumberField(this.createPairModel.firstTokenValue)
    if (!isNumberValue(this.createPairModel.firstTokenValue)) {
      await this.promiseTimeout()
      this.resetInputField()
      return
    }
    this.setFirstTokenValue(this.createPairModel.firstTokenValue)
    this.updatePrices()
  }

  async handleSecondTokeChange (): Promise<any> {
    this.createPairModel.secondTokenValue = this.formatNumberField(this.createPairModel.secondTokenValue)
    if (!isNumberValue(this.createPairModel.secondTokenValue)) {
      await this.promiseTimeout()
      this.resetInputField(false)
      return
    }
    this.setSecondTokenValue(this.createPairModel.secondTokenValue)
    this.updatePrices()
  }

  resetInputField (isFirstTokenField = true): void {
    if (isFirstTokenField) {
      this.createPairModel.firstTokenValue = ''
      return
    }
    this.createPairModel.secondTokenValue = ''
  }

  handleInputBlur (isFirstToken: boolean): void {
    if (isFirstToken) {
      if (+this.createPairModel.firstTokenValue === 0) {
        this.resetInputField()
      } else {
        this.createPairModel.firstTokenValue = this.trimNeedlesSymbols(this.createPairModel.firstTokenValue)
      }
    } else {
      if (+this.createPairModel.secondTokenValue === 0) {
        this.resetInputField(false)
      } else {
        this.createPairModel.secondTokenValue = this.trimNeedlesSymbols(this.createPairModel.secondTokenValue)
      }
    }
  }

  getTokenBalance (token: any): string {
    return token ? token.balance : ''
  }

  handleConfirmCreatePair (): void {
    this.showConfirmCreatePairDialog = true
  }

  async confirmCreatePair (): Promise<void> {
    try {
      await this.withNotifications(this.createPair)
      this.showConfirmCreatePairDialog = false
      router.push({ name: PageNames.Pool })
    } catch (error) {
      console.error(error)
      this.$alert(this.t(error.message), { title: this.t('errorText') })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  .card--first-liquidity {
    margin-top: $inner-spacing-medium;
    font-feature-settings: $s-font-feature-settings-common;
    .card__data {
      margin-top: $inner-spacing-mini / 2;
      font-size: var(--s-font-size-mini);
    }
  }
}

.el-form--actions {
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
}

@include vertical-divider;
@include vertical-divider('el-divider');
</style>
