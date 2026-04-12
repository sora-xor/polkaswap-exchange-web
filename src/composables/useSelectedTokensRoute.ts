import { DAI, KUSD, XSTUSD, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/shims/wallet-api';
import { computed, ref } from 'vue';
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import routeWhitelistBySymbol from '@/consts/routeWhitelistBySymbol.json';

import type { AssetsTable, WhitelistIdsBySymbol } from '@/shims/wallet-common-types';
import { PageNames } from '@/consts';
import { useWalletStore } from '@/stores/wallet';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const MAX_SYMBOL_LENGTH = 7;
const CORE_ROUTE_SYMBOLS: Record<string, string> = {
  [XOR.address]: XOR.symbol,
  [DAI.address]: DAI.symbol,
  [KUSD.address]: KUSD.symbol,
  [XSTUSD.address]: XSTUSD.symbol,
};
const CORE_ROUTE_ADDRESSES_BY_SYMBOL: Record<string, string> = {
  [XOR.symbol]: XOR.address,
  [DAI.symbol]: DAI.address,
  [KUSD.symbol]: KUSD.address,
  [XSTUSD.symbol]: XSTUSD.address,
};
const BUNDLED_ROUTE_ADDRESSES_BY_SYMBOL = Object.freeze(routeWhitelistBySymbol as Record<string, string>);

type TokensChangeHandler = (params: { firstAddress: string; secondAddress: string }) => Promise<void> | void;

type Params = { first?: string; second?: string };

const resolveAddressBySymbolFromAssetsTable = (symbol: string, assetsDataTable: Nullable<AssetsTable>): string => {
  if (!assetsDataTable) return '';

  const normalized = symbol.toUpperCase();
  let matchedAddress = '';

  for (const asset of Object.values(assetsDataTable)) {
    if (!asset?.address) continue;
    if ((asset.symbol ?? '').toUpperCase() !== normalized) continue;

    if (!matchedAddress) {
      matchedAddress = asset.address;
      continue;
    }

    // Ambiguous symbol, do not guess.
    return '';
  }

  return matchedAddress;
};

export const resolveRouteAddress = (
  param: Nullable<string>,
  assetsDataTable: Nullable<AssetsTable>,
  whitelistIdsBySymbol: Nullable<WhitelistIdsBySymbol>
): string => {
  if (!param) return '';

  const assetsTable = assetsDataTable ?? {};
  const whitelistBySymbol = whitelistIdsBySymbol ?? {};

  if (param.length > MAX_SYMBOL_LENGTH) {
    return assetsTable[param] ? param : '';
  }

  const normalized = param.toUpperCase();
  const whitelistMatch = whitelistBySymbol[normalized];

  if (whitelistMatch) return whitelistMatch;

  const coreMatch = CORE_ROUTE_ADDRESSES_BY_SYMBOL[normalized];

  if (coreMatch) return coreMatch;

  const bundledMatch = BUNDLED_ROUTE_ADDRESSES_BY_SYMBOL[normalized];

  if (bundledMatch) return bundledMatch;

  return resolveAddressBySymbolFromAssetsTable(normalized, assetsDataTable) || '';
};

export const routeIsValid = (
  params: Params,
  routeName: string,
  firstAddress: string,
  secondAddress: string
): boolean => {
  const { first = '', second = '' } = params;

  if (!(first || second)) return true;
  if (first === second || firstAddress === secondAddress) return false;

  const bothArePresented = !!(firstAddress && secondAddress);

  switch (routeName) {
    case PageNames.OrderBook:
      return bothArePresented;
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

export const buildRouteTokens = (
  token: Nullable<AccountAsset | Asset>,
  whitelistIdsBySymbol: Nullable<WhitelistIdsBySymbol>
): string => {
  if (!token) return '';

  const symbol = token.symbol?.trim() ?? '';
  const normalizedSymbol = symbol.toUpperCase();
  const symbolAddress = whitelistIdsBySymbol?.[normalizedSymbol] || BUNDLED_ROUTE_ADDRESSES_BY_SYMBOL[normalizedSymbol];
  const canUseSymbol = Boolean(symbol && symbolAddress && symbolAddress === token.address);

  if (CORE_ROUTE_SYMBOLS[token.address]) {
    return CORE_ROUTE_SYMBOLS[token.address];
  }

  return canUseSymbol ? symbol : token.address;
};

/**
 * Handles token pair routing logic shared between Swap and liquidity screens.
 */
export function useSelectedTokensRoute(onTokensChange: TokensChangeHandler) {
  const route = useRoute();
  const router = useRouter();
  const walletStore = useWalletStore();

  const whitelistIdsBySymbol = computed(
    () => (walletStore.whitelistIdsBySymbol as Nullable<WhitelistIdsBySymbol>) ?? {}
  );
  const assetsDataTable = computed(() => {
    const table = (walletStore.assetsDataTable as Nullable<AssetsTable>) ?? {};
    if (Object.keys(table).length) return table;

    return (walletStore.assets ?? []).reduce<AssetsTable>((buffer, asset) => {
      if (asset?.address) {
        buffer[asset.address] = asset as AssetsTable[string];
      }

      return buffer;
    }, {});
  });

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

    const first = buildRouteTokens(firstToken, whitelistIdsBySymbol.value);
    const second = buildRouteTokens(secondToken, whitelistIdsBySymbol.value);

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
