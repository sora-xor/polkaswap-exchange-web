import { Currency } from '@/types/currency';

import { Theme, WalletAssetFilters, WalletFilteringOptions, IndexerType } from '../../consts';
import { Alert, ConnectionStatus, FilterOptions } from '../../types/common';
import { storage, runtimeStorage, settingsStorage } from '../../util/storage';
import { normalizeTheme } from './theme';

import type { SettingsState } from './types';
import type { NetworkFeesObject } from '@sora-substrate/sdk';

const INDEXERS = [IndexerType.SUBQUERY, IndexerType.SUBSQUID];

function initialState(): SettingsState {
  const shouldBalanceBeHidden = storage.get('shouldBalanceBeHidden');
  const currency = settingsStorage.get('currency') as Currency;
  const indexerType = settingsStorage.get('indexerType');
  const priceAlerts = settingsStorage.get('alerts');
  const alerts = priceAlerts && JSON.parse(priceAlerts);
  const feeMultiplier = runtimeStorage.get('feeMultiplier');
  const runtimeVersion = runtimeStorage.get('version');
  const allowFee = settingsStorage.get('allowFeePopup');
  const allowTopUpAlerts = settingsStorage.get('allowTopUpAlerts');
  const filters = storage.get('filters');
  const { option, verifiedOnly, zeroBalance } = filters && JSON.parse(filters);
  const theme = normalizeTheme(settingsStorage.get('theme'));

  return {
    apiKeys: {},
    alerts: (alerts || []) as Array<Alert>,
    allowTopUpAlert: allowTopUpAlerts ? Boolean(JSON.parse(allowTopUpAlerts)) : false,
    indexerType: indexerType ? (indexerType as IndexerType) : INDEXERS[0],
    indexers: {
      [IndexerType.SUBQUERY]: {
        endpoint: '',
        status: ConnectionStatus.Available,
      },
      [IndexerType.SUBSQUID]: {
        endpoint: '',
        status: ConnectionStatus.Available,
      },
    },
    isWalletLoaded: false, // wallet is loading
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
      option: option || WalletFilteringOptions.All,
      verifiedOnly: verifiedOnly || false,
      zeroBalance: zeroBalance || false,
    } as WalletAssetFilters,
    allowFeePopup: allowFee ? Boolean(JSON.parse(allowFee)) : true,
    soraNetwork: null,
    nftStorage: null,
    feeMultiplier: feeMultiplier ? Number(JSON.parse(feeMultiplier)) : 0,
    runtimeVersion: runtimeVersion ? Number(JSON.parse(runtimeVersion)) : 0,
    blockNumber: 0,
    blockNumberSubscription: null,
    feeMultiplierAndRuntimeSubscriptions: null,
    networkFees: {} as NetworkFeesObject, // It won't be empty at the moment of usage
    shouldBalanceBeHidden: shouldBalanceBeHidden ? Boolean(JSON.parse(shouldBalanceBeHidden)) : false,
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
