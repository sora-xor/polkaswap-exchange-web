import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { KnownAssets, KnownSymbols, CodecString } from '@sora-substrate/util'

import TransactionMixin from './TransactionMixin'
import LoadingMixin from './LoadingMixin'
import ConfirmDialogMixin from './ConfirmDialogMixin'

import router from '@/router'
import { PageNames } from '@/consts'
import { getMaxValue, isMaxButtonAvailable, isXorAccountAsset, hasInsufficientBalance, formatAssetBalance } from '@/utils'

const CreateTokenPairMixin = (namespace: string) => {
  @Component
  class TokenPairMixin extends Mixins(TransactionMixin, LoadingMixin, ConfirmDialogMixin) {
    readonly KnownSymbols = KnownSymbols

    @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any
    @Getter('firstToken', { namespace }) firstToken!: any
    @Getter('secondToken', { namespace }) secondToken!: any
    @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
    @Getter('secondTokenValue', { namespace }) secondTokenValue!: number

    @Getter('isAvailable', { namespace }) isAvailable!: boolean
    @Getter('minted', { namespace }) minted!: CodecString
    @Getter('fee', { namespace }) fee!: CodecString
    @Getter('price', { namespace: 'prices' }) price!: string
    @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string

    @Getter slippageTolerance!: string
    @Getter isLoggedIn!: boolean

    @Action('setFirstTokenAddress', { namespace }) setFirstTokenAddress
    @Action('setSecondTokenAddress', { namespace }) setSecondTokenAddress
    @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
    @Action('setSecondTokenValue', { namespace }) setSecondTokenValue
    @Action('resetData', { namespace }) resetData

    @Action('getPrices', { namespace: 'prices' }) getPrices
    @Action('resetPrices', { namespace: 'prices' }) resetPrices

    @Action('getAssets', { namespace: 'assets' }) getAssets!: () => Promise<void>

    @Watch('isLoggedIn')
    private handleLoggedInStateChange (isLoggedIn: boolean, wasLoggedIn: boolean): void {
      if (wasLoggedIn && !isLoggedIn) {
        this.handleBack()
      }
    }

    showSelectSecondTokenDialog = false
    insufficientBalanceTokenSymbol = ''

    destroyed (): void {
      const params = router.currentRoute.params
      this.resetPrices()
      this.resetData(params?.assetBAddress && params?.assetBAddress)
    }

    get formattedMinted (): string {
      return this.formatCodecNumber(this.minted)
    }

    get formattedFee (): string {
      return this.formatCodecNumber(this.fee)
    }

    get areTokensSelected (): boolean {
      return this.firstToken && this.secondToken
    }

    get isEmptyBalance (): boolean {
      return +this.firstTokenValue === 0 || +this.secondTokenValue === 0
    }

    get isFirstMaxButtonAvailable (): boolean {
      return this.isLoggedIn && isMaxButtonAvailable(this.areTokensSelected, this.firstToken, this.firstTokenValue, this.fee, this.tokenXOR)
    }

    get isSecondMaxButtonAvailable (): boolean {
      return this.isLoggedIn && isMaxButtonAvailable(this.areTokensSelected, this.secondToken, this.secondTokenValue, this.fee, this.tokenXOR)
    }

    get isInsufficientBalance (): boolean {
      if (this.isLoggedIn && this.areTokensSelected) {
        if (isXorAccountAsset(this.firstToken) || isXorAccountAsset(this.secondToken)) {
          if (hasInsufficientBalance(this.firstToken, this.firstTokenValue, this.fee)) {
            this.insufficientBalanceTokenSymbol = this.firstToken.symbol
            return true
          }
          if (hasInsufficientBalance(this.secondToken, this.secondTokenValue, this.fee)) {
            this.insufficientBalanceTokenSymbol = this.secondToken.symbol
            return true
          }
        }
        // TODO: [Release 2] Add check for pair without XOR
      }
      return false
    }

    async handleMaxValue (token: any, setValue: (v: any) => void): Promise<void> {
      setValue(getMaxValue(token, this.fee))
      this.updatePrices()
    }

    async handleTokenChange (value: string, setValue: (v: any) => Promise<void>): Promise<void> {
      await setValue(value)
      this.updatePrices()
    }

    updatePrices (): void {
      this.getPrices({
        assetAAddress: this.firstToken.address,
        assetBAddress: this.secondToken.address,
        amountA: this.firstTokenValue,
        amountB: this.secondTokenValue
      })
    }

    getTokenBalance (token: any): string {
      return formatAssetBalance(token)
    }

    openSelectSecondTokenDialog (): void {
      this.showSelectSecondTokenDialog = true
    }

    async handleConfirm (func: () => Promise<void>): Promise<void> {
      await this.handleConfirmDialog(async () => {
        await this.withNotifications(func)
        this.handleBack()
      })
    }

    async afterApiConnect (): Promise<void> {}

    handleBack (): void {
      router.push({ name: PageNames.Pool })
    }
  }

  return TokenPairMixin
}

export default CreateTokenPairMixin
