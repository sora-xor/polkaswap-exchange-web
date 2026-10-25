import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import {
  asZeroValue,
  formatAmountWithSuffix,
  formatAssetBalance,
  getAssetBalance,
  getAssetDecimals,
  isAmountValueIntegerOnly,
  normalizeCodecBalanceValue,
} from '@/utils/asset-formatting';

const accountAsset = {
  decimals: 4,
  balance: {
    transferable: '1234500',
    bonded: '990000',
  },
};

const registeredAsset = {
  decimals: 18,
  externalDecimals: 6,
  externalBalance: '7654321',
};

describe('asZeroValue', () => {
  it('treats invalid, empty, and numeric zero inputs as zero-like', () => {
    expect(asZeroValue('not-a-number')).toBe(true);
    expect(asZeroValue('')).toBe(true);
    expect(asZeroValue('0')).toBe(true);
    expect(asZeroValue(0)).toBe(true);
  });

  it('does not treat finite non-zero numeric inputs as zero-like', () => {
    expect(asZeroValue('0.01')).toBe(false);
    expect(asZeroValue(12)).toBe(false);
  });
});

describe('getAssetBalance', () => {
  it('falls back to zero when the asset or requested balance field is unavailable', () => {
    expect(getAssetBalance(null)).toBe('0');
    expect(getAssetBalance({ decimals: 18 } as any)).toBe('0');
    expect(getAssetBalance({ decimals: 18 } as any, { isBondedBalance: true })).toBe('0');
    expect(getAssetBalance({ decimals: 18 } as any, { internal: false })).toBe('0');
  });

  it('reads transferable, bonded, and external balances from the matching asset shape', () => {
    expect(getAssetBalance(accountAsset as any)).toBe('1234500');
    expect(getAssetBalance(accountAsset as any, { isBondedBalance: true })).toBe('990000');
    expect(getAssetBalance(registeredAsset as any, { internal: false })).toBe('7654321');
  });

  it('normalizes formatted and hex codec balances before display math', () => {
    expect(normalizeCodecBalanceValue(' 218,116,474,998,731,886,993 ')).toBe('218116474998731886993');
    expect(normalizeCodecBalanceValue('0x0bd2c467fd9df2a1')).toBe('851959230442107553');
    expect(normalizeCodecBalanceValue('1.5')).toBeNull();
    expect(getAssetBalance({ balance: { transferable: '0x0bd2c467fd9df2a1' } } as any)).toBe('851959230442107553');
  });

  it('normalizes codec-like API balance values without unsafe number coercion', () => {
    expect(normalizeCodecBalanceValue(42)).toBe('42');
    expect(normalizeCodecBalanceValue(1.5)).toBeNull();
    expect(normalizeCodecBalanceValue({ toJSON: () => ({ balance: '999,601,922,365,042,012,692' }) })).toBe(
      '999601922365042012692'
    );
    expect(normalizeCodecBalanceValue({ toJSON: () => null, toString: () => '0x04e62b741e86d3014' })).toBe(
      '5648278376376250388'
    );
  });
});

describe('getAssetDecimals', () => {
  it('returns undefined for missing assets and selects internal or external decimals explicitly', () => {
    expect(getAssetDecimals(null)).toBeUndefined();
    expect(getAssetDecimals(registeredAsset as any)).toBe(18);
    expect(getAssetDecimals(registeredAsset as any, { internal: false })).toBe(6);
  });
});

describe('formatAssetBalance', () => {
  it('formats codec balances with the asset decimals for internal balances', () => {
    expect(formatAssetBalance(accountAsset as any)).toBe('123.45');
    expect(formatAssetBalance(accountAsset as any, { isBondedBalance: true })).toBe('99');
  });

  it('formats external balances with external decimals', () => {
    expect(formatAssetBalance(registeredAsset as any, { internal: false })).toBe('7.654321');
  });

  it('uses the configured fallback for missing assets, empty balances, and hidden zero balances', () => {
    expect(formatAssetBalance(null, { formattedZero: '-' })).toBe('-');
    expect(formatAssetBalance({ decimals: 18, balance: { transferable: '' } } as any, { formattedZero: '-' })).toBe(
      '-'
    );
    expect(
      formatAssetBalance({ decimals: 18, balance: { transferable: '0' } } as any, {
        formattedZero: '-',
        showZeroBalance: false,
      })
    ).toBe('-');
  });
});

describe('formatAmountWithSuffix', () => {
  it('omits trailing decimals for integer values', () => {
    expect(formatAmountWithSuffix(new FPNumber('532'))).toEqual({
      amount: '532',
      suffix: '',
    });
  });

  it('keeps significant decimal digits when abbreviating values', () => {
    expect(formatAmountWithSuffix(new FPNumber('1500'))).toEqual({
      amount: '1.5',
      suffix: 'K',
    });
  });

  it('uses the largest supported suffix that has a whole-number tier', () => {
    expect(formatAmountWithSuffix(new FPNumber('1234567890000000'), 1)).toEqual({
      amount: '1.2',
      suffix: 'q',
    });
  });
});

describe('isAmountValueIntegerOnly', () => {
  it('rejects nullish and blank values', () => {
    expect(isAmountValueIntegerOnly(null)).toBe(false);
    expect(isAmountValueIntegerOnly(undefined)).toBe(false);
    expect(isAmountValueIntegerOnly('   ')).toBe(false);
  });

  it('treats values without a significant fractional part as integers', () => {
    expect(isAmountValueIntegerOnly('12,880.0')).toBe(true);
    expect(isAmountValueIntegerOnly('0.00')).toBe(true);
    expect(isAmountValueIntegerOnly('0')).toBe(true);
  });

  it('keeps decimal rendering when the fraction is significant', () => {
    expect(isAmountValueIntegerOnly('42,992,564.61')).toBe(false);
    expect(isAmountValueIntegerOnly('0.00001')).toBe(false);
  });
});
