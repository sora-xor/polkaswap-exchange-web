import { computed, ref, watch } from 'vue';

import { useAssetsStore } from '@/stores/assets';
import { useSelectedTokensRoute } from '@/shared/navigation/useSelectedTokensRoute';

import { useSwapAmounts } from './useSwapAmounts';
import { isSwapBackNavigationFromOrderBook, resolveHistoryBackLocation } from '../services/navigationHistory';
import { normalizeSwapRouteTokens } from '../services/normalizeSwapRouteTokens';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

type WithApi = (callback: () => Promise<void> | void) => Promise<void>;

/**
 * Keeps the swap feature route contract in sync with selected assets while the
 * screen migrates away from the legacy view boundary.
 */
export function useSwapRouteSync(withApi: WithApi) {
  const assetsStore = useAssetsStore();
  const { tokenFrom, tokenTo, setTokenFromAddress, setTokenToAddress } = useSwapAmounts();
  const isRouteWriteReady = ref(false);

  const syncSwapRoutePair = async (firstAddress = '', secondAddress = ''): Promise<void> => {
    const normalizedPair = normalizeSwapRouteTokens(firstAddress, secondAddress);
    const hasResolvedRoutePair =
      tokenFrom.value?.address === normalizedPair.firstAddress && tokenTo.value?.address === normalizedPair.secondAddress;
    const hasResolvedDefaultPair =
      !normalizedPair.secondAddress && tokenFrom.value?.address === normalizedPair.firstAddress && !tokenTo.value;

    if (hasResolvedRoutePair || hasResolvedDefaultPair) return;

    await setTokenFromAddress(normalizedPair.firstAddress);
    await setTokenToAddress(normalizedPair.secondAddress);
  };

  const { firstRouteAddress, secondRouteAddress, isValidRoute, parseCurrentRoute, updateRouteAfterSelectTokens } =
    useSelectedTokensRoute(async ({ firstAddress, secondAddress }) => {
      await syncSwapRoutePair(firstAddress, secondAddress);
    });

  const routeTokenFrom = computed(() =>
    firstRouteAddress.value ? (assetsStore.assetDataByAddress(firstRouteAddress.value) as Nullable<AccountAsset>) : null
  );
  const routeTokenTo = computed(() =>
    secondRouteAddress.value ? (assetsStore.assetDataByAddress(secondRouteAddress.value) as Nullable<AccountAsset>) : null
  );

  watch([tokenFrom, tokenTo], ([from, to]) => {
    if (!isRouteWriteReady.value) return;
    if (from && to) {
      updateRouteAfterSelectTokens(from as AccountAsset, to as AccountAsset);
    }
  });

  watch(
    [isValidRoute, firstRouteAddress, secondRouteAddress, routeTokenFrom, routeTokenTo],
    async ([valid, first, second, from, to]) => {
      if (!valid || !(first && second) || !(from && to)) return;

      await syncSwapRoutePair(first, second);
    }
  );

  const initializeSwapRouteState = async (): Promise<void> => {
    try {
      await withApi(async () => {
        parseCurrentRoute();
        const navigatedFromOrderBook = isSwapBackNavigationFromOrderBook(resolveHistoryBackLocation());

        if (tokenFrom.value && tokenTo.value && !navigatedFromOrderBook) {
          updateRouteAfterSelectTokens(tokenFrom.value as AccountAsset, tokenTo.value as AccountAsset);
        } else if (isValidRoute.value && firstRouteAddress.value && secondRouteAddress.value) {
          await syncSwapRoutePair(firstRouteAddress.value, secondRouteAddress.value);
        } else if (!tokenFrom.value) {
          const normalizedPair = normalizeSwapRouteTokens();
          await setTokenFromAddress(normalizedPair.firstAddress);
          await setTokenToAddress(normalizedPair.secondAddress);
        }
      });
    } finally {
      isRouteWriteReady.value = true;
    }
  };

  return {
    tokenFrom,
    tokenTo,
    initializeSwapRouteState,
  };
}
