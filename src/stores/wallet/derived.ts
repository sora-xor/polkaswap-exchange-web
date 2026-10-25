import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

import { TransactionStatus } from '@/lib/substrate/sdk/types';

import type { HistoryItem, NetworkFeesObject } from '@/lib/substrate/sdk/types';
import type { CurrencyFields } from '@/lib/soraneo-wallet/src/types/currency';
import type { AccountState } from '@/stores/wallet/account/types';
import type { SettingsState } from '@/stores/wallet/settings/types';
import type { TransactionsState } from '@/stores/wallet/transactions/types';
import type { Nullable } from '@/types/common';

const DEFAULT_CURRENCY_SYMBOL = '$';
const XOR_CURRENCY_KEY = 'xor';

export const DAI_CURRENCY_KEY = 'dai';

/**
 * Indexes address-bearing wallet records by address.
 */
export const mapByAddress = <T extends { address: string }>(items: ReadonlyArray<T> = []): Record<string, T> => {
  return items.reduce<Record<string, T>>((buffer, item) => {
    if (item?.address) {
      buffer[item.address] = item;
    }

    return buffer;
  }, {});
};

/**
 * Resolves the display symbol for the selected fiat currency.
 */
export const resolveCurrencySymbol = (currency: Nullable<string>, currencies: CurrencyFields[] = []): string => {
  if (!currency) {
    return DEFAULT_CURRENCY_SYMBOL;
  }

  const currencyKey = currency.toLowerCase();
  const configuredCurrency = currencies.find((entry) => String(entry.key).toLowerCase() === currencyKey);

  if (configuredCurrency?.symbol) {
    return configuredCurrency.symbol;
  }

  if (currencyKey === XOR_CURRENCY_KEY) {
    return 'XOR';
  }

  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyKey.toUpperCase(),
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1);

    return parts.find((part) => part.type === 'currency')?.value ?? DEFAULT_CURRENCY_SYMBOL;
  } catch {
    return DEFAULT_CURRENCY_SYMBOL;
  }
};

/**
 * Resolves the active fiat exchange rate, including XOR inverse pricing.
 */
export const resolveExchangeRate = (settings: SettingsState, account: AccountState): number => {
  if (String(settings.currency).toLowerCase() === XOR_CURRENCY_KEY) {
    const xorPriceCodec = account.fiatPriceObject?.[XOR.address];
    const xorPrice = FPNumber.fromCodecValue(xorPriceCodec ?? 0);

    if (xorPrice.isGtZero()) {
      return FPNumber.ONE.div(xorPrice).toNumber();
    }

    return 1;
  }

  return settings.fiatExchangeRateObject?.[settings.currency] ?? 1;
};

/**
 * Checks whether persisted network fees match the current API fee shape.
 */
export const areLocalNetworkFeesOkay = (
  localFees: NetworkFeesObject = {} as NetworkFeesObject,
  apiFees: NetworkFeesObject = {} as NetworkFeesObject
): boolean => {
  const localFeeKeys = Object.keys(localFees);
  const apiFeeKeys = Object.keys(apiFees);

  if (!localFeeKeys.length) {
    return false;
  }

  if (!Number(localFees.Swap ?? 0)) {
    return false;
  }

  if (localFeeKeys.length !== apiFeeKeys.length) {
    return false;
  }

  localFeeKeys.sort();
  apiFeeKeys.sort();

  return localFeeKeys.every((key, index) => key === apiFeeKeys[index]);
};

/**
 * Returns the first active transaction that is ready to notify the UI.
 */
export const resolveFirstReadyTransaction = (state: TransactionsState): Nullable<HistoryItem> => {
  return state.activeTxsIds
    .map((id) => state.history[id])
    .find((transaction) =>
      transaction
        ? [TransactionStatus.InBlock, TransactionStatus.Finalized, TransactionStatus.Error].includes(
            transaction.status as TransactionStatus
          )
        : false
    ) as Nullable<HistoryItem>;
};

/**
 * Resolves the currently selected transaction across internal and external history buckets.
 */
export const resolveSelectedTransaction = (state: TransactionsState): Nullable<HistoryItem> => {
  if (!state.selectedTxId) {
    return null;
  }

  return (
    state.history[state.selectedTxId] ||
    state.externalHistory[state.selectedTxId] ||
    state.externalHistoryUpdates[state.selectedTxId]
  );
};
