import { FPNumber } from '@sora-substrate/math';
import { KnownAssets, NativeAssets } from '@sora-substrate/sdk/build/assets/consts';

import { resolveGlobalPinia } from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { api, connection } from '../api';
import {
  ExplorerLink,
  SoraNetwork,
  ExplorerType,
  syntheticAssetRegexp,
  kensetsuAssetRegexp,
  CeresAddresses,
} from '../consts';
import { Currencies } from '../consts/currencies';
import { FilterOptions } from '../types/common';

import type { AccountIdentity } from '../types/common';
import type { Currency } from '../types/currency';
import type { RewardsAmountHeaderItem } from '../types/rewards';
import type { WithKeyring, WithConnectionApi } from '@/lib/substrate/sdk/apiAccount';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/sdk/build/rewards/types';

/**
 * Custom error type that serializes metadata into the message payload so Vuex
 * actions and UI handlers can surface localized errors consistently.
 */
export class AppError extends Error {
  public key: string;
  public payload: any;

  get message(): string {
    const { key, payload } = this;
    return JSON.stringify({ key, payload });
  }

  constructor({ key = '', payload = {} } = {}, ...params) {
    super(...params);
    this.name = 'AppHandledError';
    this.key = key;
    this.payload = payload;
  }
}

export const APP_NAME = 'Sora2 Wallet';

/**
 * Bundle the verified asset lists with the app so token metadata remains
 * self-contained on static hosts such as IPFS and SoraFS.
 */
export const WHITE_LIST_URL = 'whitelist.json';
export const NFT_BLACK_LIST_URL = 'blacklist.json';
export const SORAMETRICS_EXPLORER_URL = 'https://sorametrics.org/sorav2';

/** Builds SoraMetrics v2 dashboard links; the root route is now a network chooser. */
const getSorametricsLink = (params: Record<string, string>): string => {
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return `${SORAMETRICS_EXPLORER_URL.replace(/\/+$/, '')}?${query}`;
};

export const getSorametricsAccountLink = (address: string): string => getSorametricsLink({ tab: 'balance', address });

export const getSorametricsBlockLink = (block: string | number): string =>
  getSorametricsLink({ tab: 'extrinsics', block: String(block) });

export const getSorametricsTransactionLink = (value: string): string =>
  getSorametricsLink({ tab: 'extrinsics', q: value });

/**
 * Resolves once the browser has finished loading the document. Useful for
 * modules that have to interact with DOM APIs during boot.
 */
export function waitForDocumentReady() {
  return new Promise<void>((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      const callback = () => {
        window.removeEventListener('load', callback);
        resolve();
      };

      window.addEventListener('load', callback);
    }
  });
}

/** Quick SS58 validation wrapper around the shared API instance. */
export const validateAddress = (address: string): boolean => {
  return !!address && api.validateAddress(address);
};

/**
 * Formats an SS58 address for display while gracefully handling invalid input
 * values to avoid throwing inside UI renders.
 */
export const formatAccountAddress = (address: string, withPrefix = true, chainApi: WithConnectionApi = api) => {
  try {
    return validateAddress(address) ? chainApi.formatAddress(address, withPrefix) : '';
  } catch {
    return '';
  }
};

/**
 * Fetches on-chain identity information for the provided address. When the
 * address is invalid or missing identity fields the helper returns `null` so
 * consumers can branch easily.
 */
export const getAccountIdentity = async (
  address: string,
  chainApi: WithConnectionApi = api
): Promise<AccountIdentity | null> => {
  if (!validateAddress(address)) return null;
  if (!chainApi.connected) return null;

  const identity = await chainApi.getAccountOnChainIdentity(address).catch(() => null);

  if (!identity) return null;

  return {
    name: identity.displayName,
    legalName: identity.legalName,
    approved: identity.approved,
  };
};

/**
 * Returns block explorer link according to appropriate network type.
 * @param soraNetwork
 * Devnet will set by default
 */
export const getExplorerLinks = (soraNetwork?: Nullable<SoraNetwork>): Array<ExplorerLink> => {
  // SORAScan
  // PROD { type: ExplorerType.Sorascan, value: 'https://sorascan.com/sora-mainnet' },
  // STAGE { type: ExplorerType.Sorascan, value: 'https://test.sorascan.com/sora-staging' }
  // TEST { type: ExplorerType.Sorascan, value: 'https://sorascan.tst.sora2.soramitsu.co.jp/sora-test' }
  // DEV { type: ExplorerType.Sorascan, value: 'https://explorer.s2.dev.sora2.soramitsu.co.jp/sora-dev' }
  const links: Array<ExplorerLink> = [];
  if (soraNetwork === SoraNetwork.Prod) {
    links.push({ type: ExplorerType.Sorametrics, value: SORAMETRICS_EXPLORER_URL });
  }
  return [
    ...links,
    {
      type: ExplorerType.Polkadot,
      value: `https://polkadot.js.org/apps/?rpc=${connection.endpoint}#/explorer/query`,
    },
  ];
};

/**
 * Detects whether the current browser session can access a video input device.
 * This is used for QR code scanning and camera-dependent flows.
 */
export async function checkDevicesAvailability(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices.some((device) => device.kind === 'videoinput');
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Queries the status of the camera permission. Returns an empty string when
 * the API is unavailable so UI code can treat it as "unknown".
 */
export async function checkCameraPermission(): Promise<string> {
  try {
    const { state } = await navigator.permissions.query({ name: 'camera' } as any);

    return state;
  } catch (error) {
    console.error(error);
    return '';
  }
}

/**
 * Copies the given text to the system clipboard. Errors are logged instead of
 * thrown to avoid breaking UX flows that rely on best-effort copying.
 */
export const copyToClipboard = async (text: string) => {
  try {
    return navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Could not copy text: ', err);
  }
};

/** Finds a currency definition by key. */
export const getCurrency = (currencyName: Currency, currencies = Currencies) => {
  return currencies.find((currency) => currency.key === currencyName);
};

/** Shortens an address by keeping the prefix and suffix. */
export const formatAddress = (address: string, length = address.length / 2): string => {
  if (address.length <= length) return address;

  return `${address.slice(0, length / 2)}...${address.slice(-length / 2)}`;
};

/** Maps history statuses to icon identifiers. */
export const getStatusIcon = (status: string) => {
  // TODO: [1.5] we should check it
  switch (status) {
    case 'IN_PROGRESS':
      return 'refresh-16';
    case 'ERROR':
      return 'basic-clear-X-xs-24';
    case 'SUCCESS':
      return 'status-success-ic-16';
  }
  return '';
};

/** Converts history statuses into BEM-flavoured class names. */
export const getStatusClass = (status: string) => {
  let state = '';
  switch (status) {
    case 'IN_PROGRESS':
      state = 'loading';
      break;
    case 'ERROR':
      state = 'error';
      break;
    case 'SUCCESS':
      state = 'success';
      break;
  }
  return state ? `info-status info-status--${state}` : 'info-status';
};

/** Promise-based `setTimeout` helper. */
export const delay = async (ms = 50) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

/** Truncates long strings with an ellipsis in the middle. */
export const shortenValue = (string: string, length = string.length / 2): string => {
  if (!string) return '';
  if (string.length < 35) return string;
  return `${string.slice(0, length / 2)}...${string.slice(-length / 2)}`;
};

/** Safely converts nullable numeric strings into `FPNumber` instances. */
export const formatStringNumber = (value: Nullable<string>) => (value ? new FPNumber(value) : FPNumber.ZERO);

/**
 * Aggregates reward items by asset address and converts codec values into
 * human readable amounts. Primarily used to render aggregated rewards in the
 * portfolio header.
 */
export const groupRewardsByAssetsList = (rewards: Array<RewardInfo | RewardsInfo>): Array<RewardsAmountHeaderItem> => {
  const rewardsHash = rewards.reduce((result, item) => {
    const isRewardsInfo = 'rewards' in item;

    if (isRewardsInfo && !(item as RewardsInfo).rewards.length) return result;

    const { address, decimals } = isRewardsInfo ? (item as RewardsInfo).rewards[0].asset : (item as RewardInfo).asset;
    const amount = isRewardsInfo ? (item as RewardsInfo).limit : (item as RewardInfo).amount;
    const current = result[address] || FPNumber.ZERO;
    const addValue = FPNumber.fromCodecValue(amount, decimals);
    result[address] = current.add(addValue);
    return result;
  }, {});

  return Object.entries(rewardsHash).reduce((total: Array<RewardsAmountHeaderItem>, [address, amount]) => {
    if ((amount as FPNumber).isZero()) return total;

    const item = {
      asset: KnownAssets.get(address),
      amount: (amount as FPNumber).toString(),
    } as RewardsAmountHeaderItem;

    total.push(item);

    return total;
  }, []);
};

/** Reads a CSS variable from the root element. */
export const getCssVariableValue = (name: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

/** Measures the width of a string using an off-screen canvas. */
export const getTextWidth = (text: string, font = '300 12px "Sora", sans-serif'): number => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) return 0;

  context.font = font;

  const width = context.measureText(text).width.toFixed(1);

  return Number(width);
};

/** Computes the width of the browser scrollbar to align overlays. */
export const getScrollbarWidth = (): number => {
  const outer = document.createElement('div');
  outer.className = 'el-scrollbar__wrap';
  outer.style.visibility = 'hidden';
  outer.style.width = '100px';
  outer.style.position = 'absolute';
  outer.style.top = '-9999px';
  document.body.appendChild(outer);

  const widthNoScroll = outer.offsetWidth;
  outer.style.overflow = 'scroll';

  const inner = document.createElement('div');
  inner.style.width = '100%';
  outer.appendChild(inner);

  const widthWithScroll = inner.offsetWidth;
  (outer.parentNode as HTMLElement).removeChild(outer);
  const scrollBarWidth = widthNoScroll - widthWithScroll;

  return scrollBarWidth;
};

/** Bridges transaction-sign visibility updates into either a store mutation or a local UI controller. */
export type TransactionSignVisibilityController = {
  setVisibility: (visible: boolean) => void;
  subscribe: (handler: (visible: boolean) => void) => VoidFunction;
};

export type TransactionSignVisibilityTarget = string | TransactionSignVisibilityController;
export type TransactionSignWalletState = {
  getPassword: (address: string) => Nullable<string>;
  isSignTxDialogDisabled: boolean;
};

type TransactionSignMutation = {
  type: string;
  payload?: unknown;
};

type TransactionSignStore = {
  commit: (type: string, payload?: unknown) => unknown;
  subscribe: (handler: (mutation: TransactionSignMutation) => void) => VoidFunction;
} | null;

const isTransactionSignVisibilityController = (
  value: TransactionSignVisibilityTarget | undefined
): value is TransactionSignVisibilityController => {
  return Boolean(value) && typeof value !== 'string';
};

const createMutationVisibilityController = (
  store: TransactionSignStore,
  mutationType: string
): TransactionSignVisibilityController => ({
  setVisibility: (visible: boolean) => {
    if (!store) return;
    store.commit(mutationType, visible);
  },
  subscribe: (handler: (visible: boolean) => void) =>
    store
      ? store.subscribe((mutation) => {
          if (mutation.type === mutationType && typeof mutation.payload === 'boolean') {
            handler(mutation.payload);
          }
        })
      : () => undefined,
});

const resolveTransactionSignWalletState = (): TransactionSignWalletState | null => {
  try {
    return useWalletStore(resolveGlobalPinia());
  } catch {
    return null;
  }
};

export async function beforeTransactionSign(
  store: TransactionSignStore,
  signerApi: WithKeyring,
  visibilityTarget: TransactionSignVisibilityTarget = 'wallet/transactions/setSignTxDialogVisibility',
  walletState: TransactionSignWalletState | null = resolveTransactionSignWalletState()
): Promise<void> {
  const { address, signer } = signerApi;

  if (!address || signer) return;

  const password = walletState?.getPassword(address) ?? null;
  const confirmDisabled = Boolean(walletState?.isSignTxDialogDisabled);

  if (password && confirmDisabled) {
    signerApi.unlockPair(password);
  } else {
    if (!isTransactionSignVisibilityController(visibilityTarget) && !store) {
      throw new Error('Transaction sign visibility store is unavailable.');
    }

    const controller = isTransactionSignVisibilityController(visibilityTarget)
      ? visibilityTarget
      : createMutationVisibilityController(store, visibilityTarget);

    controller.setVisibility(true);

    await new Promise<void>((resolve) => {
      const unsubscribe = controller.subscribe((visible) => {
        if (!visible) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  if (signerApi.accountPair?.isLocked) {
    throw new Error('Cancelled');
  }
}

/**
 * Filters the provided assets collection based on the `FilterOptions` flag.
 * The helper is side-effect free and can be reused in both Vuex stores and UI
 * components.
 */
export function getAssetsSubset<T extends Asset>(tokensList: T[], assetsFilter: FilterOptions): T[] {
  switch (assetsFilter) {
    case FilterOptions.Native: {
      const nativeAssetsAddresses = NativeAssets.map((nativeAsset) => nativeAsset.address);
      return tokensList.filter((asset) => nativeAssetsAddresses.includes(asset.address));
    }
    case FilterOptions.Kensetsu: {
      return tokensList.filter((asset) => kensetsuAssetRegexp.test(asset.address));
    }
    case FilterOptions.Synthetics: {
      return tokensList.filter((asset) => syntheticAssetRegexp.test(asset.address));
    }
    case FilterOptions.Ceres: {
      const ceresAssetsAddresses = CeresAddresses;
      return tokensList.filter((asset) => ceresAssetsAddresses.includes(asset.address));
    }
    default: {
      return tokensList;
    }
  }
}
