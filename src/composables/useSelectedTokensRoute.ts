import { XSTUSD, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { WALLET_TYPES, api } from '@wallet';
import { computed, ref } from 'vue';
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';

import { PageNames } from '@/consts';
import store from '@/store';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const MAX_SYMBOL_LENGTH = 7;

type TokensChangeHandler = (params: { firstAddress: string; secondAddress: string }) => Promise<void> | void;

type Params = { first?: string; second?: string };

const resolveRouteAddress = (
  param: Nullable<string>,
  assetsDataTable: WALLET_TYPES.AssetsTable,
  whitelistIdsBySymbol: WALLET_TYPES.WhitelistIdsBySymbol
): string => {
  if (!param) return '';

  if (param.length > MAX_SYMBOL_LENGTH) {
    return assetsDataTable[param] ? param : '';
  }

  return whitelistIdsBySymbol[param.toUpperCase()] ?? '';
};

const routeIsValid = (params: Params, routeName: string, firstAddress: string, secondAddress: string): boolean => {
  const { first = '', second = '' } = params;

  if (!(first || second)) return true;
  if (first === second || firstAddress === secondAddress) return false;

  const bothArePresented = !!(firstAddress && secondAddress);

  switch (routeName) {
    case PageNames.OrderBook:
      return bothArePresented && secondAddress === XOR.address;
    case PageNames.AddLiquidity: {
      if (!(bothArePresented && api.dex.baseAssetsIds.includes(firstAddress))) {
        return false;
      }
      if (firstAddress === XSTUSD.address && secondAddress === XOR.address) {
        return false;
      }
      return true;
    }
    default:
      return bothArePresented;
  }
};

const buildRouteTokens = (token: Nullable<AccountAsset | Asset>, whitelist: WALLET_TYPES.Whitelist): string => {
  if (!token) return '';
  return whitelist[token.address] ? token.symbol : token.address;
};

/**
 * Handles token pair routing logic shared between Swap and liquidity screens.
 */
export function useSelectedTokensRoute(onTokensChange: TokensChangeHandler) {
  const route = useRoute();
  const router = useRouter();

  const whitelist = computed(() => store.getters.wallet.account.whitelist as WALLET_TYPES.Whitelist);
  const whitelistIdsBySymbol = computed(
    () => store.getters.wallet.account.whitelistIdsBySymbol as WALLET_TYPES.WhitelistIdsBySymbol
  );
  const assetsDataTable = computed(() => store.getters.wallet.account.assetsDataTable as WALLET_TYPES.AssetsTable);

  const wasRedirected = ref(false);

  const firstRouteAddress = computed(() =>
    resolveRouteAddress(route.params.first as string | undefined, assetsDataTable.value, whitelistIdsBySymbol.value)
  );
  const secondRouteAddress = computed(() =>
    resolveRouteAddress(route.params.second as string | undefined, assetsDataTable.value, whitelistIdsBySymbol.value)
  );

  const isValidRoute = computed(() =>
    routeIsValid(
      { first: route.params.first as string | undefined, second: route.params.second as string | undefined },
      (route.name as string) ?? '',
      firstRouteAddress.value,
      secondRouteAddress.value
    )
  );

  const parseCurrentRoute = (params?: { isValidRoute: boolean; name: string }) => {
    const valid = params ? params.isValidRoute : isValidRoute.value;
    const targetName = params ? params.name : ((route.name as string) ?? '');

    if (!valid) {
      wasRedirected.value = true;

      if (route.params) {
        router.replace({ name: targetName, params: undefined });
      }

      return false;
    }

    return true;
  };

  const updateRouteAfterSelectTokens = (
    firstToken?: Nullable<AccountAsset | Asset>,
    secondToken?: Nullable<AccountAsset | Asset>
  ) => {
    if (!(firstToken && secondToken)) return;

    const first = buildRouteTokens(firstToken, whitelist.value);
    const second = buildRouteTokens(secondToken, whitelist.value);

    if (route.params.first === first && route.params.second === second) return;

    wasRedirected.value = true;
    router.replace({ name: route.name as string, params: { first, second } });
  };

  onBeforeRouteUpdate(async (to, from, next) => {
    if (wasRedirected.value) {
      wasRedirected.value = false;
      next();
      return;
    }

    const params = { first: to.params.first as string | undefined, second: to.params.second as string | undefined };
    const firstAddress = resolveRouteAddress(params.first, assetsDataTable.value, whitelistIdsBySymbol.value);
    const secondAddress = resolveRouteAddress(params.second, assetsDataTable.value, whitelistIdsBySymbol.value);

    const valid = routeIsValid(params, (to.name as string) ?? '', firstAddress, secondAddress);

    const validState = parseCurrentRoute({
      isValidRoute: valid,
      name: (to.name as string) ?? '',
    });

    if (!validState) return;

    await onTokensChange({ firstAddress, secondAddress });
    next();
  });

  return {
    route,
    router,
    firstRouteAddress,
    secondRouteAddress,
    isValidRoute,
    parseCurrentRoute,
    updateRouteAfterSelectTokens,
    onTokensChange,
  };
}

export type SelectedTokensRouteComposable = ReturnType<typeof useSelectedTokensRoute>;
