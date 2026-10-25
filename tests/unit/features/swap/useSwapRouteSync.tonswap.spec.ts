import { XOR, DAI } from '@sora-substrate/sdk/build/assets/consts';
import { computed, effectScope, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSwapRouteSync } from '@/features/swap/composables/useSwapRouteSync';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  onTokensChange: undefined as
    | undefined
    | ((params: { firstAddress: string; secondAddress: string }, query: Record<string, string>) => Promise<void>),
  from: vi.fn(),
  to: vi.fn(),
  update: vi.fn(),
}));
const from = ref<AccountAsset | null>(null);
const to = ref<AccountAsset | null>(null);
vi.mock('@/stores/assets', () => ({ useAssetsStore: () => ({ assetDataByAddress: () => null }) }));
vi.mock('@/features/swap/composables/useSwapAmounts', () => ({
  useSwapAmounts: () => ({
    tokenFrom: from,
    tokenTo: to,
    setTokenFromAddress: mocks.from,
    setTokenToAddress: mocks.to,
  }),
}));
vi.mock('@/shared/navigation/useSelectedTokensRoute', () => ({
  useSelectedTokensRoute: (handler: typeof mocks.onTokensChange) => {
    mocks.onTokensChange = handler;
    return {
      route: {
        get query() {
          return mocks.query;
        },
      },
      firstRouteAddress: ref(''),
      secondRouteAddress: ref(''),
      isValidRoute: computed(() => true),
      parseCurrentRoute: vi.fn(),
      updateRouteAfterSelectTokens: mocks.update,
    };
  },
}));

describe('campaign swap initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = {};
    from.value = XOR as AccountAsset;
    to.value = DAI as AccountAsset;
    mocks.from.mockImplementation((address: string) => {
      from.value = address ? (XOR as AccountAsset) : null;
    });
    mocks.to.mockImplementation((address: string) => {
      to.value = address ? (XOR as AccountAsset) : null;
    });
  });

  it.each([{ campaign: 'tonswap', acquire: 'XOR' }, { acquire: 'XOR' }])(
    'overrides a stale cached swap for an explicit acquire-XOR journey %j',
    async (query) => {
      mocks.query = query;
      const scope = effectScope();
      const hook = scope.run(() =>
        useSwapRouteSync(async (callback) => {
          await callback();
        })
      )!;
      await hook.initializeSwapRouteState();
      expect(mocks.from).toHaveBeenCalledWith('');
      expect(mocks.to).toHaveBeenCalledWith(XOR.address);
      expect(mocks.update).not.toHaveBeenCalled();
      scope.stop();
    }
  );

  it('handles a new funding query while the swap is already mounted', async () => {
    const scope = effectScope();
    const hook = scope.run(() =>
      useSwapRouteSync(async (callback) => {
        await callback();
      })
    )!;
    await hook.initializeSwapRouteState();
    vi.clearAllMocks();
    await mocks.onTokensChange?.({ firstAddress: '', secondAddress: '' }, { campaign: 'tonswap', acquire: 'XOR' });
    expect(from.value).toBeNull();
    expect(to.value?.address).toBe(XOR.address);
    expect(mocks.update).not.toHaveBeenCalled();
    scope.stop();
  });

  it('preserves ordinary cached swaps when there is no explicit funding request', async () => {
    const scope = effectScope();
    const hook = scope.run(() =>
      useSwapRouteSync(async (callback) => {
        await callback();
      })
    )!;
    await hook.initializeSwapRouteState();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
    scope.stop();
  });
});
