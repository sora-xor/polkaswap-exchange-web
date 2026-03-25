import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getInfo = vi.hoisted(() => vi.fn(() => ({ address: '0xpool' })));

vi.mock('@/shims/wallet-api', () => ({
  api: {
    poolXyk: {
      getInfo,
    },
  },
  connection: {},
}));

vi.mock('@/utils/walletCore', () => ({
  loadWalletCore: vi.fn(async () => ({
    api: {
      poolXyk: {
        getInfo,
      },
    },
  })),
}));

vi.mock('@/stores/pool', () => ({
  usePoolStore: () => ({
    poolApyObject: {
      '0xpool': '0.12',
    },
  }),
}));

import { usePoolApy } from '@/modules/pool/composables/usePoolApy';

describe('usePoolApy', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    getInfo.mockClear();
  });

  it('returns APY value when pool info is available', () => {
    const { getPoolApy } = usePoolApy();

    expect(getPoolApy('base', 'target')).toBe('0.12');
    expect(getInfo).toHaveBeenCalledWith('base', 'target');
  });

  it('returns null when pool info is missing', () => {
    getInfo.mockReturnValueOnce(undefined);

    const { getPoolApy } = usePoolApy();

    expect(getPoolApy('base', 'target')).toBeNull();
  });

  it('formats APY into percentage string', () => {
    const { getPoolApyFormatted } = usePoolApy();

    expect(getPoolApyFormatted('base', 'target')).toMatch(/%$/);
  });
});
