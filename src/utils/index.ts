import * as storage from './storage'

export const formatNumber = (value: string | number, decimalLendth: number): string => {
  const valueNumber = +value
  return valueNumber.toFixed(decimalLendth || 4)
}

export const getTokenIconClasses = (symbol: string) => {
  const cssClass = 'token-logo'
  if (symbol) {
    return `${cssClass} ${cssClass}--${symbol.toLowerCase()}`
  }
  return cssClass
}

export const isWalletConnected = () => !!(storage.getItem('address') && storage.getItem('name') && storage.getItem('password'))
