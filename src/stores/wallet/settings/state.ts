import { Currency } from '@/types/currency';

import { Theme, WalletAssetFilters, WalletFilteringOptions, IndexerType } from '@/lib/soraneo-wallet/src/consts';
import { Alert, ConnectionStatus, FilterOptions } from '@/lib/soraneo-wallet/src/types/common';
import { storage, runtimeStorage, settingsStorage } from '@/lib/soraneo-wallet/src/util/storage';
import { parseStoredBoolean, parseStoredFiniteNumber, parseStoredJson } from '@/utils/storageParsing';
import { normalizeTheme } from './theme';

import type { SettingsState } from './types';
import type { NetworkFeesObject } from '@/lib/substrate/sdk/types';

const INDEXERS = [IndexerType.POLKASWAP] as const;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAlerts = (value: unknown): value is Array<Alert> => Array.isArray(value);

export function initialState(): SettingsState {
  const shouldBalanceBeHidden = storage.get('shouldBalanceBeHidden');
  const currency = settingsStorage.get('currency') as Currency;
  const indexerType = settingsStorage.get('indexerType');
  const priceAlerts = settingsStorage.get('alerts');
  const alerts = parseStoredJson(priceAlerts, [] as Array<Alert>, isAlerts);
  const feeMultiplier = runtimeStorage.get('feeMultiplier');
  const runtimeVersion = runtimeStorage.get('version');
  const allowFee = settingsStorage.get('allowFeePopup');
  const allowTopUpAlerts = settingsStorage.get('allowTopUpAlerts');
  const filters = storage.get('filters');
  const parsedFilters = parseStoredJson(filters, {} as Record<string, unknown>, isPlainRecord);
  const option = parsedFilters.option;
  const verifiedOnly = parsedFilters.verifiedOnly;
  const zeroBalance = parsedFilters.zeroBalance;
  const theme = normalizeTheme(settingsStorage.get('theme'));
  const activeIndexerType = INDEXERS.includes(indexerType as IndexerType) ? (indexerType as IndexerType) : INDEXERS[0];

  return {
    apiKeys: {},
    alerts,
    allowTopUpAlert: parseStoredBoolean(allowTopUpAlerts, false),
    indexerType: activeIndexerType,
    indexers: {
      [IndexerType.POLKASWAP]: {
        endpoint: '',
        status: ConnectionStatus.Loading,
      },
    },
    sorametricsApiEndpoint: '',
    isWalletLoaded: false,
    permissions: {
      addAssets: true,
      addLiquidity: true,
      bridgeAssets: true,
      createAssets: true,
      sendAssets: true,
      swapAssets: true,
      showAssetDetails: true,
    },
    filters: {
      option:
        typeof option === 'string' && Object.values(WalletFilteringOptions).includes(option as WalletFilteringOptions)
          ? (option as WalletFilteringOptions)
          : WalletFilteringOptions.All,
      verifiedOnly: typeof verifiedOnly === 'boolean' ? verifiedOnly : false,
      zeroBalance: typeof zeroBalance === 'boolean' ? zeroBalance : false,
    } as WalletAssetFilters,
    allowFeePopup: parseStoredBoolean(allowFee, true),
    soraNetwork: null,
    nftStorage: null,
    feeMultiplier: parseStoredFiniteNumber(feeMultiplier, 0, (value) => value >= 0),
    runtimeVersion: parseStoredFiniteNumber(runtimeVersion, 0, (value) => Number.isSafeInteger(value) && value >= 0),
    blockNumber: 0,
    blockNumberSubscription: null,
    feeMultiplierAndRuntimeSubscriptions: null,
    networkFees: {} as NetworkFeesObject,
    shouldBalanceBeHidden: parseStoredBoolean(shouldBalanceBeHidden, false),
    currency: currency || Currency.DAI,
    currencies: [],
    fiatExchangeRateObject: { [Currency.DAI]: 1 },
    exchangeRateUnsubFn: null,
    assetsFilter: FilterOptions.All,
    isMSTAvailable: false,
    theme,
  };
}

const state = initialState();

export default state;
