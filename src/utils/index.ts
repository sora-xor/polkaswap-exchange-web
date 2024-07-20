import { FPNumber, CodecString } from '@sora-substrate/util';
import { isNativeAsset } from '@sora-substrate/util/build/assets';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, WALLET_CONSTS, getExplorerLinks } from '@soramitsu/soraneo-wallet-web';
import scrollbarWidth from 'element-ui/src/utils/scrollbar-width';
import debounce from 'lodash/debounce';

import { app, TranslationConsts, ZeroStringValue } from '@/consts';
import i18n from '@/lang';
import router from '@/router';
import store from '@/store';

import type { AmountWithSuffix } from '../types/formats';
import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { Currency, CurrencyFields } from '@soramitsu/soraneo-wallet-web/lib/types/currency';
import type { Route } from 'vue-router';

type AssetWithBalance = AccountAsset | RegisteredAccountAsset;

type PoolAssets<T extends Asset> = { baseAsset: T; poolAsset: T };

export async function waitUntil(condition: () => boolean): Promise<void> {
  if (condition()) return;
  await delay(250);
  await waitUntil(condition);
}

export async function waitForSoraNetworkFromEnv(): Promise<WALLET_CONSTS.SoraNetwork> {
  return new Promise<WALLET_CONSTS.SoraNetwork>((resolve) => {
    const unsubscribe = store.original.watch(
      (state) => state.wallet.settings.soraNetwork,
      (value) => {
        if (value) {
          unsubscribe();
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

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatAddress = (address: string, length = address.length / 2): string => {
  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`;
};

export const isXorAccountAsset = (asset: Asset | AssetWithBalance): boolean => {
  return asset ? asset.address === XOR.address : false;
};

export const isMaxButtonAvailable = (
  asset: AssetWithBalance,
  amount: string | number,
  fee: CodecString,
  xorAsset: AccountAsset | RegisteredAccountAsset,
  isXorOutputSwap = false
): boolean => {
  if (store.state.wallet.settings.shouldBalanceBeHidden) {
    return false; // MAX button behavior discloses hidden balance so it should be hidden in ANY case
  }

  if (!asset || !xorAsset || asZeroValue(getAssetBalance(asset))) {
    return false;
  }

  const fpAmount = new FPNumber(amount, asset.decimals);
  const fpMaxBalance = getMaxBalance(asset, fee);

  return !FPNumber.eq(fpMaxBalance, fpAmount) && !hasInsufficientXorForFee(xorAsset, fee, isXorOutputSwap);
};

export const getMaxBalance = (
  asset: AssetWithBalance,
  fee: CodecString,
  { isExternalBalance = false, isExternalNative = false, isBondedBalance = false } = {}
): FPNumber => {
  const balance = getAssetBalance(asset, { internal: !isExternalBalance, isBondedBalance });
  const decimals = getAssetDecimals(asset, { internal: !isExternalBalance }) as number;

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

  return fpResult.max(FPNumber.ZERO);
};

export const getMaxValue = (
  asset: AccountAsset | RegisteredAccountAsset,
  fee: CodecString,
  { isExternalBalance = false, isExternalNative = false, isBondedBalance = false } = {}
): string => {
  return getMaxBalance(asset, fee, { isExternalBalance, isExternalNative, isBondedBalance }).toString();
};

/** Change FPNumber precision (`FPNumber.dp()` has issues) */
export const toPrecision = (value: FPNumber, precision: number): FPNumber => {
  return new FPNumber(value.toFixed(precision), precision);
};

/**
 * Returns formatted value in most suitable form
 * @param value
 *
 * 0.152345 -> 0.15
 * 0.000043 -> 0.000043
 */
export const showMostFittingValue = (
  value: FPNumber,
  precisionForLowCostAsset = FPNumber.DEFAULT_PRECISION
): string => {
  const [integer, decimal = '00'] = value.toString().split('.');
  const precision = parseInt(integer) > 0 ? 2 : Math.min(decimal.search(/[1-9]/) + 2, precisionForLowCostAsset);

  return toPrecision(value, precision).toLocaleString();
};

// TODO: export from wallet
export const getCurrency = (currencyName: Currency, currencies: CurrencyFields[]): CurrencyFields | undefined => {
  return currencies.find((currency) => currency.key === currencyName);
};

export const hasInsufficientBalance = (
  asset: AccountAsset | RegisteredAccountAsset,
  amount: string | number,
  fee: CodecString,
  { isExternalBalance = false, isExternalNative = false, isBondedBalance = false } = {}
): boolean => {
  const decimals = getAssetDecimals(asset, { internal: !isExternalBalance }) as number;
  const fpAmount = new FPNumber(amount, decimals);
  const fpMaxBalance = getMaxBalance(asset, fee, { isExternalBalance, isExternalNative, isBondedBalance });

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

export const hasInsufficientNativeTokenForFee = (nativeBalance: CodecString, fee: CodecString): boolean => {
  if (!fee) return false;

  const fpBalance = FPNumber.fromCodecValue(nativeBalance);
  const fpFee = FPNumber.fromCodecValue(fee);

  return FPNumber.lt(fpBalance, fpFee);
};

export async function delay(ms = 50, success = true): Promise<void> {
  return await new Promise((resolve, reject) => setTimeout(success ? resolve : reject, ms));
}

export async function conditionalAwait(func: AsyncFnWithoutArgs, wait: boolean): Promise<void> {
  if (wait) {
    await func();
  } else {
    func();
  }
}

export const asZeroValue = (value: any): boolean => {
  return !Number.isFinite(+value) || +value === 0;
};

export const getAssetBalance = (
  asset: Nullable<AssetWithBalance>,
  { internal = true, isBondedBalance = false } = {}
) => {
  if (!asset) return ZeroStringValue;

  if (!internal) {
    return (asset as RegisteredAccountAsset)?.externalBalance;
  }

  if (isBondedBalance) {
    return (asset as AccountAsset)?.balance?.bonded;
  }

  return (asset as AccountAsset)?.balance?.transferable;
};

export const getLiquidityBalance = (liquidity: Nullable<AccountLiquidity>): CodecString | undefined => {
  return liquidity?.balance;
};

export const getAssetDecimals = (asset: any, { internal = true } = {}): number | undefined => {
  if (!asset) return undefined;

  return internal ? asset.decimals : asset.externalDecimals;
};

export const formatAssetBalance = (
  asset: any,
  { internal = true, formattedZero = '', showZeroBalance = true, isBondedBalance = false } = {}
): string => {
  if (!asset) return formattedZero;

  const balance = getAssetBalance(asset, { internal, isBondedBalance });

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

/** It's used to set css classes for mobile. `[mobile, android | windows | ios]` or `undefined` */
export const getMobileCssClasses = () => {
  const win: typeof window & Record<string, any> = window;
  const userAgent = navigator.userAgent || navigator.vendor || win.opera;
  const mobileClass = 'mobile';
  // Windows Phone must come first because its UA also contains "Android"
  if (/windows phone/i.test(userAgent)) {
    return [mobileClass, 'windows'];
  }
  if (/android/i.test(userAgent)) {
    return [mobileClass, 'android'];
  }
  // iOS detection from: http://stackoverflow.com/a/9039885/177710
  if (/iPad|iPhone|iPod/.test(userAgent) && !win.MSStream) {
    return [mobileClass, 'ios'];
  }
  // The only difference between iPadPro and the other macos platforms is that iPadPro is touch enabled.
  if (navigator?.maxTouchPoints > 2 && /Mac/.test(userAgent)) {
    return [mobileClass, 'ios'];
  }
  return undefined;
};

export const updateDocumentTitle = (to?: Route) => {
  const page = to ?? router.currentRoute;
  const pageName = page?.name;
  const pageTitleKey = `pageTitle.${pageName}`;
  // TODO: update pageTitle list: remove duplicates, add missed / change logic
  if (pageName && i18n.te(pageTitleKey)) {
    const pageTitleValue = i18n.t(pageTitleKey, TranslationConsts) as string;
    document.title = `${pageTitleValue} - ${app.name}`;
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

export const calcElScrollGutter: () => number = scrollbarWidth;

const getSubscanTxLink = (baseUrl: string, txId?: string, blockId?: number | string, eventIndex?: number): string => {
  if (!(txId || blockId)) return '';

  let link = txId ? `${baseUrl}/extrinsic/${txId}` : `${baseUrl}/block/${blockId}`;

  if (Number.isFinite(eventIndex) && Number.isFinite(blockId)) {
    link += `?event=${blockId}-${eventIndex}`;

    if (!txId) {
      link += '&tab=event';
    }
  }

  return link;
};

const getPolkadotTxLink = (baseUrl: string, txId?: string, blockId?: number | string, eventIndex?: number): string => {
  if (blockId) {
    return `${baseUrl}/${blockId}`;
  }
  return '';
};

export const getSubstrateExplorerLinks = (
  baseLinks: WALLET_CONSTS.ExplorerLink[],
  isAccount = false,
  id?: string, // tx hash or account address
  blockId?: number | string,
  eventIndex?: number
) => {
  if (!baseLinks.length) return [];

  if (isAccount) {
    return baseLinks
      .filter(({ type }) => type !== WALLET_CONSTS.ExplorerType.Polkadot)
      .map(({ type, value }) => ({ type, value: `${value}/account/${id}` }));
  }

  return baseLinks
    .map(({ type, value }) => {
      const link = { type } as WALLET_CONSTS.ExplorerLink;

      if (type === WALLET_CONSTS.ExplorerType.Subscan) {
        link.value = getSubscanTxLink(value, id, blockId, eventIndex);
      } else if (type === WALLET_CONSTS.ExplorerType.Polkadot) {
        link.value = getPolkadotTxLink(value, id, blockId, eventIndex);
      }

      return link;
    })
    .filter((value) => !!value.value);
};

export const soraExplorerLinks = (
  soraNetwork: Nullable<WALLET_CONSTS.SoraNetwork>,
  txValue?: string,
  blockId?: number | string,
  eventIndex?: number,
  isAccount = false
): Array<WALLET_CONSTS.ExplorerLink> => {
  if (!soraNetwork) return [];

  return getSubstrateExplorerLinks(getExplorerLinks(soraNetwork), isAccount, txValue, blockId, eventIndex);
};
