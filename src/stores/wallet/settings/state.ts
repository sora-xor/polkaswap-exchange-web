import { Currency } from '@/types/currency';

import { Theme, WalletAssetFilters, WalletFilteringOptions, IndexerType } from '@/lib/soraneo-wallet/src/consts';
import { Alert, ConnectionStatus, FilterOptions } from '@/lib/soraneo-wallet/src/types/common';
import { storage, runtimeStorage, settingsStorage } from '@/lib/soraneo-wallet/src/util/storage';
import { normalizeTheme } from './theme';

import type { SettingsState } from './types';
import type { NetworkFeesObject } from '@/lib/substrate/sdk/types';

const INDEXERS = [IndexerType.POLKASWAP] as const;

export function initialState(): SettingsState {
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
  const activeIndexerType = INDEXERS.includes(indexerType as IndexerType) ? (indexerType as IndexerType) : INDEXERS[0];

  return {
    apiKeys: {},
    alerts: (alerts || []) as Array<Alert>,
    allowTopUpAlert: allowTopUpAlerts ? Boolean(JSON.parse(allowTopUpAlerts)) : false,
    indexerType: activeIndexerType,
    indexers: {
      [IndexerType.POLKASWAP]: {
        endpoint: '',
        status: ConnectionStatus.Loading,
      },
    },
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
    networkFees: {} as NetworkFeesObject,
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
