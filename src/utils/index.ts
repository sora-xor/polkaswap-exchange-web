import { Asset, AccountAsset, KnownSymbols, FPNumber } from '@sora-substrate/util'

import storage from './storage'

export const formatNumber = (value: string | number, decimalLendth?: number): string => {
  const valueNumber = +value
  return valueNumber.toFixed(decimalLendth || 4)
}

export const formatAddress = (address: string, length = address.length / 2): string => {
  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`
}

export const isXorAccountAsset = (asset: Asset | AccountAsset): boolean => {
  return asset ? asset.symbol === KnownSymbols.XOR : false
}

export const isMaxButtonAvailable = (areAssetsSelected: boolean, asset: AccountAsset, amount: string | number, fee: string): boolean => {
  if (!isWalletConnected() || !areAssetsSelected || +asset.balance === 0) {
    return false
  }
  const decimals = asset.decimals
  const fpBalance = new FPNumber(asset.balance, decimals)
  const fpAmount = new FPNumber(amount, decimals)
  if (isXorAccountAsset(asset)) {
    if (+fee === 0) {
      return false
    }
    const fpFee = new FPNumber(fee, decimals)
    return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee)
  }
  return !FPNumber.eq(fpBalance, fpAmount)
}

export const getMaxValue = (asset: AccountAsset, fee: string): string => {
  if (isXorAccountAsset(asset)) {
    const decimals = asset.decimals
    const fpBalance = new FPNumber(asset.balance, decimals)
    const fpFee = new FPNumber(fee, decimals)
    return fpBalance.sub(fpFee).toString()
  }
  return asset.balance
}

export const hasInsufficientBalance = (asset: AccountAsset, amount: number, fee: string): boolean => {
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

// We could use this method to check if the user enters a text value in a numeric field (we could do this by copy and paste)
export const isNumberValue = (value: any): boolean => {
  const numberValue = +value
  return typeof numberValue === 'number' && !isNaN(numberValue)
}

export const isWalletConnected = (): boolean => {
  const isExternal = Boolean(storage.get('isExternal'))
  const address = storage.get('address')
  return !!(
    isExternal
      ? address
      : address && storage.get('name') && storage.get('password')
  )
}
