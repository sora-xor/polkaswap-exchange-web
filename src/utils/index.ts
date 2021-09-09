import debounce from 'lodash/debounce'
import { Asset, AccountAsset, RegisteredAccountAsset, AccountLiquidity, KnownSymbols, FPNumber, CodecString, KnownAssets } from '@sora-substrate/util'

import router from '@/router'
import i18n from '@/lang'
import { app } from '@/consts'

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

export const isXorAccountAsset = (asset: Asset | AccountAsset | RegisteredAccountAsset | AccountLiquidity): boolean => {
  return asset ? asset.address === KnownAssets.get(KnownSymbols.XOR).address : false
}

export const isEthereumAddress = (address: string): boolean => {
  const numberString = address.replace(/^0x/, '')
  const number = parseInt(numberString, 16)

  return number === 0
}

export const isMaxButtonAvailable = (
  areAssetsSelected: boolean,
  asset: AccountAsset | RegisteredAccountAsset | AccountLiquidity,
  amount: string | number,
  fee: CodecString,
  xorAsset: AccountAsset | RegisteredAccountAsset,
  parseAsLiquidity = false,
  isXorOutputSwap = false
): boolean => {
  if (
    !asset ||
    !areAssetsSelected ||
    !xorAsset ||
    asZeroValue(getAssetBalance(asset, { parseAsLiquidity }))) {
    return false
  }

  const fpAmount = new FPNumber(amount, asset.decimals)
  const fpMaxBalance = getMaxBalance(asset, fee, false, parseAsLiquidity)

  return !FPNumber.eq(fpMaxBalance, fpAmount) && !hasInsufficientXorForFee(xorAsset, fee, isXorOutputSwap)
}

const getMaxBalance = (
  asset: AccountAsset | RegisteredAccountAsset | AccountLiquidity,
  fee: CodecString,
  isExternalBalance = false,
  parseAsLiquidity = false
): FPNumber => {
  const balance = getAssetBalance(asset, { internal: !isExternalBalance, parseAsLiquidity })

  if (asZeroValue(balance)) return FPNumber.ZERO

  let fpResult = FPNumber.fromCodecValue(balance, asset.decimals)

  if (
    !asZeroValue(fee) &&
    (
      (!isExternalBalance && isXorAccountAsset(asset)) ||
      (isExternalBalance && isEthereumAddress((asset as RegisteredAccountAsset).externalAddress))
    )
  ) {
    const fpFee = FPNumber.fromCodecValue(fee, asset.decimals)
    fpResult = fpResult.sub(fpFee)
  }

  return FPNumber.lt(fpResult, FPNumber.ZERO) ? FPNumber.ZERO : fpResult
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

export const hasInsufficientXorForFee = (xorAsset: Nullable<AccountAsset | RegisteredAccountAsset>, fee: CodecString, isXorOutputSwap = false): boolean => {
  if (!xorAsset) return true
  if (asZeroValue(fee)) return false

  const decimals = xorAsset.decimals
  const xorBalance = getAssetBalance(xorAsset)
  const fpBalance = FPNumber.fromCodecValue(xorBalance, decimals)
  const fpFee = FPNumber.fromCodecValue(fee, decimals)

  return FPNumber.lt(fpBalance, fpFee) && !isXorOutputSwap
}

export const hasInsufficientEvmNativeTokenForFee = (evmBalance: CodecString, fee: CodecString): boolean => {
  if (!fee) return false

  const fpBalance = FPNumber.fromCodecValue(evmBalance)
  const fpFee = FPNumber.fromCodecValue(fee)

  return FPNumber.lt(fpBalance, fpFee)
}

export const getWalletAddress = (): string => {
  return storage.get('address')
}

export async function delay (ms = 50): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export const formatAssetSymbol = (assetSymbol: Nullable<string>): string => {
  return assetSymbol ?? ''
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

  return FPNumber.fromCodecValue(balance, asset.decimals).toLocaleString()
}

export const findAssetInCollection = (asset, collection) => {
  if (!Array.isArray(collection) || !asset?.address) return undefined

  return collection.find(item => item.address === asset.address)
}

export const debouncedInputHandler = (fn: any, timeout = 500, options = { leading: true }) => debounce(fn, timeout, options)

export const updateFpNumberLocale = (locale: string): void => {
  const thousandSymbol = Number(10000).toLocaleString(locale).substring(2, 3)

  if (thousandSymbol !== '0') {
    FPNumber.DELIMITERS_CONFIG.thousand = Number(12345).toLocaleString(locale).substring(2, 3)
  }

  FPNumber.DELIMITERS_CONFIG.decimal = Number(1.2).toLocaleString(locale).substring(1, 2)
}

export const updateDocumentTitle = (to?: any) => {
  const page = to ?? router.currentRoute

  if (page && page.name && i18n.te(`pageTitle.${page.name}`)) {
    document.title = `${i18n.t(`pageTitle.${page.name}`)} - ${app.name}`
  } else {
    document.title = app.name
  }
}

export const preloadFontFace = async (name: string): Promise<void> => {
  try {
    await (document as any).fonts.load(`1em ${name}`)
  } catch (err) {
    console.error(err)
  }
}

export const getCssVariableValue = (name: string): any => {
  return getComputedStyle(document.documentElement as any).getPropertyValue(name).trim()
}

export const toQueryString = (params: any): string => {
  return Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`).join('&')
}
