import debounce from 'lodash/debounce';
import { api } from '@soramitsu/soraneo-wallet-web';
import { RegisteredAccountAsset, FPNumber, CodecString } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

import router from '@/router';
import i18n from '@/lang';
import { app } from '@/consts';

import storage from './storage';
import type { RegisterAssetWithExternalBalance } from '@/store/assets/types';

export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    return navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Could not copy text: ', err);
  }
};

export const formatAddress = (address: string, length = address.length / 2): string => {
  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`;
};

export const isXorAccountAsset = (asset: Asset | AccountAsset | RegisteredAccountAsset | AccountLiquidity): boolean => {
  return asset ? asset.address === XOR.address : false;
};

export const isEthereumAddress = (address: string): boolean => {
  const numberString = address.replace(/^0x/, '');
  const number = parseInt(numberString, 16);

  return number === 0;
};

export const isMaxButtonAvailable = (
  areAssetsSelected: boolean,
  asset: AccountAsset | RegisteredAccountAsset | AccountLiquidity,
  amount: string | number,
  fee: CodecString,
  xorAsset: AccountAsset | RegisteredAccountAsset,
  parseAsLiquidity = false,
  isXorOutputSwap = false
): boolean => {
  if (!asset || !areAssetsSelected || !xorAsset || asZeroValue(getAssetBalance(asset, { parseAsLiquidity }))) {
    return false;
  }

  const fpAmount = new FPNumber(amount, asset.decimals);
  const fpMaxBalance = getMaxBalance(asset, fee, false, parseAsLiquidity);

  return !FPNumber.eq(fpMaxBalance, fpAmount) && !hasInsufficientXorForFee(xorAsset, fee, isXorOutputSwap);
};

const getMaxBalance = (
  asset: AccountAsset | RegisteredAccountAsset | AccountLiquidity | RegisterAssetWithExternalBalance, // TODO: [Release 1.7] fix RegisteredAccountAsset
  fee: CodecString,
  isExternalBalance = false,
  parseAsLiquidity = false,
  isBondedBalance = false
): FPNumber => {
  const balance = getAssetBalance(asset, { internal: !isExternalBalance, parseAsLiquidity, isBondedBalance });
  const decimals: number = asset[isExternalBalance ? 'externalDecimals' : 'decimals'];

  if (asZeroValue(balance)) return FPNumber.ZERO;

  let fpResult = FPNumber.fromCodecValue(balance, decimals);

  if (
    !asZeroValue(fee) &&
    ((!isExternalBalance && isXorAccountAsset(asset)) ||
      (isExternalBalance && isEthereumAddress((asset as RegisteredAccountAsset).externalAddress))) &&
    !isBondedBalance
  ) {
    const fpFee = FPNumber.fromCodecValue(fee);
    fpResult = fpResult.sub(fpFee);
  }

  return FPNumber.lt(fpResult, FPNumber.ZERO) ? FPNumber.ZERO : fpResult;
};

export const getMaxValue = (
  asset: AccountAsset | RegisteredAccountAsset | RegisterAssetWithExternalBalance,
  fee: CodecString,
  isExternalBalance = false,
  isBondedBalance = false
): string => {
  return getMaxBalance(asset, fee, isExternalBalance, false, isBondedBalance).toString();
};

export const hasInsufficientBalance = (
  asset: AccountAsset | RegisteredAccountAsset,
  amount: string | number,
  fee: CodecString,
  isExternalBalance = false,
  isBondedBalance = false
): boolean => {
  const fpAmount = new FPNumber(amount, asset.decimals);
  const fpMaxBalance = getMaxBalance(asset, fee, isExternalBalance, false, isBondedBalance);

  return FPNumber.lt(fpMaxBalance, fpAmount);
};

export const hasInsufficientXorForFee = (
  xorAsset: Nullable<AccountAsset | RegisteredAccountAsset>,
  fee: CodecString,
  isXorOutputSwap = false
): boolean => {
  if (!xorAsset) return true;
  if (asZeroValue(fee)) return false;

  const decimals = xorAsset.decimals;
  const xorBalance = getAssetBalance(xorAsset);
  const fpBalance = FPNumber.fromCodecValue(xorBalance, decimals);
  const fpFee = FPNumber.fromCodecValue(fee, decimals);

  return FPNumber.lt(fpBalance, fpFee) && !isXorOutputSwap;
};

export const hasInsufficientEvmNativeTokenForFee = (evmBalance: CodecString, fee: CodecString): boolean => {
  if (!fee) return false;

  const fpBalance = FPNumber.fromCodecValue(evmBalance);
  const fpFee = FPNumber.fromCodecValue(fee);

  return FPNumber.lt(fpBalance, fpFee);
};

export const getWalletAddress = (): string => {
  return storage.get('address');
};

export async function delay(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export const asZeroValue = (value: any): boolean => {
  return !Number.isFinite(+value) || +value === 0;
};

export const getAssetBalance = (
  asset: any,
  { internal = true, parseAsLiquidity = false, isBondedBalance = false } = {}
) => {
  if (!internal) {
    return asset?.externalBalance;
  }

  if (parseAsLiquidity) {
    return asset?.balance;
  }

  if (isBondedBalance) {
    return asset?.balance?.bonded;
  }

  return asset?.balance?.transferable;
};

export const getAssetDecimals = (asset: any, { internal = true } = {}): number | undefined => {
  if (!asset) return undefined;

  return internal ? asset.decimals : asset.externalDecimals;
};

export const formatAssetBalance = (
  asset: any,
  {
    internal = true,
    parseAsLiquidity = false,
    formattedZero = '',
    showZeroBalance = true,
    isBondedBalance = false,
  } = {}
): string => {
  if (!asset) return formattedZero;

  const balance = getAssetBalance(asset, { internal, parseAsLiquidity, isBondedBalance });

  if (!balance || (!showZeroBalance && asZeroValue(balance))) return formattedZero;

  const decimals = getAssetDecimals(asset, { internal });

  return FPNumber.fromCodecValue(balance, decimals).toLocaleString();
};

export const findAssetInCollection = (asset, collection) => {
  if (!Array.isArray(collection) || !asset?.address) return undefined;

  return collection.find((item) => item.address === asset.address);
};

export const debouncedInputHandler = (fn: any, timeout = 500, options = { leading: true }) =>
  debounce(fn, timeout, options);

export const updateFpNumberLocale = (locale: string): void => {
  const thousandSymbol = Number(10000).toLocaleString(locale).substring(2, 3);

  if (thousandSymbol !== '0') {
    FPNumber.DELIMITERS_CONFIG.thousand = Number(12345).toLocaleString(locale).substring(2, 3);
  }

  FPNumber.DELIMITERS_CONFIG.decimal = Number(1.2).toLocaleString(locale).substring(1, 2);
};

export const updateDocumentTitle = (to?: any) => {
  const page = to ?? router.currentRoute;

  if (page && page.name && i18n.te(`pageTitle.${page.name}`)) {
    document.title = `${i18n.t(`pageTitle.${page.name}`)} - ${app.name}`;
  } else {
    document.title = app.title;
  }
};

export const preloadFontFace = async (name: string): Promise<void> => {
  try {
    await (document as any).fonts.load(`1em ${name}`);
  } catch (err) {
    console.error(err);
  }
};

export const getCssVariableValue = (name: string): string => {
  return getComputedStyle(document.documentElement as any)
    .getPropertyValue(name)
    .trim();
};

export const toQueryString = (params: any): string => {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join('&');
};

export const waitForAccountPair = async (func: VoidFunction): Promise<any> => {
  if (!api.accountPair) {
    await delay();
    return await waitForAccountPair(func);
  } else {
    return func();
  }
};
