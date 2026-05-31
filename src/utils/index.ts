import { FPNumber, type CodecString } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import debounce from 'lodash/debounce';
import { watch } from 'vue';

import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { Currency, CurrencyFields } from '@/lib/soraneo-wallet/src/types/currency';

type AssetWithBalance = AccountAsset | RegisteredAccountAsset;

import { ExplorerType, type ExplorerLink, SoraNetwork } from '@/consts';
import { getExplorerLinks } from '@/lib/soraneo-wallet/src/util';
import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';
import getScrollbarWidth from '@/utils/scrollbar-width';
import { delay } from './timing';
import {
  asZeroValue,
  getAssetBalance,
  getAssetDecimals,
  formatAssetBalance as formatAssetBalanceInternal,
  formatAmountWithSuffix as formatAmountWithSuffixInternal,
  isAmountValueIntegerOnly as isAmountValueIntegerOnlyInternal,
} from './asset-formatting';
import { sortAssets as sortAssetsInternal, sortPools as sortPoolsInternal } from './asset-sort';
import { toPrecision as toPrecisionInternal } from './fp';

const SORA_NATIVE_MAX_FEE_MARGIN_CODEC = '1000000000000';

export { getMobileCssClasses } from './device';
export { registerDocumentTitleResolver, updateDocumentTitle } from './documentTitle';
export { updateFpNumberLocale } from './fp-locale';
export { updatePipTheme } from './pipTheme';
export { delay } from './timing';
export { waitForAccountPair } from './walletReady';

export { asZeroValue, getAssetBalance, getAssetDecimals };
export const formatAssetBalance = formatAssetBalanceInternal;
export const formatAmountWithSuffix = formatAmountWithSuffixInternal;
export const isAmountValueIntegerOnly = isAmountValueIntegerOnlyInternal;
export const sortAssets = sortAssetsInternal;
export const sortPools = sortPoolsInternal;
export const toPrecision = toPrecisionInternal;

export async function waitUntil(condition: () => boolean): Promise<void> {
  if (condition()) return;
  await delay(250);
  await waitUntil(condition);
}

export async function waitForSoraNetworkFromEnv(): Promise<SoraNetwork> {
  const walletStore = useWalletStore(pinia);

  if (walletStore.soraNetwork) {
    return walletStore.soraNetwork as SoraNetwork;
  }

  return new Promise<SoraNetwork>((resolve) => {
    const stop = watch(
      () => walletStore.soraNetwork,
      (value) => {
        if (value) {
          stop();
          resolve(value as SoraNetwork);
        }
      },
      { flush: 'sync' }
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

export { formatAddress } from './formatAddress';

export const areEqual = <T>(prev: T, curr: T): boolean => JSON.stringify(prev) === JSON.stringify(curr);

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
  const walletStore = useWalletStore(pinia);

  if (walletStore.shouldBalanceBeHidden) {
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

    // Static SORA fees are estimated from placeholder calls; reserve a tiny
    // native-token margin so MAX values do not exceed post-fee balance.
    if (!isExternalBalance && isXorAccountAsset(asset)) {
      fpResult = fpResult.sub(FPNumber.fromCodecValue(SORA_NATIVE_MAX_FEE_MARGIN_CODEC, decimals));
    }
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

export async function conditionalAwait(func: AsyncFnWithoutArgs, wait: boolean): Promise<void> {
  if (wait) {
    await func();
  } else {
    func();
  }
}

export const getLiquidityBalance = (liquidity: Nullable<AccountLiquidity>): CodecString | undefined => {
  return liquidity?.balance;
};

export const debouncedInputHandler = (fn: any, timeout = 500, options = { leading: true }) =>
  debounce(fn, timeout, options);

const getCssVariablesScopeElement = (): Nullable<Element> => {
  if (typeof document === 'undefined') return null;

  return (
    document.querySelector('.sora-theme-provider[data-theme]') ??
    document.querySelector('.sora-theme-provider') ??
    document.documentElement
  );
};

export const getCssVariableValue = (name: string): string => {
  const scope = getCssVariablesScopeElement();
  if (!scope) return '';

  const scopeValue = getComputedStyle(scope as any)
    .getPropertyValue(name)
    .trim();

  if (scopeValue) return scopeValue;

  if (scope !== document.documentElement) {
    return getComputedStyle(document.documentElement as any)
      .getPropertyValue(name)
      .trim();
  }

  return '';
};

export const toQueryString = (params: any): string => {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join('&');
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

export const convertFPNumberToNumber = (fpValue: Nullable<FPNumber>, precision = 2): number => {
  return parseFloat((fpValue ?? FPNumber.ZERO).toFixed(precision));
};

export const formatDecimalPlaces = (value: FPNumber | number, asPercent = false): string => {
  const formatted = new FPNumber(value.toFixed(2)).toLocaleString();
  const postfix = asPercent ? '%' : '';

  return `${formatted}${postfix}`;
};

export const calcElScrollGutter: () => number = getScrollbarWidth;

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

const SORAMETRICS_V2_PATH = 'sorav2';

/** Builds SoraMetrics v2 dashboard links; the root route is now a network chooser. */
const getSorametricsBaseUrl = (baseUrl: string): string => {
  const trimmedUrl = baseUrl.replace(/\/+$/, '');
  return trimmedUrl.endsWith(`/${SORAMETRICS_V2_PATH}`) ? trimmedUrl : `${trimmedUrl}/${SORAMETRICS_V2_PATH}`;
};

const getSorametricsLink = (baseUrl: string, params: Record<string, string>): string => {
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return `${getSorametricsBaseUrl(baseUrl)}?${query}`;
};

const getSorametricsAccountLink = (baseUrl: string, accountId?: string): string => {
  if (!accountId) return '';

  return getSorametricsLink(baseUrl, { tab: 'balance', address: accountId });
};

const getSorametricsTxLink = (
  baseUrl: string,
  txId?: string,
  blockId?: number | string,
  eventIndex?: number
): string => {
  if (txId) {
    return getSorametricsLink(baseUrl, { tab: 'extrinsics', q: txId });
  }

  if (Number.isFinite(eventIndex) && Number.isFinite(blockId)) {
    return getSorametricsLink(baseUrl, { tab: 'extrinsics', q: `${blockId}-${eventIndex}` });
  }

  if (blockId) {
    return getSorametricsLink(baseUrl, { tab: 'extrinsics', block: String(blockId) });
  }

  return '';
};

const getPolkadotTxLink = (baseUrl: string, txId?: string, blockId?: number | string, eventIndex?: number): string => {
  if (blockId) {
    return `${baseUrl}/${blockId}`;
  }
  return '';
};

export const getSubstrateExplorerLinks = (
  baseLinks: ExplorerLink[],
  isAccount = false,
  id?: string, // tx hash or account address
  blockId?: number | string,
  eventIndex?: number
) => {
  if (!baseLinks.length) return [];

  if (isAccount) {
    return baseLinks
      .filter(({ type }) => type !== ExplorerType.Polkadot)
      .map(({ type, value }) => ({
        type,
        value: type === ExplorerType.Sorametrics ? getSorametricsAccountLink(value, id) : `${value}/account/${id}`,
      }))
      .filter((value) => !!value.value);
  }

  return baseLinks
    .map(({ type, value }) => {
      const link = { type } as ExplorerLink;

      if (type === ExplorerType.Sorametrics) {
        link.value = getSorametricsTxLink(value, id, blockId, eventIndex);
      } else if (type === ExplorerType.Subscan) {
        link.value = getSubscanTxLink(value, id, blockId, eventIndex);
      } else if (type === ExplorerType.Polkadot) {
        link.value = getPolkadotTxLink(value, id, blockId, eventIndex);
      }

      return link;
    })
    .filter((value) => !!value.value);
};

export const soraExplorerLinks = (
  soraNetwork: Nullable<SoraNetwork>,
  txValue?: string,
  blockId?: number | string,
  eventIndex?: number,
  isAccount = false
): Array<ExplorerLink> => {
  if (!soraNetwork) return [];

  return getSubstrateExplorerLinks(getExplorerLinks(soraNetwork), isAccount, txValue, blockId, eventIndex);
};
