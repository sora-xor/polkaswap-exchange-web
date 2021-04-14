import { Asset, AccountAsset, RegisteredAccountAsset, AccountLiquidity, KnownSymbols, FPNumber, CodecString, KnownAssets } from '@sora-substrate/util'
import storage from './storage'

const FpZeroValue = new FPNumber(0)

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

export const isXorAccountAsset = (asset: Asset | AccountAsset | RegisteredAccountAsset | AccountLiquidity): boolean => {
  return asset ? asset.address === KnownAssets.get(KnownSymbols.XOR).address : false
}

export const isMaxButtonAvailable = (
  areAssetsSelected: boolean,
  asset: AccountAsset | RegisteredAccountAsset | AccountLiquidity,
  amount: string | number,
  fee: CodecString,
  xorAsset: AccountAsset | RegisteredAccountAsset,
  parseAsLiquidity = false
): boolean => {
  if (
    !asset ||
    !areAssetsSelected ||
    !fee ||
    !xorAsset ||
    asZeroValue(getAssetBalance(asset, { parseAsLiquidity }))) {
    return false
  }

  const fpAmount = new FPNumber(amount, asset.decimals)
  const fpMaxBalance = getMaxBalance(asset, fee, false, parseAsLiquidity)

  return !FPNumber.eq(fpMaxBalance, fpAmount) && !hasInsufficientXorForFee(xorAsset, fee)
}

const getMaxBalance = (
  asset: AccountAsset | RegisteredAccountAsset | AccountLiquidity,
  fee: CodecString,
  isExternalBalance = false,
  parseAsLiquidity = false
): FPNumber => {
  const balance = getAssetBalance(asset, { internal: !isExternalBalance, parseAsLiquidity })

  if (asZeroValue(balance)) return FpZeroValue

  let fpResult = FPNumber.fromCodecValue(balance, asset.decimals)

  if (!isExternalBalance && isXorAccountAsset(asset) && !asZeroValue(fee)) {
    const fpFee = FPNumber.fromCodecValue(fee, asset.decimals)
    fpResult = fpResult.sub(fpFee)
  }
  // TODO: add possible check for ethereum asset & ethereum fee

  return FPNumber.lt(fpResult, FpZeroValue) ? FpZeroValue : fpResult
}

export const getMaxValue = (
  asset: AccountAsset | RegisteredAccountAsset,
  fee: CodecString,
  isExternalBalance = false
): string => {
  return getMaxBalance(asset, fee, isExternalBalance).toString()
}

export const hasInsufficientBalance = (
  asset: AccountAsset | RegisteredAccountAsset,
  amount: string | number,
  fee: CodecString,
  isExternalBalance = false
): boolean => {
  const fpAmount = new FPNumber(amount, asset.decimals)
  const fpMaxBalance = getMaxBalance(asset, fee, isExternalBalance)

  return FPNumber.lt(fpMaxBalance, fpAmount)
}

export const hasInsufficientXorForFee = (xorAsset: AccountAsset | RegisteredAccountAsset | null, fee: CodecString): boolean => {
  if (!xorAsset || !fee) return true

  const decimals = xorAsset.decimals
  const xorBalance = getAssetBalance(xorAsset)
  const fpBalance = FPNumber.fromCodecValue(xorBalance, decimals)
  const fpFee = FPNumber.fromCodecValue(fee, decimals)

  return FPNumber.lt(fpBalance, fpFee)
}

export const hasInsufficientEthForFee = (ethBalance: string, fee: string): boolean => {
  return FPNumber.lt(new FPNumber(ethBalance), new FPNumber(fee))
}

export const getWalletAddress = (): string => {
  return storage.get('address')
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

export const asZeroValue = (value: any): boolean => {
  return !Number.isFinite(+value) || +value === 0
}

export const getAssetBalance = (asset: any, { internal = true, parseAsLiquidity = false } = {}) => {
  if (!internal) {
    return asset?.externalBalance
  }

  if (parseAsLiquidity) {
    return asset?.balance
  }

  return asset?.balance?.transferable
}

export const formatAssetBalance = (asset: any, { internal = true, parseAsLiquidity = false, formattedZero = '', showZeroBalance = true } = {}): string => {
  if (!asset) return formattedZero

  const balance = getAssetBalance(asset, { internal, parseAsLiquidity })

  if (!balance || (!showZeroBalance && asZeroValue(balance))) return formattedZero

  return FPNumber.fromCodecValue(balance, asset.decimals).format()
}

export const findAssetInCollection = (asset, collection) => {
  if (!Array.isArray(collection) || !asset?.address) return undefined

  return collection.find(item => item.address === asset.address)
}
