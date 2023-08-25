import { FPNumber, CodecString } from '@sora-substrate/util';
import { isNativeAsset } from '@sora-substrate/util/build/assets';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import debounce from 'lodash/debounce';

import { app, ZeroStringValue } from '@/consts';
import i18n from '@/lang';
import router from '@/router';
import store from '@/store';

import ethersUtil from './ethers-util';
import storage from './storage';

import type { AmountWithSuffix } from '../types/formats';
import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { Route } from 'vue-router';

type AssetWithBalance = AccountAsset | AccountLiquidity | RegisteredAccountAsset;

type PoolAssets<T extends Asset> = { baseAsset: T; poolAsset: T };

export async function waitForSoraNetworkFromEnv(): Promise<WALLET_CONSTS.SoraNetwork> {
  return new Promise<WALLET_CONSTS.SoraNetwork>((resolve) => {
    store.original.watch(
      (state) => state.wallet.settings.soraNetwork,
      (value) => {
        if (value) {
          resolve(value);
        }
      }
    );
  });
}

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

export const isXorAccountAsset = (asset: Asset | AssetWithBalance): boolean => {
  return asset ? asset.address === XOR.address : false;
};

export const isMaxButtonAvailable = (
  areAssetsSelected: boolean,
  asset: AssetWithBalance,
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
  const fpMaxBalance = getMaxBalance(asset, fee, { parseAsLiquidity });

  return !FPNumber.eq(fpMaxBalance, fpAmount) && !hasInsufficientXorForFee(xorAsset, fee, isXorOutputSwap);
};

const getMaxBalance = (
  asset: AssetWithBalance,
  fee: CodecString,
  { isExternalBalance = false, isExternalNative = false, parseAsLiquidity = false, isBondedBalance = false } = {}
): FPNumber => {
  const balance = getAssetBalance(asset, { internal: !isExternalBalance, parseAsLiquidity, isBondedBalance });
  const decimals: number = asset[isExternalBalance ? 'externalDecimals' : 'decimals'];

  if (asZeroValue(balance)) return FPNumber.ZERO;

  let fpResult = FPNumber.fromCodecValue(balance, decimals);

  if (
    !isBondedBalance &&
    !asZeroValue(fee) &&
    ((!isExternalBalance && isXorAccountAsset(asset)) || (isExternalBalance && isExternalNative))
  ) {
    const fpFee = FPNumber.fromCodecValue(fee, decimals);
    fpResult = fpResult.sub(fpFee);
  }

  return FPNumber.lt(fpResult, FPNumber.ZERO) ? FPNumber.ZERO : fpResult;
};

export const getMaxValue = (
  asset: AccountAsset | RegisteredAccountAsset,
  fee: CodecString,
  { isExternalBalance = false, isExternalNative = false, isBondedBalance = false } = {}
): string => {
  return getMaxBalance(asset, fee, { isExternalBalance, isExternalNative, isBondedBalance }).toString();
};

export const getDeltaPercent = (desiredPrice: FPNumber, currentPrice: FPNumber): FPNumber => {
  const delta = desiredPrice.sub(currentPrice);
  return delta.div(currentPrice).mul(FPNumber.HUNDRED);
};

export const hasInsufficientBalance = (
  asset: AccountAsset | RegisteredAccountAsset,
  amount: string | number,
  fee: CodecString,
  isExternalBalance = false,
  isBondedBalance = false
): boolean => {
  const fpAmount = new FPNumber(amount, asset.decimals);
  const fpMaxBalance = getMaxBalance(asset, fee, { isExternalBalance, isBondedBalance });

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

export const hasInsufficientEvmNativeTokenForFee = (nativeBalance: CodecString, fee: CodecString): boolean => {
  if (!fee) return false;

  const fpBalance = FPNumber.fromCodecValue(nativeBalance);
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
  asset: Nullable<AssetWithBalance>,
  { internal = true, parseAsLiquidity = false, isBondedBalance = false } = {}
) => {
  if (!asset) return ZeroStringValue;

  if (!internal) {
    return (asset as RegisteredAccountAsset)?.externalBalance;
  }

  if (parseAsLiquidity) {
    return (asset as AccountLiquidity)?.balance;
  }

  if (isBondedBalance) {
    return (asset as AccountAsset)?.balance?.bonded;
  }

  return (asset as AccountAsset)?.balance?.transferable;
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

export const debouncedInputHandler = (fn: any, timeout = 500, options = { leading: true }) =>
  debounce(fn, timeout, options);

export const updateFpNumberLocale = (locale: string): void => {
  const thousandSymbol = Number(10000).toLocaleString(locale).substring(2, 3);

  if (thousandSymbol !== '0') {
    FPNumber.DELIMITERS_CONFIG.thousand = Number(12345).toLocaleString(locale).substring(2, 3);
  }

  FPNumber.DELIMITERS_CONFIG.decimal = Number(1.2).toLocaleString(locale).substring(1, 2);
};

export const updateDocumentTitle = (to?: Route) => {
  const page = to ?? router.currentRoute;
  const pageName = page?.name;
  // TODO: update pageTitle list: remove duplicates, add missed / change logic
  if (pageName && i18n.te(`pageTitle.${pageName}`)) {
    document.title = `${i18n.t(`pageTitle.${pageName}`)} - ${app.name}`;
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

export const waitForAccountPair = async (func?: FnWithoutArgs | AsyncFnWithoutArgs): Promise<any> => {
  if (!api.accountPair) {
    await delay();
    return await waitForAccountPair(func);
  } else {
    return func?.();
  }
};

export const getTextWidth = (text: string, fontFamily = 'Sora', size = 10): number => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return 0;

  context.font = `${size}px ${fontFamily}`;

  const width = Math.ceil(context.measureText(text).width);

  return width;
};

export const calcPriceChange = (current: FPNumber, prev: FPNumber): FPNumber => {
  if (prev.isZero()) return FPNumber.gt(current, FPNumber.ZERO) ? FPNumber.HUNDRED : FPNumber.ZERO;

  return current.sub(prev).div(prev).mul(FPNumber.HUNDRED);
};

// [TODO]: move to FPNumber
export const formatAmountWithSuffix = (value: FPNumber, precision = 2): AmountWithSuffix => {
  const val = value.toNumber();
  const format = (value: string) => new FPNumber(value).toLocaleString();

  if (Math.trunc(val / 1_000_000_000) > 0) {
    const amount = format((val / 1_000_000_000).toFixed(precision));
    return { amount, suffix: 'B' };
  } else if (Math.trunc(val / 1_000_000) > 0) {
    const amount = format((val / 1_000_000).toFixed(precision));
    return { amount, suffix: 'M' };
  } else if (Math.trunc(val / 1_000) > 0) {
    const amount = format((val / 1_000).toFixed(precision));
    return { amount, suffix: 'K' };
  } else {
    const amount = format(val.toFixed(precision));
    return { amount, suffix: '' };
  }
};

export const formatDecimalPlaces = (value: FPNumber | number, asPercent = false): string => {
  const formatted = new FPNumber(value.toFixed(2)).toLocaleString();
  const postfix = asPercent ? '%' : '';

  return `${formatted}${postfix}`;
};

const sortAssetsByProp = <T extends Asset>(a: T, b: T, prop: 'address' | 'symbol' | 'name') => {
  if (a[prop] < b[prop]) return -1;
  if (a[prop] > b[prop]) return 1;
  return 0;
};

export const sortAssets = <T extends Asset>(a: T, b: T) => {
  const isNativeA = isNativeAsset(a);
  const isNativeB = isNativeAsset(b);
  // sort native assets by address
  if (isNativeA && isNativeB) {
    return sortAssetsByProp(a, b, 'address');
  }
  if (isNativeA && !isNativeB) {
    return -1;
  }
  if (!isNativeA && isNativeB) {
    return 1;
  }
  // sort non native assets by symbol
  return sortAssetsByProp(a, b, 'symbol');
};

export const sortPools = <T extends Asset>(a: PoolAssets<T>, b: PoolAssets<T>) => {
  const byBaseAsset = sortAssets(a.baseAsset, b.baseAsset);

  return byBaseAsset === 0 ? sortAssets(a.poolAsset, b.poolAsset) : byBaseAsset;
};
