import { Asset, AccountAsset, KnownSymbols, FPNumber, CodecString } from '@sora-substrate/util'

import storage from './storage'

export const formatAddress = (address: string, length = address.length / 2): string => {
  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`
}

export const isXorAccountAsset = (asset: Asset | AccountAsset): boolean => {
  return asset ? asset.symbol === KnownSymbols.XOR : false
}

export const isMaxButtonAvailable = (areAssetsSelected: boolean, asset: AccountAsset, amount: string | number, fee: CodecString): boolean => {
  if (!isWalletConnected() || !areAssetsSelected || +asset.balance === 0) {
    return false
  }
  const decimals = asset.decimals
  const fpBalance = FPNumber.fromCodecValue(asset.balance, decimals)
  const fpAmount = new FPNumber(amount, decimals)
  if (isXorAccountAsset(asset)) {
    if (+fee === 0) {
      return false
    }
    const fpFee = FPNumber.fromCodecValue(fee, decimals)
    return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee)
  }
  return !FPNumber.eq(fpBalance, fpAmount)
}

export const getMaxValue = (asset: AccountAsset, fee: CodecString): string => {
  const decimals = asset.decimals
  const fpBalance = FPNumber.fromCodecValue(asset.balance, decimals)
  if (isXorAccountAsset(asset)) {
    const fpFee = FPNumber.fromCodecValue(fee, decimals)
    return fpBalance.sub(fpFee).toString()
  }
  return fpBalance.toString()
}

export const hasInsufficientBalance = (asset: AccountAsset, amount: number, fee: CodecString): boolean => {
  if (+asset.balance === 0) {
    return true
  }
  const decimals = asset.decimals
  const fpBalance = FPNumber.fromCodecValue(asset.balance, decimals)
  const fpAmount = new FPNumber(amount, decimals)
  if (isXorAccountAsset(asset)) {
    const fpFee = FPNumber.fromCodecValue(fee, decimals)
    return FPNumber.lt(fpBalance, fpAmount.add(fpFee))
  }
  return FPNumber.lt(fpBalance, fpAmount)
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
