import { at as useRoute, au as useRouter, v as useWalletStore, av as onBeforeRouteUpdate, a9 as ref, h as computed, aw as KUSD, ax as DAI, V as PageNames, ay as api, az as XSTUSD, X as XOR } from "./index-73GArslZ.js";
const MAX_SYMBOL_LENGTH = 7;
const CORE_ROUTE_SYMBOLS = {
  [DAI.address]: DAI.symbol,
  [KUSD.address]: KUSD.symbol
};
const CORE_ROUTE_ADDRESSES_BY_SYMBOL = {
  [DAI.symbol]: DAI.address,
  [KUSD.symbol]: KUSD.address
};
const resolveAddressBySymbolFromAssetsTable = (symbol, assetsDataTable) => {
  if (!assetsDataTable) return "";
  const normalized = symbol.toUpperCase();
  let matchedAddress = "";
  for (const asset of Object.values(assetsDataTable)) {
    if (!asset?.address) continue;
    if ((asset.symbol ?? "").toUpperCase() !== normalized) continue;
    if (!matchedAddress) {
      matchedAddress = asset.address;
      continue;
    }
    return "";
  }
  return matchedAddress;
};
const resolveRouteAddress = (param, assetsDataTable, whitelistIdsBySymbol) => {
  if (!param) return "";
  const assetsTable = assetsDataTable ?? {};
  const whitelistBySymbol = whitelistIdsBySymbol ?? {};
  if (param.length > MAX_SYMBOL_LENGTH) {
    return assetsTable[param] ? param : "";
  }
  const normalized = param.toUpperCase();
  const whitelistMatch = whitelistBySymbol[normalized];
  if (whitelistMatch) return whitelistMatch;
  const coreMatch = CORE_ROUTE_ADDRESSES_BY_SYMBOL[normalized];
  if (coreMatch) return coreMatch;
  return resolveAddressBySymbolFromAssetsTable(normalized, assetsDataTable) || "";
};
const routeIsValid = (params, routeName, firstAddress, secondAddress) => {
  const { first = "", second = "" } = params;
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
const buildRouteTokens = (token, whitelistIdsBySymbol) => {
  if (!token) return "";
  const symbol = token.symbol?.trim() ?? "";
  const normalizedSymbol = symbol.toUpperCase();
  const symbolAddress = whitelistIdsBySymbol?.[normalizedSymbol];
  const canUseSymbol = Boolean(symbol && symbolAddress && symbolAddress === token.address);
  if (CORE_ROUTE_SYMBOLS[token.address]) {
    return CORE_ROUTE_SYMBOLS[token.address];
  }
  return canUseSymbol ? symbol : token.address;
};
function useSelectedTokensRoute(onTokensChange) {
  const route = useRoute();
  const router = useRouter();
  const walletStore = useWalletStore();
  const whitelistIdsBySymbol = computed(
    () => walletStore.whitelistIdsBySymbol ?? {}
  );
  const assetsDataTable = computed(() => {
    const table = walletStore.assetsDataTable ?? {};
    if (Object.keys(table).length) return table;
    return (walletStore.assets ?? []).reduce((buffer, asset) => {
      if (asset?.address) {
        buffer[asset.address] = asset;
      }
      return buffer;
    }, {});
  });
  const wasRedirected = ref(false);
  const firstRouteAddress = computed(
    () => resolveRouteAddress(route.params.first, assetsDataTable.value, whitelistIdsBySymbol.value)
  );
  const secondRouteAddress = computed(
    () => resolveRouteAddress(route.params.second, assetsDataTable.value, whitelistIdsBySymbol.value)
  );
  const isValidRoute = computed(
    () => routeIsValid(
      { first: route.params.first, second: route.params.second },
      route.name ?? "",
      firstRouteAddress.value,
      secondRouteAddress.value
    )
  );
  const parseCurrentRoute = (params) => {
    const valid = params ? params.isValidRoute : isValidRoute.value;
    const targetName = params ? params.name : route.name ?? "";
    if (!valid) {
      wasRedirected.value = true;
      if (route.params) {
        router.replace({ name: targetName, params: void 0 });
      }
      return false;
    }
    return true;
  };
  const updateRouteAfterSelectTokens = (firstToken, secondToken) => {
    if (!(firstToken && secondToken)) return;
    const first = buildRouteTokens(firstToken, whitelistIdsBySymbol.value);
    const second = buildRouteTokens(secondToken, whitelistIdsBySymbol.value);
    if (route.params.first === first && route.params.second === second) return;
    wasRedirected.value = true;
    router.replace({ name: route.name, params: { first, second } });
  };
  onBeforeRouteUpdate(async (to, from, next) => {
    if (wasRedirected.value) {
      wasRedirected.value = false;
      next();
      return;
    }
    const params = { first: to.params.first, second: to.params.second };
    const firstAddress = resolveRouteAddress(params.first, assetsDataTable.value, whitelistIdsBySymbol.value);
    const secondAddress = resolveRouteAddress(params.second, assetsDataTable.value, whitelistIdsBySymbol.value);
    const valid = routeIsValid(params, to.name ?? "", firstAddress, secondAddress);
    const validState = parseCurrentRoute({
      isValidRoute: valid,
      name: to.name ?? ""
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
    onTokensChange
  };
}
export {
  useSelectedTokensRoute as u
};
