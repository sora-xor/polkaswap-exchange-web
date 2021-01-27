import { KnownSymbols } from '@sora-substrate/util'

import storage from './storage'

export const formatNumber = (value: string | number, decimalLendth?: number): string => {
  const valueNumber = +value
  return valueNumber.toFixed(decimalLendth || 4)
}

export const formatAddress = (address: string, length = address.length / 2) => {
  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`
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
