import { EthSymbol } from '@/consts'
import { Asset, AccountAsset, RegisteredAccountAsset, KnownSymbols, FPNumber, CodecString, KnownAssets } from '@sora-substrate/util'
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

export const getMaxValue = (asset: AccountAsset, fee: CodecString, isExternalBalance?: boolean): string => {
  const decimals = asset.decimals
  const fpBalance = FPNumber.fromCodecValue(asset[isExternalBalance ? 'externalBalance' : 'balance'], decimals)
  if (isXorAccountAsset(asset)) {
    const fpFee = FPNumber.fromCodecValue(fee, decimals)
    return fpBalance.sub(fpFee).toString()
  }
  return fpBalance.toString()
}

export const hasInsufficientBalance = (asset: AccountAsset | RegisteredAccountAsset, amount: string | number, fee: CodecString, isExternalBalance = false): boolean => {
  const balanceField = isExternalBalance ? 'externalBalance' : 'balance'
  if (+asset[balanceField] === 0) {
    return true
  }
  const decimals = asset.decimals
  const fpBalance = FPNumber.fromCodecValue(asset[balanceField], decimals)
  const fpAmount = new FPNumber(amount, decimals)
  if (isXorAccountAsset(asset)) {
    const fpFee = FPNumber.fromCodecValue(fee, decimals)
    return FPNumber.lt(fpBalance, fpAmount.add(fpFee))
  }
  return FPNumber.lt(fpBalance, fpAmount)
}

export const hasInsufficientXorForFee = (asset: AccountAsset | RegisteredAccountAsset | null, fee: CodecString): boolean => {
  if (!asset) return true

  const decimals = asset.decimals
  const fpBalance = FPNumber.fromCodecValue(asset.balance, decimals)
  const fpFee = FPNumber.fromCodecValue(fee, decimals)
  return FPNumber.lt(fpBalance, fpFee)
}

export const hasInsufficientEthForFee = (ethBalance: string, fee: string): boolean => {
  return FPNumber.lt(new FPNumber(ethBalance), new FPNumber(fee))
}

export const getWalletAddress = (): string => {
  return storage.get('address')
}

export const isWalletConnected = (): boolean => {
  const isExternal = Boolean(storage.get('isExternal'))
  const address = getWalletAddress()
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
    return 'e' + assetSymbol
  }

  for (const symbol in KnownSymbols) {
    if (KnownSymbols[symbol] === assetSymbol) {
      return KnownSymbols[symbol]
    }
  }

  return 's' + assetSymbol
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
