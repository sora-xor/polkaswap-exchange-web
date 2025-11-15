import { FPNumber, WithKeyring, WithConnectionApi } from '@sora-substrate/sdk';
import { ExplorerLink, SoraNetwork } from '../consts';
import { FilterOptions, AccountIdentity } from '../types/common';
import { Currency } from '../types/currency';
import { RewardsAmountHeaderItem } from '../types/rewards';
import { Asset } from '@sora-substrate/sdk/build/assets/types';
import { RewardInfo, RewardsInfo } from '@sora-substrate/sdk/build/rewards/types';
import { Store } from 'vuex';

/**
 * Custom error type that serializes metadata into the message payload so Vuex
 * actions and UI handlers can surface localized errors consistently.
 */
export declare class AppError extends Error {
  key: string;
  payload: any;
  get message(): string;
  constructor(
    {
      key,
      payload,
    }?: {
      key?: string | undefined;
      payload?: {} | undefined;
    },
    ...params: any[]
  );
}
export declare const APP_NAME = 'Sora2 Wallet';
export declare const WHITE_LIST_URL = 'https://whitelist.polkaswap2.io/whitelist.json';
export declare const NFT_BLACK_LIST_URL = 'https://whitelist.polkaswap2.io/blacklist.json';
/**
 * Resolves once the browser has finished loading the document. Useful for
 * modules that have to interact with DOM APIs during boot.
 */
export declare function waitForDocumentReady(): Promise<void>;
/** Quick SS58 validation wrapper around the shared API instance. */
export declare const validateAddress: (address: string) => boolean;
/**
 * Formats an SS58 address for display while gracefully handling invalid input
 * values to avoid throwing inside UI renders.
 */
export declare const formatAccountAddress: (
  address: string,
  withPrefix?: boolean,
  chainApi?: WithConnectionApi
) => string;
/**
 * Fetches on-chain identity information for the provided address. When the
 * address is invalid or missing identity fields the helper returns `null` so
 * consumers can branch easily.
 */
export declare const getAccountIdentity: (
  address: string,
  chainApi?: WithConnectionApi
) => Promise<AccountIdentity | null>;
/**
 * Returns block explorer link according to appropriate network type.
 * @param soraNetwork
 * Devnet will set by default
 */
export declare const getExplorerLinks: (soraNetwork?: Nullable<SoraNetwork>) => Array<ExplorerLink>;
/**
 * Detects whether the current browser session can access a video input device.
 * This is used for QR code scanning and camera-dependent flows.
 */
export declare function checkDevicesAvailability(): Promise<boolean>;
/**
 * Queries the status of the camera permission. Returns an empty string when
 * the API is unavailable so UI code can treat it as "unknown".
 */
export declare function checkCameraPermission(): Promise<string>;
/**
 * Copies the given text to the system clipboard. Errors are logged instead of
 * thrown to avoid breaking UX flows that rely on best-effort copying.
 */
export declare const copyToClipboard: (text: string) => Promise<void>;
/** Finds a currency definition by key. */
export declare const getCurrency: (
  currencyName: Currency,
  currencies?: import('../types/currency').CurrencyFields[]
) => import('../types/currency').CurrencyFields | undefined;
/** Shortens an address by keeping the prefix and suffix. */
export declare const formatAddress: (address: string, length?: number) => string;
/** Maps history statuses to icon identifiers. */
export declare const getStatusIcon: (
  status: string
) => '' | 'refresh-16' | 'basic-clear-X-xs-24' | 'status-success-ic-16';
/** Converts history statuses into BEM-flavoured class names. */
export declare const getStatusClass: (status: string) => string;
/** Promise-based `setTimeout` helper. */
export declare const delay: (ms?: number) => Promise<void>;
/** Truncates long strings with an ellipsis in the middle. */
export declare const shortenValue: (string: string, length?: number) => string;
/** Safely converts nullable numeric strings into `FPNumber` instances. */
export declare const formatStringNumber: (value: Nullable<string>) => FPNumber;
/**
 * Aggregates reward items by asset address and converts codec values into
 * human readable amounts. Primarily used to render aggregated rewards in the
 * portfolio header.
 */
export declare const groupRewardsByAssetsList: (
  rewards: Array<RewardInfo | RewardsInfo>
) => Array<RewardsAmountHeaderItem>;
/** Reads a CSS variable from the root element. */
export declare const getCssVariableValue: (name: string) => string;
/** Measures the width of a string using an off-screen canvas. */
export declare const getTextWidth: (text: string, font?: string) => number;
/** Computes the width of the browser scrollbar to align overlays. */
export declare const getScrollbarWidth: () => number;
/**
 * Ensures the active account is ready to sign a transaction. The helper either
 * unlocks the account (when a password is cached) or shows the signature modal
 * and waits until the user confirms.
 */
export declare function beforeTransactionSign(
  store: Store<any>,
  signerApi: WithKeyring,
  mutationType?: string
): Promise<void>;
/**
 * Filters the provided assets collection based on the `FilterOptions` flag.
 * The helper is side-effect free and can be reused in both Vuex stores and UI
 * components.
 */
export declare function getAssetsSubset<T extends Asset>(tokensList: T[], assetsFilter: FilterOptions): T[];
