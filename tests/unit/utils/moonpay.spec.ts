import { describe, expect, it } from 'vitest';

import { buildMoonpayTransactionDetailsUrl } from '@/utils/moonpay';

describe('moonpay url utilities', () => {
  it('buildMoonpayTransactionDetailsUrl returns a safe widget URL for allowed origins', () => {
    const result = buildMoonpayTransactionDetailsUrl({
      returnUrl: 'https://buy.moonpay.com/transaction/123',
      transactionId: 'tx_123',
      language: 'en',
      colorCode: '#00ff00',
    });

    expect(result).toBeTruthy();

    const url = new URL(result);
    expect(url.origin).toBe('https://buy.moonpay.com');
    expect(url.pathname).toBe('/transaction/123');
    expect(url.searchParams.get('transactionId')).toBe('tx_123');
    expect(url.searchParams.get('language')).toBe('en');
    expect(url.searchParams.get('colorCode')).toBe('#00ff00');
  });

  it('buildMoonpayTransactionDetailsUrl rejects untrusted returnUrl origins', () => {
    const result = buildMoonpayTransactionDetailsUrl({
      returnUrl: 'https://evil.example/transaction/123',
      transactionId: 'tx_123',
      language: 'en',
      colorCode: '#00ff00',
    });

    expect(result).toBe('');
  });

  it('buildMoonpayTransactionDetailsUrl rejects non-https returnUrl', () => {
    const result = buildMoonpayTransactionDetailsUrl({
      returnUrl: 'http://buy.moonpay.com/transaction/123',
      transactionId: 'tx_123',
      language: 'en',
      colorCode: '#00ff00',
    });

    expect(result).toBe('');
  });
});
