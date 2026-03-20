import { describe, expect, it, vi } from 'vitest';

import { formatConnectedAddress, isProviderConnected } from '@/lib/soraneo-wallet/src/components/Connection/utils';

describe('Connection utils', () => {
  describe('isProviderConnected', () => {
    it('returns false for missing provider', () => {
      expect(isProviderConnected(null)).toBe(false);
      expect(isProviderConnected(undefined)).toBe(false);
    });

    it('supports boolean and function connection states', () => {
      expect(isProviderConnected({ isConnected: true })).toBe(true);
      expect(
        isProviderConnected({
          isConnected() {
            return true;
          },
        })
      ).toBe(true);
    });

    it('returns false when provider getter throws', () => {
      const provider = {
        get isConnected() {
          throw new Error('boom');
        },
      };

      expect(isProviderConnected(provider)).toBe(false);
    });
  });

  describe('formatConnectedAddress', () => {
    it('falls back to raw address when formatter is missing', () => {
      expect(formatConnectedAddress({}, '5RawAddress')).toBe('5RawAddress');
    });

    it('uses formatter when available', () => {
      const formatter = vi.fn((value: string) => value.toLowerCase());

      expect(formatConnectedAddress({ formatAddress: formatter }, '5AbC')).toBe('5abc');
      expect(formatter).toHaveBeenCalledWith('5AbC', false);
    });

    it('falls back to raw address when formatter throws', () => {
      const formatter = vi.fn(() => {
        throw new Error('format failure');
      });

      expect(formatConnectedAddress({ formatAddress: formatter }, '5Fallback')).toBe('5Fallback');
    });
  });
});
