import { dexApi } from '@soramitsu/soraneo-wallet-web'
import { KnownSymbols } from '@sora-substrate/util'

import storage from './storage'

export const formatNumber = (value: string | number, decimalLendth?: number): string => {
  const valueNumber = +value
  return valueNumber.toFixed(decimalLendth || 4)
}

// We could use this method to check if the user enters a text value in a numeric field (we could do this by copy and paste)
export const isNumberValue = (value: any): boolean => {
  const numberValue = +value
  return typeof numberValue === 'number' && !isNaN(numberValue)
}

export const getTokenIconClasses = (symbol: string) => {
  const cssClass = 'token-logo'
  if (symbol) {
    return `${cssClass} ${cssClass}--${symbol.toLowerCase()}`
  }
  return cssClass
}

export const isWalletConnected = () => {
  const isExternal = Boolean(storage.get('isExternal'))
  const address = storage.get('address')
  return !!(
    isExternal
      ? address
      : address && storage.get('name') && storage.get('password')
  )
}

export const isApiConnected = () => dexApi?.api?.isConnected

export const getAssetSymbol = (symbol: string) => symbol === KnownSymbols.USD ? 'USDT' : symbol
