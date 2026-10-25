import { describe, expect, it } from 'vitest';

import {
  prependPriceAlert,
  removePriceAlertAt,
  replacePriceAlert,
  setPriceAlertNotified,
} from '@/stores/wallet/alerts';

import type { Alert } from '@/lib/soraneo-wallet/src/types/common';

const alert = (token: string, wasNotified = false): Alert =>
  ({
    token,
    wasNotified,
  }) as Alert;

describe('wallet alert collection helpers', () => {
  it('prepends price alerts and enforces the configured cap', () => {
    expect(prependPriceAlert([alert('VAL'), alert('PSWAP')], alert('XOR'), 2)).toEqual([alert('XOR'), alert('VAL')]);
  });

  it('replaces and removes price alerts by position without mutating the source list', () => {
    const alerts = Object.freeze([alert('XOR'), alert('VAL'), alert('PSWAP')]);

    expect(replacePriceAlert(alerts, { position: 1, alert: alert('TBCD') })).toEqual([
      alert('XOR'),
      alert('TBCD'),
      alert('PSWAP'),
    ]);
    expect(removePriceAlertAt(alerts, 0)).toEqual([alert('VAL'), alert('PSWAP')]);
    expect(alerts).toEqual([alert('XOR'), alert('VAL'), alert('PSWAP')]);
  });

  it('updates notification state only for existing alert entries', () => {
    const alerts = Object.freeze([alert('XOR'), alert('VAL')]);

    expect(setPriceAlertNotified(alerts, { position: 1, value: true })).toEqual([alert('XOR'), alert('VAL', true)]);
    expect(setPriceAlertNotified(alerts, { position: 4, value: true })).toEqual([alert('XOR'), alert('VAL')]);
  });
});
