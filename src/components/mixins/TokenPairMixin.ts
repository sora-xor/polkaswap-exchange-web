import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { KnownAssets, KnownSymbols } from '@sora-substrate/util'

import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'
import TransactionMixin from '@/components/mixins/TransactionMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'

import router from '@/router'
import { PageNames } from '@/consts'
import { formatNumber, getMaxValue, isNumberValue, isMaxButtonAvailable, isWalletConnected, isXorAccountAsset, hasInsufficientBalance } from '@/utils'

const CreateTokenPairMixin = (namespace: string) => {
  @Component
  class TokenPairMixin extends Mixins(TransactionMixin, InputFormatterMixin, LoadingMixin) {
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

    async handleMaxValue (isFirstToken: boolean): Promise<void> {
      const token = isFirstToken ? this.firstToken : this.secondToken
      const action = isFirstToken ? this.setFirstTokenValue : this.setSecondTokenValue

      await this.getNetworkFee()
      action(getMaxValue(token, this.fee))
    }

    async handleTokenChange (isFirstToken: boolean, value: string): Promise<any> {
      const token = isFirstToken ? this.firstToken : this.secondToken
      const action = isFirstToken ? this.setFirstTokenValue : this.setSecondTokenValue

      const formattedValue = this.formatNumberField(value, token)

      if (!isNumberValue(formattedValue)) {
        await this.$nextTick
        this.resetInputField()
        return
      }

      action(formattedValue)
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

    handleInputBlur (isFirstToken: boolean): void {
      const tokenValue = isFirstToken ? this.firstTokenValue : this.secondTokenValue
      const action = isFirstToken ? this.setFirstTokenValue : this.setSecondTokenValue

      if (+tokenValue === 0) {
        this.resetInputField(isFirstToken)
      } else {
        const formattedTokenValue = this.trimNeedlesSymbols(String(tokenValue))
        action(formattedTokenValue)
      }

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

    private resetInputField (isFirstTokenField = true): void {
      const action = isFirstTokenField ? this.setFirstTokenValue : this.setSecondTokenValue
      action('')
    }

    afterInputBlur (): void {}
    afterApiConnect (): void {}
  }

  return TokenPairMixin
}

export default CreateTokenPairMixin
