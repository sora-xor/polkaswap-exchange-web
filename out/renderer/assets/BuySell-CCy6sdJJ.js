import { z as defineComponent, ak as lazyComponent, aZ as components, P as useRouterStore, H as useAssetsStore, u as useTranslation, G as useInternalConnect, c2 as useTransaction, e as useSettingsStore, aA as watch, a4 as onMounted, h as computed, V as PageNames, a9 as ref, aB as onBeforeUnmount, b9 as LiquiditySourceTypes, b4 as DexId, a7 as PriceVariant, a8 as LimitOrderType, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, D as createBaseVNode, am as createBlock, aM as createCommentVNode, ao as withCtx, aN as toDisplayString, aj as unref, ar as isRef, g as getAssetBalance, bb as normalizeClass, bQ as Fragment, aO as createTextVNode, al as Components, $ as getCurrentInstance, ay as api, F as FPNumber, ad as asZeroValue, aa as OrderBookStatus, aE as delay, M as getMaxValue, de as getBookDecimals, df as MAX_ORDERS_PER_SIDE, dg as MAX_ORDERS_PER_USER, aS as hasInsufficientXorForFee, cv as hasInsufficientBalance, cu as isMaxButtonAvailable, O as Operation, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useConfirmDialog } from "./useConfirmDialog-CVL8UdZp.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import { u as useOrderBookUserOrders } from "./useOrderBookUserOrders-B0IscmbH.js";
import { u as useOrderBookManagement } from "./useOrderBookManagement-DQ_IdVc7.js";
import { u as useSwapAmounts } from "./useSwapAmounts-COuMA7gl.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
import "./index-BDxnS5Vu.js";
const _hoisted_1 = { class: "order-book order-books" };
const _hoisted_2 = { class: "order-book-choose-pair" };
const _hoisted_3 = { class: "order-book-choose-btn" };
const _hoisted_4 = { class: "order-book-pair-name" };
const _hoisted_5 = { key: 0 };
const _hoisted_6 = { class: "order-book-pair-data" };
const _hoisted_7 = { class: "order-book-pair-data-item" };
const _hoisted_8 = { class: "order-book-pair-data-item__value order-book-fiat" };
const _hoisted_9 = { class: "order-book-pair-data-item" };
const _hoisted_10 = { class: "order-book-pair-data-item__value" };
const _hoisted_11 = { class: "order-book-pair-data-item" };
const _hoisted_12 = { class: "order-book-pair-data-item__value" };
const _hoisted_13 = { slot: "label" };
const _hoisted_14 = { slot: "label" };
const _hoisted_15 = { class: "order-book-total" };
const _hoisted_16 = {
  key: 0,
  class: "book-validation"
};
const _hoisted_17 = { class: "book-validation__disclaimer" };
const _hoisted_18 = { class: "book-validation__disclaimer-header" };
const _hoisted_19 = { class: "book-validation__disclaimer-paragraph" };
const _hoisted_20 = { class: "book-validation__disclaimer-warning icon" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      FormattedAmount: components.FormattedAmount,
      InfoLine: components.InfoLine,
      TokenInput: lazyComponent(Components.TokenInput),
      PairTokenLogo: lazyComponent(Components.PairTokenLogo),
      PairListPopover: lazyComponent(Components.PairListPopover),
      PlaceConfirm: lazyComponent(Components.PlaceOrder),
      PlaceTransactionDetails: lazyComponent(Components.PlaceTransactionDetails),
      PriceChange: lazyComponent(Components.PriceChange),
      Error: lazyComponent(Components.ErrorButton)
    }
  },
  __name: "BuySell",
  setup(__props) {
    const {
      tokenFrom,
      tokenTo,
      fromValue,
      toValue,
      areTokensSelected: swapTokensSelected,
      setTokenFromAddress,
      setTokenToAddress,
      setFromValue,
      setToValue
    } = useSwapAmounts();
    const swapStore = useSwapStore();
    const routerStore = useRouterStore();
    const assetsStore = useAssetsStore();
    const { t } = useTranslation();
    const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();
    const { isLoggedIn, connectSoraWallet } = useInternalConnect();
    const { getFPNumber, getFPNumberFromCodec, formatCodecNumber, formatStringValue, getStringFromCodec } = useFormattedAmount();
    const { withNotifications } = useTransaction();
    const {
      baseAsset,
      quoteAsset,
      asks,
      bids,
      dexId,
      baseValue,
      quoteValue,
      limitOrderType,
      side,
      amountSliderValue,
      baseAssetAddress,
      currentOrderBook,
      orderBookStats
    } = useOrderBook();
    const { userLimitOrders } = useOrderBookUserOrders();
    const { updateBalanceSubscription, updateOrderBooksStats } = useOrderBookManagement();
    const vm = getCurrentInstance();
    const prevRoute = computed(() => routerStore.prev);
    const settingsStore = useSettingsStore();
    const networkFees = computed(() => settingsStore.networkFees);
    const slippageTolerance = computed(() => settingsStore.slippageTolerance);
    const xor = computed(() => assetsStore.xor);
    const visibleBookList = ref(false);
    const limitForSinglePriceReached = ref(false);
    const quoteSubscription = ref(null);
    const marketQuotePrice = ref("");
    const reason = ref("");
    const reading = ref("");
    const prevSwapFromAddress = ref("");
    const prevSwapToAddress = ref("");
    const networkFee = computed(() => networkFees.value[Operation.OrderBookPlaceLimitOrder]);
    const isSliderAvailable = computed(() => {
      const asset = baseAsset.value;
      if (!asset) return false;
      const availableBalance = getMaxValue(asset, networkFee.value);
      return new FPNumber(availableBalance).gt(FPNumber.ZERO);
    });
    const isMarketType = computed(() => limitOrderType.value === LimitOrderType.market);
    const isBalanceLessThanStepSize = computed(() => {
      const orderBook = currentOrderBook.value;
      if (!orderBook) return false;
      const availableBalance = getMaxValue(baseAsset.value, networkFee.value);
      if (!amountPrecision.value && baseValue.value === "0" && !isBuySide.value) {
        return new FPNumber(availableBalance).lt(orderBook.stepLotSize);
      }
      return false;
    });
    const hasExplainableError = computed(() => Boolean(reason.value && reading.value));
    const formattedAmountAtPrice = computed(() => {
      if (!(baseValue.value && quoteValue.value)) return "";
      return t("orderBook.tradingPair.total", {
        amount: formatStringValue(baseValue.value),
        symbol: baseSymbol.value,
        amount2: formatStringValue(quoteValue.value || marketQuotePrice.value),
        symbol2: quoteSymbol.value
      });
    });
    const formattedTotal = computed(() => getFPNumber(baseValue.value).mul(getFPNumber(quoteValue.value)).toLocaleString());
    const shouldErrorTooltipBeShown = computed(() => isLoggedIn.value && hasExplainableError.value);
    const isLimitOrder = computed(() => limitOrderType.value === LimitOrderType.limit);
    const isPlaceAndCancelMode = computed(() => orderBookStatus.value === OrderBookStatus.PlaceAndCancel);
    const setError = ({ reason: nextReason, reading: nextReading }) => {
      reason.value = nextReason;
      reading.value = nextReading;
    };
    const amountPrecision = computed(() => {
      const orderBook = currentOrderBook.value;
      if (!orderBook) return 0;
      return orderBook.stepLotSize.decimals;
    });
    const bookPrecision = computed(() => {
      const orderBook = currentOrderBook.value;
      if (!orderBook) return 0;
      return getBookDecimals(orderBook);
    });
    const baseSymbol = computed(() => baseAsset.value?.symbol ?? "");
    const quoteSymbol = computed(() => quoteAsset.value?.symbol ?? "");
    const orderBookStatus = computed(() => currentOrderBook.value?.status ?? OrderBookStatus.Stop);
    const bookStopped = computed(
      () => ![OrderBookStatus.Trade, OrderBookStatus.PlaceAndCancel].includes(orderBookStatus.value)
    );
    const isBuySide = computed(() => side.value === PriceVariant.Buy);
    const maxPossibleAmount = computed(() => {
      const orderBook = currentOrderBook.value;
      if (!orderBook) return FPNumber.ZERO;
      const max = getMaxValue(baseAsset.value, networkFee.value);
      const maxLotSize = orderBook.maxLotSize;
      const maxPossible = FPNumber.fromNatural(max, amountPrecision.value);
      if (isBuySide.value) return maxLotSize;
      return FPNumber.lte(maxPossible, maxLotSize) ? maxPossible : maxLotSize;
    });
    const userReachedSpotLimit = computed(() => {
      if (isMarketType.value) return false;
      const bookSide = isBuySide.value ? bids.value : asks.value;
      if (bookSide.length >= MAX_ORDERS_PER_SIDE && quoteValue.value) {
        if (isPriceUnique(quoteValue.value)) return true;
        if (limitForSinglePriceReached.value) return true;
      }
      return false;
    });
    const userReachedOwnLimit = computed(() => {
      if (isMarketType.value) return false;
      return userLimitOrders.value?.length === MAX_ORDERS_PER_USER;
    });
    const preparedForSwap = computed(() => isLoggedIn.value && swapTokensSelected.value);
    const isInsufficientXorForFee = computed(() => hasInsufficientXorForFee(xor.value, networkFee.value));
    const isInsufficientBalance = computed(() => {
      const token = tokenFrom.value;
      if (!token) return false;
      let value = "";
      if (isBuySide.value) {
        const quoteFP = new FPNumber(quoteValue.value || "0");
        const baseFP = new FPNumber(baseValue.value || "0");
        value = quoteFP.mul(baseFP).toString();
      } else {
        value = baseValue.value;
      }
      return preparedForSwap.value && hasInsufficientBalance(token, value, networkFee.value);
    });
    const isZeroAmount = computed(() => asZeroValue(baseValue.value));
    const isZeroPrice = computed(() => asZeroValue(quoteValue.value));
    const hasZeroAmount = computed(() => isZeroAmount.value || isZeroPrice.value);
    const orderBookPrice = computed(() => {
      const price = orderBookStats.value?.price ?? FPNumber.ZERO;
      const decimals = getBookDecimals(currentOrderBook.value);
      return price.dp(decimals).toLocaleString();
    });
    const orderBookPriceChange = computed(() => orderBookStats.value?.priceChange ?? FPNumber.ZERO);
    const orderBookVolume = computed(() => (orderBookStats.value?.volume ?? FPNumber.ZERO).toLocaleString());
    const marketOptionDisabled = computed(() => orderBookStatus.value === OrderBookStatus.PlaceAndCancel);
    const priceExceedsSpread = computed(() => {
      if (!quoteValue.value) return false;
      if (isBuySide.value) {
        const bestAsk = asks.value[asks.value.length - 1]?.[0];
        if (!bestAsk) return false;
        const price2 = new FPNumber(quoteValue.value);
        return FPNumber.gte(price2, bestAsk);
      }
      const bestBid = bids.value[0]?.[0];
      if (!bestBid) return false;
      const price = new FPNumber(quoteValue.value);
      return FPNumber.lte(price, bestBid);
    });
    const setLiquiditySource = (source) => swapStore.setLiquiditySource(source);
    const selectSwapDexId = (dex) => swapStore.selectDexId(dex);
    const resetTokenToAddress = () => setTokenToAddress("");
    const orderBookTokensSelected = computed(() => Boolean(baseAsset.value && quoteAsset.value));
    const areTokensSelected = orderBookTokensSelected;
    const isPriceBeyondPrecision = computed(() => {
      const orderBook = currentOrderBook.value;
      if (!orderBook || !quoteValue.value) return false;
      const tickSize = orderBook.tickSize;
      const price = new FPNumber(quoteValue.value);
      return price.isZeroMod(tickSize);
    });
    const isOutOfAmountBounds = computed(() => {
      const orderBook = currentOrderBook.value;
      if (!orderBook) return false;
      const { maxLotSize, minLotSize, stepLotSize } = orderBook;
      const amountFP = new FPNumber(baseValue.value || "0");
      return !(FPNumber.lte(amountFP, maxLotSize) && FPNumber.gte(amountFP, minLotSize) && amountFP.isZeroMod(stepLotSize));
    });
    const computedBtnClass = computed(() => {
      if (!isLoggedIn.value) return "";
      return isBuySide.value ? "buy-btn" : "";
    });
    const isPriceInputDisabled = computed(() => isMarketType.value);
    const icon = computed(
      () => visibleBookList.value ? "arrows-circle-chevron-top-24" : "arrows-circle-chevron-bottom-24"
    );
    const getTokenBalance = (token) => getAssetBalance(token);
    const getPercent = (value) => {
      if (!value) return 0;
      return new FPNumber(value).div(maxPossibleAmount.value).mul(FPNumber.HUNDRED).toNumber();
    };
    const handleSlideInputChange = (percent) => {
      amountSliderValue.value = Number(percent);
      const value = new FPNumber(percent).div(FPNumber.HUNDRED).mul(maxPossibleAmount.value).dp(amountPrecision.value);
      if (!value.isZero()) {
        handleInputFieldBase(value.toString());
      }
    };
    const formatInputValue = (value, precision) => {
      if (!value) return "";
      const [, decimal] = value.split(".");
      if (value.endsWith(".") && precision === 0) return value.slice(0, -1);
      return value.endsWith(".") || decimal?.length <= precision ? value : new FPNumber(value).dp(precision).toString();
    };
    const handleInputFieldQuote = (preciseValue) => {
      const value = formatInputValue(preciseValue, bookPrecision.value);
      quoteValue.value = value;
      void checkInputValidation();
    };
    const resetQuoteSubscription = () => {
      quoteSubscription.value?.unsubscribe();
      quoteSubscription.value = null;
    };
    const subscribeOnBookQuote = () => {
      resetQuoteSubscription();
      if (!(baseValue.value && swapTokensSelected.value)) return;
      const inputAsset = tokenFrom.value?.address;
      const outputAsset = tokenTo.value?.address;
      if (!inputAsset || !outputAsset) return;
      const sources = [LiquiditySourceTypes.OrderBook];
      const observableQuote = api.swap.getSwapQuoteObservable(inputAsset, outputAsset, sources, dexId.value);
      if (!observableQuote) return;
      quoteSubscription.value = observableQuote.subscribe(async ({ quote }) => {
        const {
          result: { amount }
        } = quote(inputAsset, outputAsset, baseValue.value, isBuySide.value, sources);
        if (FPNumber.fromCodecValue(amount).isZero() || limitOrderType.value === LimitOrderType.limit) {
          resetQuoteSubscription();
          quoteValue.value = "";
          setToValue("");
          marketQuotePrice.value = "";
          return;
        }
        marketQuotePrice.value = FPNumber.fromCodecValue(amount).div(FPNumber.fromNatural(baseValue.value || "0")).dp(bookPrecision.value).toString();
        prepareValuesForSwap(amount);
      });
    };
    const handleInputFieldBase = (preciseValue) => {
      const value = formatInputValue(preciseValue, amountPrecision.value);
      baseValue.value = value;
      amountSliderValue.value = getPercent(value);
      void checkInputValidation();
      if (!value) {
        resetQuoteSubscription();
      }
      if (isMarketType.value) {
        if (value) {
          subscribeOnBookQuote();
        } else {
          quoteValue.value = "";
        }
      }
    };
    const prepareValuesForSwap = (amount) => {
      if (!swapTokensSelected.value || asZeroValue(baseValue.value)) return;
      const from = isBuySide.value ? getStringFromCodec(amount) : baseValue.value;
      const to = isBuySide.value ? baseValue.value : getStringFromCodec(amount);
      setFromValue(from);
      setToValue(to);
      quoteValue.value = marketQuotePrice.value;
      setLiquiditySource(LiquiditySourceTypes.OrderBook);
      selectSwapDexId(dexId.value);
      void checkInputValidation();
    };
    const resetValues = (success) => {
      baseValue.value = "";
      quoteValue.value = "";
      if (!success) {
        limitOrderType.value = LimitOrderType.limit;
      }
    };
    const handleMaxValue = () => {
      handleInputFieldBase(maxPossibleAmount.value.toString());
      void checkInputValidation();
    };
    const toggleBookList = () => {
      visibleBookList.value = !visibleBookList.value;
    };
    const handleTabClick = () => {
      setTokens();
      if (!isMarketType.value) {
        resetQuoteSubscription();
      }
      if (isMarketType.value) {
        quoteValue.value = "";
        if (baseValue.value) subscribeOnBookQuote();
      }
      void checkInputValidation();
    };
    const isPriceUnique = (statedPrice) => {
      const rawPrices = (!isBuySide.value ? asks.value : bids.value).map((priceVolume) => priceVolume[0]);
      const prices = rawPrices.map((price) => price.toString());
      return !prices.includes(statedPrice);
    };
    const singlePriceReachedLimit = async () => {
      if (isMarketType.value || !quoteValue.value) return false;
      const limitReached = !await api.orderBook.isOrderPlaceable(
        baseAsset.value.address,
        quoteAsset.value.address,
        side.value,
        quoteValue.value
      );
      limitForSinglePriceReached.value = limitReached;
      return limitReached;
    };
    const handleOrderPlacement = async () => {
      if (!isLoggedIn.value) {
        connectSoraWallet();
        return;
      }
      if (isMarketType.value) {
        subscribeOnBookQuote();
      }
      confirmOrExecute(placeOrder);
    };
    const placeMarketOrder = () => api.swap.execute(
      tokenFrom.value,
      tokenTo.value,
      fromValue.value,
      toValue.value,
      slippageTolerance.value,
      isBuySide.value,
      LiquiditySourceTypes.OrderBook,
      dexId.value
    );
    const placeLimitOrder = () => api.orderBook.placeLimitOrder(baseAsset.value, quoteAsset.value, quoteValue.value, baseValue.value, side.value);
    const placeOrder = async () => {
      await withNotifications(async () => {
        const isLimitReached = await singlePriceReachedLimit();
        if (isLimitReached) {
          vm?.proxy?.$alert(t("orderBook.error.singlePriceLimit.reading"), { title: t("errorText") });
          return;
        }
        const orderExtrinsic = isMarketType.value ? placeMarketOrder : placeLimitOrder;
        await orderExtrinsic();
        resetValues(true);
      });
    };
    const checkInputValidation = async () => {
      setError({ reason: "", reading: "" });
      if (orderBookStatus.value === OrderBookStatus.Stop) return;
      if (isLimitOrder.value) {
        if (await singlePriceReachedLimit() && quoteValue.value)
          return setError({
            reason: t("orderBook.error.singlePriceLimit.reason"),
            reading: t("orderBook.error.singlePriceLimit.reading")
          });
        if (userReachedOwnLimit.value)
          return setError({
            reason: t("orderBook.error.accountLimit.reason"),
            reading: t("orderBook.error.accountLimit.reading")
          });
        if (userReachedSpotLimit.value)
          return setError({
            reason: t("orderBook.error.spotLimit.reason"),
            reading: t("orderBook.error.spotLimit.reading")
          });
      }
      if (!isPriceBeyondPrecision.value && baseValue.value && isLimitOrder.value) {
        const { tickSize } = currentOrderBook.value;
        return setError({
          reason: t("orderBook.error.multipleOf.reason"),
          reading: t("orderBook.error.multipleOf.reading", { value: tickSize?.toString() })
        });
      }
      if (isMarketType.value) {
        await delay(300);
        if (!marketQuotePrice.value && !isZeroAmount.value) {
          return setError({
            reason: t("orderBook.error.marketNotAvailable.reason"),
            reading: t("orderBook.error.marketNotAvailable.reading")
          });
        }
      }
      if (orderBookStatus.value === OrderBookStatus.PlaceAndCancel && priceExceedsSpread.value)
        return setError({
          reason: t("orderBook.error.exceedsSpread.reason"),
          reading: t("orderBook.error.exceedsSpread.reading")
        });
      if (!isZeroAmount.value && isOutOfAmountBounds.value && quoteValue.value || isBalanceLessThanStepSize.value) {
        const { maxLotSize, minLotSize } = currentOrderBook.value;
        const { symbol } = baseAsset.value;
        return setError({
          reason: t("orderBook.error.outOfBounds.reason"),
          reading: t("orderBook.error.outOfBounds.reading", {
            max: `${maxLotSize?.toLocaleString()} ${symbol}`,
            min: `${minLotSize?.toLocaleString()} ${symbol}`
          })
        });
      }
    };
    const setTokens = () => {
      if (!baseAsset.value || !quoteAsset.value) return;
      if (isBuySide.value) {
        setTokenFromAddress(quoteAsset.value.address);
        setTokenToAddress(baseAsset.value.address);
      } else {
        setTokenFromAddress(baseAsset.value.address);
        setTokenToAddress(quoteAsset.value.address);
      }
    };
    const handleSideChange = (oldValue, newValue) => {
      updateBalanceSubscription();
      handleTabClick();
      if (oldValue?.startsWith("0x") && oldValue !== newValue) {
        amountSliderValue.value = 0;
      } else if (["Buy", "Sell"].includes(oldValue) && oldValue !== newValue) {
        const orderBook = currentOrderBook.value;
        if (!orderBook) return;
        const maxLotSize = orderBook.maxLotSize;
        const maxBalance = getMaxValue(baseAsset.value, networkFee.value);
        const hasLessBalance = maxLotSize.gt(new FPNumber(maxBalance));
        if (hasLessBalance) {
          handleInputFieldBase("");
          amountSliderValue.value = 0;
        }
      }
    };
    watch(side, (newValue, oldValue) => {
      handleSideChange(oldValue, newValue);
    });
    watch(baseAssetAddress, (newValue, oldValue) => {
      handleSideChange(oldValue, newValue);
    });
    watch([baseAsset, quoteAsset], () => {
      setTokens();
    });
    watch(visibleBookList, (value) => {
      resetValues();
      if (value) {
        updateOrderBooksStats();
      }
    });
    watch(marketQuotePrice, () => {
      void checkInputValidation();
    });
    watch(
      userLimitOrders,
      () => {
        void checkInputValidation();
      },
      { deep: true }
    );
    onMounted(() => {
      updateBalanceSubscription();
      if (prevRoute.value === PageNames.Swap && tokenFrom.value?.address && tokenTo.value?.address) {
        prevSwapFromAddress.value = tokenFrom.value.address;
        prevSwapToAddress.value = tokenTo.value.address;
      }
    });
    onBeforeUnmount(() => {
      resetQuoteSubscription();
      updateBalanceSubscription(true);
      if (prevSwapFromAddress.value && prevSwapToAddress.value) {
        setTokenFromAddress(prevSwapFromAddress.value);
        setTokenToAddress(prevSwapToAddress.value);
      } else {
        setTokenFromAddress(xor.value?.address ?? "");
        resetTokenToAddress();
      }
      setFromValue("");
      setToValue("");
      quoteValue.value = "";
      baseValue.value = "";
      setLiquiditySource(LiquiditySourceTypes.Default);
      selectSwapDexId(DexId.XOR);
      side.value = PriceVariant.Buy;
      amountSliderValue.value = 0;
      limitOrderType.value = LimitOrderType.limit;
    });
    const buttonDisabled = computed(() => {
      if (bookStopped.value) return true;
      if (limitForSinglePriceReached.value || userReachedSpotLimit.value || userReachedOwnLimit.value) return true;
      if (!isLoggedIn.value) return false;
      if (limitOrderType.value === LimitOrderType.limit) {
        if (!baseValue.value || !quoteValue.value) return true;
        if (!isPriceBeyondPrecision.value) return true;
        if (orderBookStatus.value === OrderBookStatus.PlaceAndCancel) {
          if (priceExceedsSpread.value) return true;
        }
      } else {
        if (!baseValue.value) return true;
        if (!marketQuotePrice.value) return true;
      }
      if (isOutOfAmountBounds.value || isInsufficientXorForFee.value || isInsufficientBalance.value) return true;
      return false;
    });
    const isMaxAmountAvailable = computed(() => {
      if (!(baseAsset.value && quoteAsset.value)) return false;
      return isLoggedIn.value && isMaxButtonAvailable(baseAsset.value, baseValue.value, networkFee.value, xor.value, true);
    });
    return (_ctx, _cache) => {
      const _component_pair_list_popover = resolveComponent("pair-list-popover");
      const _component_pair_token_logo = resolveComponent("pair-token-logo");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_price_change = resolveComponent("price-change");
      const _component_s_popover_panel = resolveComponent("s-popover-panel");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      const _component_token_input = resolveComponent("token-input");
      const _component_info_line = resolveComponent("info-line");
      const _component_error = resolveComponent("error");
      const _component_s_button = resolveComponent("s-button");
      const _component_place_transaction_details = resolveComponent("place-transaction-details");
      const _component_place_confirm = resolveComponent("place-confirm");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_popover_panel, {
          "popper-class": "order-book-whitelist",
          trigger: "click",
          show: visibleBookList.value,
          "onUpdate:show": _cache[0] || (_cache[0] = ($event) => visibleBookList.value = $event),
          "visible-arrow": false
        }, {
          reference: withCtx(() => [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", null, toDisplayString(unref(t)("orderBook.tokenPair")), 1),
              createBaseVNode("div", _hoisted_3, [
                createBaseVNode("div", _hoisted_4, [
                  createVNode(_component_pair_token_logo, {
                    "first-token": unref(baseAsset),
                    "second-token": unref(quoteAsset)
                  }, null, 8, ["first-token", "second-token"]),
                  unref(baseAsset) && unref(quoteAsset) ? (openBlock(), createElementBlock("span", _hoisted_5, toDisplayString(`${baseSymbol.value}-${quoteSymbol.value}`), 1)) : createCommentVNode("", true)
                ]),
                createVNode(_component_s_icon, {
                  name: icon.value,
                  class: "order-book-choose-btn-icon",
                  size: "24px"
                }, null, 8, ["name"])
              ]),
              _cache[3] || (_cache[3] = createBaseVNode("div", { class: "delimiter" }, null, -1)),
              createBaseVNode("div", _hoisted_6, [
                createBaseVNode("div", _hoisted_7, [
                  createBaseVNode("span", null, toDisplayString(unref(t)("priceText")), 1),
                  createBaseVNode("span", _hoisted_8, [
                    createVNode(_component_formatted_amount, { value: orderBookPrice.value }, null, 8, ["value"])
                  ])
                ]),
                createBaseVNode("div", _hoisted_9, [
                  createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.change")), 1),
                  createBaseVNode("span", _hoisted_10, [
                    createVNode(_component_price_change, { value: orderBookPriceChange.value }, null, 8, ["value"])
                  ])
                ]),
                createBaseVNode("div", _hoisted_11, [
                  createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.dayVolume")), 1),
                  createBaseVNode("span", _hoisted_12, [
                    createVNode(_component_formatted_amount, {
                      value: orderBookVolume.value,
                      "is-fiat-value": ""
                    }, null, 8, ["value"])
                  ])
                ])
              ])
            ])
          ]),
          default: withCtx(() => [
            createVNode(_component_pair_list_popover, { onClose: toggleBookList })
          ]),
          _: 1
        }, 8, ["show"]),
        createVNode(_component_s_tabs, {
          class: "order-book__tab",
          modelValue: unref(limitOrderType),
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(limitOrderType) ? limitOrderType.value = $event : null),
          type: "rounded",
          onClick: handleTabClick
        }, {
          default: withCtx(() => [
            createVNode(_component_s_tab, {
              label: "limit",
              name: "limit"
            }, {
              default: withCtx(() => [
                createBaseVNode("span", _hoisted_13, [
                  createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.limit")), 1),
                  createVNode(_component_s_tooltip, {
                    slot: "suffix",
                    "border-radius": "mini",
                    content: unref(t)("orderBook.tooltip.limitOrder"),
                    placement: "top",
                    tabindex: "-1"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_s_icon, {
                        name: "info-16",
                        size: "14px"
                      })
                    ]),
                    _: 1
                  }, 8, ["content"])
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_tab, {
              label: "market",
              name: "market",
              disabled: marketOptionDisabled.value
            }, {
              default: withCtx(() => [
                createBaseVNode("span", _hoisted_14, [
                  createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.market")), 1),
                  createVNode(_component_s_tooltip, {
                    slot: "suffix",
                    "border-radius": "mini",
                    content: unref(t)("orderBook.tooltip.marketOrder"),
                    placement: "top",
                    tabindex: "-1"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_s_icon, {
                        name: "info-16",
                        size: "14px"
                      })
                    ]),
                    _: 1
                  }, 8, ["content"])
                ])
              ]),
              _: 1
            }, 8, ["disabled"])
          ]),
          _: 1
        }, 8, ["modelValue"]),
        createVNode(_component_token_input, {
          balance: getTokenBalance(unref(quoteAsset)),
          "is-max-available": false,
          title: unref(t)("priceText"),
          token: unref(quoteAsset),
          "model-value": unref(quoteValue),
          disabled: isPriceInputDisabled.value,
          "onUpdate:modelValue": handleInputFieldQuote,
          class: "order-book-input"
        }, null, 8, ["balance", "title", "token", "model-value", "disabled"]),
        createVNode(_component_token_input, {
          balance: getTokenBalance(unref(baseAsset)),
          "is-max-available": isMaxAmountAvailable.value,
          "with-slider": isSliderAvailable.value,
          title: unref(t)("orderBook.amount"),
          token: unref(baseAsset),
          "model-value": unref(baseValue),
          "slider-value": unref(amountSliderValue),
          onSlide: handleSlideInputChange,
          "onUpdate:modelValue": handleInputFieldBase,
          onMax: handleMaxValue,
          class: "order-book-input s-input--with-slider"
        }, null, 8, ["balance", "is-max-available", "with-slider", "title", "token", "model-value", "slider-value"]),
        createBaseVNode("div", _hoisted_15, [
          createVNode(_component_info_line, {
            class: "total-line",
            label: unref(t)(`orderBook.${unref(side)}`),
            value: formattedAmountAtPrice.value
          }, null, 8, ["label", "value"]),
          createVNode(_component_info_line, {
            class: "total-line",
            label: unref(t)("orderBook.total"),
            value: formattedTotal.value,
            "asset-symbol": quoteSymbol.value
          }, null, 8, ["label", "value", "asset-symbol"])
        ]),
        createVNode(_component_s_popover_panel, {
          "popper-class": "book-validation__popover",
          trigger: "hover",
          "visible-arrow": false
        }, {
          reference: withCtx(() => [
            buttonDisabled.value ? (openBlock(), createBlock(_component_s_button, {
              key: 0,
              type: "primary",
              class: normalizeClass(["btn s-typography-button--medium", computedBtnClass.value]),
              disabled: buttonDisabled.value,
              onClick: handleOrderPlacement
            }, {
              default: withCtx(() => [
                bookStopped.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("orderBook.stop")), 1)
                ], 64)) : userReachedSpotLimit.value || userReachedOwnLimit.value ? (openBlock(), createBlock(_component_error, { key: 1 })) : isLimitOrder.value && !unref(quoteValue) ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("orderBook.setPrice")), 1)
                ], 64)) : isBalanceLessThanStepSize.value ? (openBlock(), createBlock(_component_error, { key: 3 })) : isLimitOrder.value && (!unref(baseValue) || isZeroAmount.value) ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
                  createTextVNode(toDisplayString(unref(t)("orderBook.enterAmount")), 1)
                ], 64)) : isLimitOrder.value && !isPriceBeyondPrecision.value ? (openBlock(), createBlock(_component_error, { key: 5 })) : isLimitOrder.value && isPlaceAndCancelMode.value && priceExceedsSpread.value ? (openBlock(), createBlock(_component_error, { key: 6 })) : isLimitOrder.value && limitForSinglePriceReached.value ? (openBlock(), createBlock(_component_error, { key: 7 })) : !isLimitOrder.value && isZeroAmount.value ? (openBlock(), createElementBlock(Fragment, { key: 8 }, [
                  createTextVNode(toDisplayString(unref(t)("orderBook.enterAmount")), 1)
                ], 64)) : !isLimitOrder.value && !marketQuotePrice.value ? (openBlock(), createBlock(_component_error, { key: 9 })) : isOutOfAmountBounds.value ? (openBlock(), createBlock(_component_error, { key: 10 })) : isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 11 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: xor.value?.symbol })), 1)
                ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 12 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(tokenFrom)?.symbol })), 1)
                ], 64)) : createCommentVNode("", true)
              ]),
              _: 1
            }, 8, ["class", "disabled"])) : (openBlock(), createBlock(_component_s_button, {
              key: 1,
              type: "primary",
              class: normalizeClass(["btn s-typography-button--medium", [computedBtnClass.value, { "order-book-connect-btn": !unref(isLoggedIn) }]]),
              onClick: handleOrderPlacement
            }, {
              default: withCtx(() => [
                !unref(isLoggedIn) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
                ], 64)) : isBuySide.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("orderBook.Buy", { asset: unref(baseAsset)?.symbol })), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("orderBook.Sell", { asset: unref(baseAsset)?.symbol })), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["class"]))
          ]),
          default: withCtx(() => [
            shouldErrorTooltipBeShown.value ? (openBlock(), createElementBlock("div", _hoisted_16, [
              createBaseVNode("div", _hoisted_17, [
                createBaseVNode("h4", _hoisted_18, toDisplayString(reason.value), 1),
                createBaseVNode("p", _hoisted_19, toDisplayString(reading.value), 1),
                createBaseVNode("div", _hoisted_20, [
                  createVNode(_component_s_icon, {
                    name: "notifications-alert-triangle-24",
                    size: "28px"
                  })
                ])
              ])
            ])) : createCommentVNode("", true)
          ]),
          _: 1
        }),
        unref(areTokensSelected) && !hasZeroAmount.value && !hasExplainableError.value ? (openBlock(), createBlock(_component_place_transaction_details, {
          key: 0,
          class: "info-line-container",
          "info-only": false,
          "is-market-type": isMarketType.value
        }, null, 8, ["is-market-type"])) : createCommentVNode("", true),
        createVNode(_component_place_confirm, {
          visible: unref(confirmDialogVisible),
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => isRef(confirmDialogVisible) ? confirmDialogVisible.value = $event : null),
          "is-insufficient-balance": isInsufficientBalance.value,
          "is-buy-side": isBuySide.value,
          "is-market-type": isMarketType.value,
          onConfirm: placeOrder
        }, null, 8, ["visible", "is-insufficient-balance", "is-buy-side", "is-market-type"])
      ]);
    };
  }
});
const BuySell = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1b5a0238"]]);
export {
  BuySell as default
};
