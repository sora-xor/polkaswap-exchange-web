import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it } from 'vitest';

import { TransactionStatus } from '@/lib/substrate/sdk/types';
import {
  areLocalNetworkFeesOkay,
  mapByAddress,
  resolveCurrencySymbol,
  resolveExchangeRate,
  resolveFirstReadyTransaction,
  resolveSelectedTransaction,
} from '@/stores/wallet/derived';

import type { HistoryItem, NetworkFeesObject } from '@/lib/substrate/sdk/types';
import type { AccountState } from '@/stores/wallet/account/types';
import type { SettingsState } from '@/stores/wallet/settings/types';
import type { TransactionsState } from '@/stores/wallet/transactions/types';

const historyItem = (id: string, status: TransactionStatus): HistoryItem =>
  ({
    id,
    status,
  }) as HistoryItem;

describe('wallet derived-state helpers', () => {
  it('indexes address-bearing records by address', () => {
    expect(
      mapByAddress([
        { address: '0x1', symbol: 'AAA' },
        { address: '', symbol: 'EMPTY' },
        { address: '0x2', symbol: 'BBB' },
      ])
    ).toEqual({
      '0x1': { address: '0x1', symbol: 'AAA' },
      '0x2': { address: '0x2', symbol: 'BBB' },
    });
  });

  it('resolves configured, special-case, intl, and fallback currency symbols', () => {
    expect(resolveCurrencySymbol(null)).toBe('$');
    expect(resolveCurrencySymbol('brl', [{ key: 'BRL', symbol: 'R$' } as never])).toBe('R$');
    expect(resolveCurrencySymbol('xor')).toBe('XOR');
    expect(resolveCurrencySymbol('usd')).toBe('$');
    expect(resolveCurrencySymbol('not-a-currency')).toBe('$');
  });

  it('resolves fiat exchange rates including XOR inverse pricing', () => {
    const account = {
      fiatPriceObject: {
        [XOR.address]: FPNumber.fromNatural(2).toCodecString(),
      },
    } as AccountState;

    expect(
      resolveExchangeRate(
        {
          currency: 'xor',
          fiatExchangeRateObject: {},
        } as SettingsState,
        account
      )
    ).toBe(0.5);
    expect(
      resolveExchangeRate(
        {
          currency: 'usd',
          fiatExchangeRateObject: {
            usd: 1.2,
          },
        } as SettingsState,
        account
      )
    ).toBe(1.2);
  });

  it('validates cached network fee shape against the live API fee shape', () => {
    expect(areLocalNetworkFeesOkay({}, { Swap: '1' } as NetworkFeesObject)).toBe(false);
    expect(areLocalNetworkFeesOkay({ Swap: '0' } as NetworkFeesObject, { Swap: '1' } as NetworkFeesObject)).toBe(false);
    expect(
      areLocalNetworkFeesOkay({ Swap: '1', Transfer: '2' } as NetworkFeesObject, { Swap: '1' } as NetworkFeesObject)
    ).toBe(false);
    expect(
      areLocalNetworkFeesOkay(
        { Swap: '1', Transfer: '2' } as NetworkFeesObject,
        { Transfer: '9', Swap: '9' } as NetworkFeesObject
      )
    ).toBe(true);
  });

  it('selects the first active transaction ready for notification', () => {
    const pending = historyItem('pending', TransactionStatus.Pending);
    const ready = historyItem('ready', TransactionStatus.Finalized);

    expect(
      resolveFirstReadyTransaction({
        activeTxsIds: ['missing', 'pending', 'ready'],
        history: {
          pending,
          ready,
        },
      } as TransactionsState)
    ).toBe(ready);
  });

  it('resolves selected transactions across internal and external history buckets', () => {
    const internal = historyItem('internal', TransactionStatus.Finalized);
    const external = historyItem('external', TransactionStatus.Finalized);
    const externalUpdate = historyItem('external-update', TransactionStatus.Finalized);

    expect(
      resolveSelectedTransaction({
        selectedTxId: 'internal',
        history: { internal },
        externalHistory: { internal: external },
        externalHistoryUpdates: {},
      } as TransactionsState)
    ).toBe(internal);
    expect(
      resolveSelectedTransaction({
        selectedTxId: 'external',
        history: {},
        externalHistory: { external },
        externalHistoryUpdates: {},
      } as TransactionsState)
    ).toBe(external);
    expect(
      resolveSelectedTransaction({
        selectedTxId: 'external-update',
        history: {},
        externalHistory: {},
        externalHistoryUpdates: { 'external-update': externalUpdate },
      } as TransactionsState)
    ).toBe(externalUpdate);
    expect(resolveSelectedTransaction({ selectedTxId: '', history: {} } as TransactionsState)).toBeNull();
  });
});
