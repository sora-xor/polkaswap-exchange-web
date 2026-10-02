import { describe, expect, it } from 'vitest';
import { addCodec, codec, fromCodec, percent, subtractCodec, toCodec } from '@/features/bot-trading/amounts';

describe('bot token amounts', () => {
  it('preserves units beyond JS safe integer precision', () => {
    expect(toCodec('9007199254740993.000000000000000001', 18)).toBe('9007199254740993000000000000000001');
    expect(fromCodec('9007199254740993000000000000000001', 18)).toBe('9007199254740993.000000000000000001');
    expect(addCodec('9007199254740993', '1')).toBe('9007199254740994');
  });
  it.each(['1e3', '-1', 'NaN', '01', '1.001', 'Infinity', ' 1'])('rejects invalid or overprecise input %s', (value) => {
    expect(() => toCodec(value, 2)).toThrow();
  });
  it('refuses negative inventory and malformed persisted codec values', () => {
    expect(() => subtractCodec('1', '2')).toThrow('bots.errors.balance');
    expect(subtractCodec('2', '2')).toBe('0');
    expect(() => codec('1.2')).toThrow();
    expect(() => percent('101')).toThrow();
    expect(percent('0.5').toString()).toBe('0.5');
  });
  it('preserves the smallest unit of a 36-decimal asset', () => {
    expect(fromCodec('1', 36)).toBe('0.000000000000000000000000000000000001');
    expect(toCodec(fromCodec('1', 36), 36)).toBe('1');
  });
});
