import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { KnownAssets, KnownSymbols } from '@sora-substrate/util'

import TokenInputMixin from '@/components/mixins/TokenInputMixin'
import TransactionMixin from '@/components/mixins/TransactionMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'

import router from '@/router'
import { PageNames } from '@/consts'
import { formatNumber, getMaxValue, isNumberValue, isMaxButtonAvailable, isWalletConnected, isXorAccountAsset, hasInsufficientBalance } from '@/utils'

const CreateTokenPairMixin = (namespace: string) => {
  @Component
  class TokenPairMixin extends Mixins(TokenInputMixin, TransactionMixin, LoadingMixin) {
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
    @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
    @Action('setSecondTokenValue', { namespace }) setSecondTokenValue

    @Action('getNetworkFee', { namespace }) getNetworkFee
    @Action('getPrices', { namespace: 'prices' }) getPrices
    @Action('resetPrices', { namespace: 'prices' }) resetPrices

    showConfirmDialog = false
    showSelectFirstTokenDialog = false
    showSelectSecondTokenDialog = false
    inputPlaceholder: string = formatNumber(0, 1)
    insufficientBalanceTokenSymbol = ''

    async mounted () {
      await this.withApi(async () => {
        this.resetPrices()
        await this.setFirstToken(KnownAssets.get(KnownSymbols.XOR))
        this.afterApiConnect()
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
        // TODO: Add check for pair without XOR
      }
      return false
    }

    async handleMaxValue (token: any, setValue: (v: any) => void): Promise<void> {
      await this.getNetworkFee()
      setValue(getMaxValue(token, this.fee))
    }

    async handleTokenChange (value: string, token: any, setValue: (v: any) => void): Promise<any> {
      await this.handleTokenInputChange(value, token, setValue)
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

    handleInputBlur (value: string | number, setValue: (v: any) => void): void {
      this.handleTokenInputBlur(value, setValue)
      this.afterInputBlur()
    }

    getTokenBalance (token: any): string {
      return token?.balance ?? ''
    }

    openSelectSecondTokenDialog (): void {
      this.showSelectSecondTokenDialog = true
    }

    openConfirmDialog (): void {
      this.showConfirmDialog = true
    }

    async handleConfirm (func: () => Promise<void>): Promise<void> {
      try {
        await this.withNotifications(func)
        this.showConfirmDialog = false
        router.push({ name: PageNames.Pool })
      } catch (error) {
        console.error(error)
        this.$alert(this.t(error.message), { title: this.t('errorText') })
      }
    }

    afterInputBlur (): void {}
    afterApiConnect (): void {}
  }

  return TokenPairMixin
}

export default CreateTokenPairMixin
