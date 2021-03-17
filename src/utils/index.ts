import { Asset, AccountAsset, KnownSymbols, FPNumber, CodecString, KnownAssets } from '@sora-substrate/util'

import { RegisteredAccountAsset } from '@/store/assets'
import storage from './storage'

export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    return navigator.clipboard.writeText(text)
  } catch (err) {
    console.error('Could not copy text: ', err)
  }
}

export const formatAddress = (address: string, length = address.length / 2): string => {
  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`
}

export const isXorAccountAsset = (asset: Asset | AccountAsset | RegisteredAccountAsset): boolean => {
  return asset ? asset.address === KnownAssets.get(KnownSymbols.XOR).address : false
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

export const getWalletAddress = (): string => {
  return storage.get('address')
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

export async function delay (ms = 50): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export const formatAssetSymbol = (assetSymbol: string | undefined | null, isEthereumSymbol?: boolean): string => {
  if (!assetSymbol) {
    return ''
  }

  if (isEthereumSymbol) {
    return 's' + assetSymbol
  }

  for (const symbol in KnownSymbols) {
    if (KnownSymbols[symbol] === assetSymbol) {
      return KnownSymbols[symbol]
    }
  }

  return 'e' + assetSymbol
}

export const formatDateItem = (date: number): number | string => {
  return date < 10 ? '0' + date : date
}

// We could use this method to check if the user enters a text value in a numeric field (we could do this by copy and paste)
export const isNumberValue = (value: any): boolean => {
  const numberValue = +value
  return typeof numberValue === 'number' && !isNaN(numberValue)
}

export const findAssetInCollection = (asset, collection) => {
  if (!Array.isArray(collection) || !asset?.address) return undefined

  return collection.find(item => item.address === asset.address)
}
