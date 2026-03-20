import { v as useWalletStore, b3 as TokenBalanceSubscriptions, p as defineStore, b4 as DexId, Z as ZeroStringValue, b5 as nextTick, b6 as settingsStorage, ay as api, r as requireLegacyStore, b7 as MarketAlgorithmForLiquiditySource, b8 as MarketAlgorithms, b9 as LiquiditySourceTypes, ba as LiquiditySourceForMarketAlgorithm, X as XOR, H as useAssetsStore } from "./index-73GArslZ.js";
const useSwapBalanceSubscriptions = () => {
  const walletStore = useWalletStore();
  const manager = new TokenBalanceSubscriptions();
  const updateSubscription = (key, token, updateBalance) => {
    manager.remove(key);
    if (!walletStore.isLoggedIn || !token?.address) {
      return;
    }
    const accountAssets = walletStore.accountAssetsAddressTable ?? {};
    if (token.address in accountAssets) {
      return;
    }
    manager.add(key, { token, updateBalance });
  };
  const resetSubscriptions = () => {
    manager.resetSubscriptions();
  };
  const removeSubscription = (key) => {
    manager.remove(key);
  };
  return {
    updateSubscription,
    resetSubscriptions,
    removeSubscription
  };
};
let balanceSubscriptionApi = null;
const getBalanceSubscriptionApi = () => {
  if (!balanceSubscriptionApi) {
    balanceSubscriptionApi = useSwapBalanceSubscriptions();
  }
  return balanceSubscriptionApi;
};
const preservedResetKeys = /* @__PURE__ */ new Set(["tokenFromAddress", "tokenToAddress"]);
const resolveToken = (address) => {
  if (!address) return null;
  const assetsStore = useAssetsStore();
  return assetsStore.assetDataByAddress(address);
};
const applyBalance = (token, balance) => {
  if (!token) return null;
  if (!balance) return token;
  return { ...token, balance };
};
const resolveTokenWithBalance = (address, balance) => {
  const token = resolveToken(address);
  return applyBalance(token, balance);
};
const buildInitialState = () => {
  const allowLossPopup = settingsStorage.get("allowSwapLossPopup");
  return {
    tokenFromAddress: XOR.address,
    tokenToAddress: "",
    tokenFromBalance: null,
    tokenToBalance: null,
    tokenFromCache: resolveTokenWithBalance(XOR.address, null),
    tokenToCache: null,
    fromValue: "",
    toValue: "",
    amountWithoutImpact: "",
    liquidityProviderFee: "",
    isExchangeB: false,
    rewards: [],
    route: [],
    distribution: [],
    isAvailable: false,
    liquiditySources: [],
    swapQuote: null,
    selectedDexId: DexId.XOR,
    allowLossPopup: allowLossPopup ? Boolean(JSON.parse(allowLossPopup)) : true
  };
};
const useSwapStore = defineStore("swap", {
  state: () => buildInitialState(),
  getters: {
    tokenFrom: (state) => state.tokenFromCache,
    tokenTo: (state) => state.tokenToCache,
    marketAlgorithms(state) {
      const legacyStore = requireLegacyStore();
      const baseSources = legacyStore.getters.settings.debugEnabled ? state.liquiditySources : state.liquiditySources.filter((source) => source !== LiquiditySourceTypes.XYKPool);
      return Object.keys(LiquiditySourceForMarketAlgorithm).filter((entry) => {
        if (entry === MarketAlgorithms.SMART) return true;
        const liquiditySource = LiquiditySourceForMarketAlgorithm[entry];
        return baseSources.includes(liquiditySource);
      });
    },
    marketAlgorithmsAvailable() {
      return this.marketAlgorithms.length > 1;
    },
    swapLiquiditySource() {
      if (!this.marketAlgorithmsAvailable) return void 0;
      return requireLegacyStore().getters.settings.liquiditySource;
    },
    swapMarketAlgorithm() {
      const liquiditySource = this.swapLiquiditySource ?? "";
      return MarketAlgorithmForLiquiditySource[liquiditySource] ?? MarketAlgorithms.SMART;
    },
    price(state) {
      const tokenFrom = this.tokenFrom;
      const tokenTo = this.tokenTo;
      if (!(tokenFrom && tokenTo)) return ZeroStringValue;
      return api.divideAssets(tokenFrom, tokenTo, state.fromValue, state.toValue, false);
    },
    priceReversed(state) {
      const tokenFrom = this.tokenFrom;
      const tokenTo = this.tokenTo;
      if (!(tokenFrom && tokenTo)) return ZeroStringValue;
      return api.divideAssets(tokenFrom, tokenTo, state.fromValue, state.toValue, true);
    },
    priceImpact(state) {
      const tokenFrom = this.tokenFrom;
      const tokenTo = this.tokenTo;
      if (!(tokenFrom && tokenTo)) return ZeroStringValue;
      return api.swap.getPriceImpact(
        tokenFrom,
        tokenTo,
        state.fromValue,
        state.toValue,
        state.amountWithoutImpact,
        state.isExchangeB
      );
    },
    minMaxReceived(state) {
      const tokenFrom = this.tokenFrom;
      const tokenTo = this.tokenTo;
      if (!(tokenFrom && tokenTo)) return ZeroStringValue;
      return api.swap.getMinMaxValue(
        tokenFrom,
        tokenTo,
        state.fromValue,
        state.toValue,
        state.isExchangeB,
        requireLegacyStore().state.settings.slippageTolerance
      );
    }
  },
  actions: {
    updateTokenSubscription(direction) {
      const token = direction === "from" ? this.tokenFrom : this.tokenTo;
      const updateBalance = direction === "from" ? this.setTokenFromBalance : this.setTokenToBalance;
      getBalanceSubscriptionApi().updateSubscription(direction, token, updateBalance);
    },
    setTokenFromAddress(address) {
      this.tokenFromAddress = address ?? "";
      this.tokenFromCache = resolveTokenWithBalance(this.tokenFromAddress, this.tokenFromBalance);
      this.updateTokenSubscription("from");
    },
    setTokenToAddress(address) {
      this.tokenToAddress = address ?? "";
      this.tokenToCache = resolveTokenWithBalance(this.tokenToAddress, this.tokenToBalance);
      this.updateTokenSubscription("to");
    },
    setTokenFromBalance(balance) {
      this.tokenFromBalance = balance;
      this.tokenFromCache = resolveTokenWithBalance(this.tokenFromAddress, this.tokenFromBalance);
    },
    setTokenToBalance(balance) {
      this.tokenToBalance = balance;
      this.tokenToCache = resolveTokenWithBalance(this.tokenToAddress, this.tokenToBalance);
    },
    setFromValue(value) {
      this.fromValue = value;
    },
    setToValue(value) {
      this.toValue = value;
    },
    setAmountWithoutImpact(amount = ZeroStringValue) {
      this.amountWithoutImpact = amount;
    },
    setExchangeB(flag) {
      this.isExchangeB = flag;
    },
    setLiquidityProviderFee(value = ZeroStringValue) {
      this.liquidityProviderFee = value;
    },
    setRewards(rewards = []) {
      this.rewards = Object.freeze([...rewards]);
    },
    setRoute(route = []) {
      this.route = Object.freeze([...route]);
    },
    setDistribution(distribution = []) {
      this.distribution = Object.freeze([...distribution]);
    },
    setSubscriptionPayload(payload) {
      const { quote = null, isAvailable = false, liquiditySources = [] } = payload ?? {};
      this.swapQuote = quote;
      this.isAvailable = isAvailable;
      this.liquiditySources = liquiditySources;
    },
    setLiquiditySource(liquiditySource) {
      this.liquiditySources = [liquiditySource];
    },
    selectDexId(dexId = DexId.XOR) {
      this.selectedDexId = dexId;
    },
    setAllowLossPopup(flag) {
      this.allowLossPopup = flag;
      settingsStorage.set("allowSwapLossPopup", flag);
    },
    async switchTokens() {
      const { tokenFromAddress, tokenToAddress, fromValue, toValue, isExchangeB } = this;
      if (!(tokenFromAddress && tokenToAddress)) return;
      const [nextFromValue, nextToValue] = isExchangeB ? [toValue, ""] : ["", fromValue];
      const nextFromCache = resolveTokenWithBalance(tokenToAddress, this.tokenToBalance);
      const nextToCache = resolveTokenWithBalance(tokenFromAddress, this.tokenFromBalance);
      this.setTokenFromAddress(tokenToAddress);
      this.setTokenToAddress(tokenFromAddress);
      this.setFromValue(nextFromValue);
      this.setToValue(nextToValue);
      this.setExchangeB(!isExchangeB);
      this.tokenFromCache = nextFromCache;
      this.tokenToCache = nextToCache;
      await this.updateSubscriptions();
      await nextTick();
      this.tokenFromCache = resolveTokenWithBalance(this.tokenFromAddress, this.tokenFromBalance);
      this.tokenToCache = resolveTokenWithBalance(this.tokenToAddress, this.tokenToBalance);
    },
    async updateSubscriptions() {
      await Promise.all([
        Promise.resolve(this.updateTokenSubscription("from")),
        Promise.resolve(this.updateTokenSubscription("to"))
      ]);
    },
    resetSubscriptions() {
      const manager = getBalanceSubscriptionApi();
      manager.removeSubscription("from");
      manager.removeSubscription("to");
    },
    reset() {
      this.resetSubscriptions();
      const next = buildInitialState();
      Object.keys(next).forEach((key) => {
        if (preservedResetKeys.has(key)) return;
        this[key] = next[key];
      });
    }
  }
});
export {
  useSwapStore as u
};
