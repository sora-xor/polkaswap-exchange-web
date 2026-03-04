<template>
  <div class="order-book order-books">
    <el-popover popper-class="order-book-whitelist" trigger="click" v-model="visibleBookList" :visible-arrow="false">
      <pair-list-popover @close="toggleBookList" />
      <template #reference>
        <div class="order-book-choose-pair">
          <div>{{ t('orderBook.tokenPair') }}</div>
          <div class="order-book-choose-btn">
            <div class="order-book-pair-name">
              <pair-token-logo :first-token="baseAsset" :second-token="quoteAsset" />
              <span v-if="baseAsset && quoteAsset">{{ `${baseSymbol}-${quoteSymbol}` }}</span>
            </div>
            <s-icon :name="icon" class="order-book-choose-btn-icon" />
          </div>
          <div class="delimiter" />
          <div class="order-book-pair-data">
            <div class="order-book-pair-data-item">
              <span>{{ t('priceText') }}</span>
              <span class="order-book-pair-data-item__value order-book-fiat">
                <formatted-amount :value="orderBookPrice" />
              </span>
            </div>
            <div class="order-book-pair-data-item">
              <span>{{ t('orderBook.change') }}</span>
              <span class="order-book-pair-data-item__value">
                <price-change :value="orderBookPriceChange" />
              </span>
            </div>
            <div class="order-book-pair-data-item">
              <span>{{ t('orderBook.dayVolume') }}</span>
              <span class="order-book-pair-data-item__value">
                <formatted-amount :value="orderBookVolume" is-fiat-value />
              </span>
            </div>
          </div>
        </div>
      </template>
    </el-popover>

    <s-tabs class="order-book__tab" v-model="limitOrderType" type="rounded" @click="handleTabClick">
      <s-tab label="limit" name="limit">
        <span slot="label">
          <span>{{ t('orderBook.limit') }}</span>
          <s-tooltip
            slot="suffix"
            border-radius="mini"
            :content="t('orderBook.tooltip.limitOrder')"
            placement="top"
            tabindex="-1"
          >
            <s-icon name="info-16" size="14px" />
          </s-tooltip>
        </span>
      </s-tab>
      <s-tab label="market" name="market" :disabled="marketOptionDisabled">
        <span slot="label">
          <span>{{ t('orderBook.market') }}</span>
          <s-tooltip
            slot="suffix"
            border-radius="mini"
            :content="t('orderBook.tooltip.marketOrder')"
            placement="top"
            tabindex="-1"
          >
            <s-icon name="info-16" size="14px" />
          </s-tooltip>
        </span>
      </s-tab>
    </s-tabs>

    <token-input
      :balance="getTokenBalance(quoteAsset)"
      :is-max-available="false"
      :title="t('priceText')"
      :token="quoteAsset"
      :value="quoteValue"
      :disabled="isPriceInputDisabled"
      @input="handleInputFieldQuote"
      class="order-book-input"
    />

    <token-input
      :balance="getTokenBalance(baseAsset)"
      :is-max-available="isMaxAmountAvailable"
      :with-slider="isSliderAvailable"
      :title="t('orderBook.amount')"
      :token="baseAsset"
      :value="baseValue"
      :slider-value="amountSliderValue"
      @slide="handleSlideInputChange"
      @input="handleInputFieldBase"
      @max="handleMaxValue"
      class="order-book-input s-input--with-slider"
    />

    <div class="order-book-total">
      <info-line class="total-line" :label="t(`orderBook.${side}`)" :value="formattedAmountAtPrice" />
      <info-line class="total-line" :label="t('orderBook.total')" :value="formattedTotal" :asset-symbol="quoteSymbol" />
    </div>

    <el-popover popper-class="book-validation__popover" trigger="hover" :visible-arrow="false">
      <div v-if="shouldErrorTooltipBeShown" class="book-validation">
        <div class="book-validation__disclaimer">
          <h4 class="book-validation__disclaimer-header">
            {{ reason }}
          </h4>
          <p class="book-validation__disclaimer-paragraph">
            {{ reading }}
          </p>
          <div class="book-validation__disclaimer-warning icon">
            <s-icon name="notifications-alert-triangle-24" size="28px" />
          </div>
        </div>
      </div>
      <template #reference>
        <s-button
          v-if="buttonDisabled"
          type="primary"
          class="btn s-typography-button--medium"
          :class="computedBtnClass"
          :disabled="buttonDisabled"
          @click="handleOrderPlacement"
        >
          <template v-if="bookStopped">
            {{ t('orderBook.stop') }}
          </template>
          <template v-else-if="userReachedSpotLimit || userReachedOwnLimit">
            <error />
          </template>
          <template v-else-if="isLimitOrder && !quoteValue">{{ t('orderBook.setPrice') }}</template>
          <template v-else-if="isBalanceLessThanStepSize">
            <error />
          </template>
          <template v-else-if="isLimitOrder && (!baseValue || isZeroAmount)">
            {{ t('orderBook.enterAmount') }}
          </template>
          <template v-else-if="isLimitOrder && !isPriceBeyondPrecision">
            <error />
          </template>
          <template v-else-if="isLimitOrder && isPlaceAndCancelMode && priceExceedsSpread">
            <error />
          </template>
          <template v-else-if="isLimitOrder && limitForSinglePriceReached">
            <error />
          </template>
          <template v-else-if="!isLimitOrder && isZeroAmount">
            {{ t('orderBook.enterAmount') }}
          </template>
          <template v-else-if="!isLimitOrder && !marketQuotePrice">
            <error />
          </template>
          <template v-else-if="isOutOfAmountBounds">
            <error />
          </template>
          <template v-else-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xor?.symbol }) }}
          </template>
          <template v-else-if="isInsufficientBalance">
            {{ t('insufficientBalanceText', { tokenSymbol: tokenFrom?.symbol }) }}
          </template>
        </s-button>
        <s-button
          v-else
          type="primary"
          class="btn s-typography-button--medium"
          :class="computedBtnClass"
          @click="handleOrderPlacement"
        >
          <template v-if="!isLoggedIn">
            {{ t('connectWalletText') }}
          </template>
          <template v-else-if="isBuySide">
            {{ t('orderBook.Buy', { asset: baseAsset?.symbol }) }}
          </template>
          <template v-else>
            {{ t('orderBook.Sell', { asset: baseAsset?.symbol }) }}
          </template>
        </s-button>
      </template>
    </el-popover>

    <place-transaction-details
      v-if="areTokensSelected && !hasZeroAmount && !hasExplainableError"
      class="info-line-container"
      :info-only="false"
      :is-market-type="isMarketType"
    />

    <place-confirm
      v-model:visible="confirmDialogVisible"
      :is-insufficient-balance="isInsufficientBalance"
      :is-buy-side="isBuySide"
      :is-market-type="isMarketType"
      @confirm="placeOrder"
    />
  </div>
</template>

<script setup lang="ts">
import { PriceVariant, OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { components, api } from '@wallet';
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { Components, LimitOrderType, PageNames } from '@/consts';
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useOrderBook } from '@/composables/useOrderBook';
import { useOrderBookUserOrders } from '@/composables/useOrderBookUserOrders';
import { useOrderBookManagement } from '@/composables/useOrderBookManagement';
import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import { useRouterStore } from '@/stores/router';
import { useSettingsStore } from '@/stores/settings';
import { useSwapStore } from '@/stores/swap';
import { useAssetsStore } from '@/stores/assets';
import type { OrderBookStats } from '@/types/orderBook';
import {
  asZeroValue,
  delay,
  getAssetBalance,
  getMaxValue,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  isMaxButtonAvailable,
} from '@/utils';
import { getBookDecimals, MAX_ORDERS_PER_SIDE, MAX_ORDERS_PER_USER } from '@/utils/orderBook';

import type { OrderBook, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { Subscription } from 'rxjs';

defineOptions({
  components: {
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
    TokenInput: lazyComponent(Components.TokenInput),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PairListPopover: lazyComponent(Components.PairListPopover),
    PlaceConfirm: lazyComponent(Components.PlaceOrder),
    PlaceTransactionDetails: lazyComponent(Components.PlaceTransactionDetails),
    PriceChange: lazyComponent(Components.PriceChange),
    Error: lazyComponent(Components.ErrorButton),
  },
});

const {
  tokenFrom,
  tokenTo,
  fromValue,
  toValue,
  areTokensSelected: swapTokensSelected,
  setTokenFromAddress,
  setTokenToAddress,
  setFromValue,
  setToValue,
} = useSwapAmounts();

const swapStore = useSwapStore();
const routerStore = useRouterStore();
const assetsStore = useAssetsStore();
const { t } = useTranslation();
const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();
const { isLoggedIn, connectSoraWallet } = useInternalConnect();
const { getFPNumber, getFPNumberFromCodec, formatCodecNumber, formatStringValue, getStringFromCodec } =
  useFormattedAmount();
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
  orderBookStats,
} = useOrderBook();
const { userLimitOrders } = useOrderBookUserOrders();
const { updateBalanceSubscription, updateOrderBooksStats } = useOrderBookManagement();

const vm = getCurrentInstance();
const prevRoute = computed(() => routerStore.prev as Nullable<PageNames>);
const settingsStore = useSettingsStore();
const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);
const slippageTolerance = computed(() => settingsStore.slippageTolerance);
const xor = computed(() => assetsStore.xor as AccountAsset);

const visibleBookList = ref(false);
const limitForSinglePriceReached = ref(false);
const quoteSubscription = ref<Subscription | null>(null);
const marketQuotePrice = ref('');
const reason = ref('');
const reading = ref('');
const prevSwapFromAddress = ref('');
const prevSwapToAddress = ref('');

const networkFee = computed<CodecString>(() => networkFees.value[Operation.OrderBookPlaceLimitOrder]);

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

  if (!amountPrecision.value && baseValue.value === '0' && !isBuySide.value) {
    return new FPNumber(availableBalance).lt(orderBook.stepLotSize);
  }

  return false;
});

const hasExplainableError = computed(() => Boolean(reason.value && reading.value));

const formattedAmountAtPrice = computed(() => {
  if (!(baseValue.value && quoteValue.value)) return '';

  return t('orderBook.tradingPair.total', {
    amount: formatStringValue(baseValue.value),
    symbol: baseSymbol.value,
    amount2: formatStringValue(quoteValue.value || marketQuotePrice.value),
    symbol2: quoteSymbol.value,
  });
});

const formattedTotal = computed(() => getFPNumber(baseValue.value).mul(getFPNumber(quoteValue.value)).toLocaleString());

const shouldErrorTooltipBeShown = computed(() => isLoggedIn.value && hasExplainableError.value);

const isLimitOrder = computed(() => limitOrderType.value === LimitOrderType.limit);

const isPlaceAndCancelMode = computed(() => orderBookStatus.value === OrderBookStatus.PlaceAndCancel);
const setError = ({ reason: nextReason, reading: nextReading }: { reason: string; reading: string }) => {
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

const baseSymbol = computed(() => baseAsset.value?.symbol ?? '');
const quoteSymbol = computed(() => quoteAsset.value?.symbol ?? '');

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

  let value = '';

  if (isBuySide.value) {
    const quoteFP = new FPNumber(quoteValue.value || '0');
    const baseFP = new FPNumber(baseValue.value || '0');
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
    const price = new FPNumber(quoteValue.value);
    return FPNumber.gte(price, bestAsk);
  }

  const bestBid = bids.value[0]?.[0];
  if (!bestBid) return false;
  const price = new FPNumber(quoteValue.value);
  return FPNumber.lte(price, bestBid);
});
const setLiquiditySource = (source: string) => swapStore.setLiquiditySource(source as LiquiditySourceTypes);
const selectSwapDexId = (dex: DexId) => swapStore.selectDexId(dex);
const resetTokenToAddress = () => setTokenToAddress('');
const orderBookTokensSelected = computed(() => Boolean(baseAsset.value && quoteAsset.value));
const areTokensSelected = orderBookTokensSelected;
const isPriceTooHigh = computed(() => {
  if (!asks.value.length || isBuySide.value) return false;

  const bestAsk = asks.value[asks.value.length - 1]?.[0];
  if (!bestAsk) return false;

  const price = new FPNumber(quoteValue.value || '0');
  const fiftyPercentDelta = bestAsk.mul(new FPNumber(1.5));

  return FPNumber.gt(price, fiftyPercentDelta);
});

const isPriceTooLow = computed(() => {
  if (!bids.value.length || !isBuySide.value) return false;

  const bestBid = bids.value[0]?.[0];
  if (!bestBid) return false;

  const price = new FPNumber(quoteValue.value || '0');
  const fiftyPercentDelta = bestBid.div(new FPNumber(2));

  return FPNumber.lt(price, fiftyPercentDelta);
});

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
  const amountFP = new FPNumber(baseValue.value || '0');

  return !(FPNumber.lte(amountFP, maxLotSize) && FPNumber.gte(amountFP, minLotSize) && amountFP.isZeroMod(stepLotSize));
});

const computedBtnClass = computed(() => {
  if (!isLoggedIn.value) return '';
  return isBuySide.value ? 'buy-btn' : '';
});

const isPriceInputDisabled = computed(() => isMarketType.value);

const icon = computed(() =>
  visibleBookList.value ? 'arrows-circle-chevron-top-24' : 'arrows-circle-chevron-bottom-24'
);

const getTokenBalance = (token: AccountAsset): CodecString => getAssetBalance(token);

const getPercent = (value: string) => {
  if (!value) return 0;
  return new FPNumber(value).div(maxPossibleAmount.value).mul(FPNumber.HUNDRED).toNumber();
};
const handleSlideInputChange = (percent: string) => {
  amountSliderValue.value = Number(percent);

  const value = new FPNumber(percent).div(FPNumber.HUNDRED).mul(maxPossibleAmount.value).dp(amountPrecision.value);

  if (!value.isZero()) {
    handleInputFieldBase(value.toString());
  }
};

const formatInputValue = (value: string, precision: number) => {
  if (!value) return '';

  const [, decimal] = value.split('.');

  if (value.endsWith('.') && precision === 0) return value.slice(0, -1);

  return value.endsWith('.') || decimal?.length <= precision ? value : new FPNumber(value).dp(precision).toString();
};

const handleInputFieldQuote = (preciseValue: string) => {
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

  const inputAsset = (tokenFrom.value as AccountAsset)?.address;
  const outputAsset = (tokenTo.value as AccountAsset)?.address;
  if (!inputAsset || !outputAsset) return;

  const sources = [LiquiditySourceTypes.OrderBook];
  const observableQuote = api.swap.getSwapQuoteObservable(inputAsset, outputAsset, sources, dexId.value);

  if (!observableQuote) return;

  quoteSubscription.value = observableQuote.subscribe(async ({ quote }) => {
    const {
      result: { amount },
    } = quote(inputAsset, outputAsset, baseValue.value, isBuySide.value, sources);

    if (FPNumber.fromCodecValue(amount).isZero() || limitOrderType.value === LimitOrderType.limit) {
      resetQuoteSubscription();
      quoteValue.value = '';
      setToValue('');
      marketQuotePrice.value = '';
      return;
    }

    marketQuotePrice.value = FPNumber.fromCodecValue(amount)
      .div(FPNumber.fromNatural(baseValue.value || '0'))
      .dp(bookPrecision.value)
      .toString();

    prepareValuesForSwap(amount);
  });
};

const handleInputFieldBase = (preciseValue: string) => {
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
      quoteValue.value = '';
    }
  }
};

const prepareValuesForSwap = (amount: CodecString) => {
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

const resetValues = (success?: boolean) => {
  baseValue.value = '';
  quoteValue.value = '';

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
    quoteValue.value = '';
    if (baseValue.value) subscribeOnBookQuote();
  }

  void checkInputValidation();
};

const isPriceUnique = (statedPrice: string) => {
  const rawPrices = (!isBuySide.value ? asks.value : bids.value).map((priceVolume) => priceVolume[0]);
  const prices = rawPrices.map((price) => price.toString());

  return !prices.includes(statedPrice);
};

const singlePriceReachedLimit = async () => {
  if (isMarketType.value || !quoteValue.value) return false;

  const limitReached = !(await api.orderBook.isOrderPlaceable(
    baseAsset.value.address,
    quoteAsset.value.address,
    side.value,
    quoteValue.value
  ));

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

const placeMarketOrder = () =>
  api.swap.execute(
    tokenFrom.value as AccountAsset,
    tokenTo.value as AccountAsset,
    fromValue.value,
    toValue.value,
    slippageTolerance.value,
    isBuySide.value,
    LiquiditySourceTypes.OrderBook,
    dexId.value
  );

const placeLimitOrder = () =>
  api.orderBook.placeLimitOrder(baseAsset.value, quoteAsset.value, quoteValue.value, baseValue.value, side.value);

const placeOrder = async () => {
  await withNotifications(async () => {
    const isLimitReached = await singlePriceReachedLimit();
    if (isLimitReached) {
      vm?.proxy?.$alert(t('orderBook.error.singlePriceLimit.reading'), { title: t('errorText') });
      return;
    }

    const orderExtrinsic = isMarketType.value ? placeMarketOrder : placeLimitOrder;
    await orderExtrinsic();
    resetValues(true);
  });
};
const checkInputValidation = async () => {
  setError({ reason: '', reading: '' });

  if (orderBookStatus.value === OrderBookStatus.Stop) return;

  if (isLimitOrder.value) {
    if ((await singlePriceReachedLimit()) && quoteValue.value)
      return setError({
        reason: t('orderBook.error.singlePriceLimit.reason'),
        reading: t('orderBook.error.singlePriceLimit.reading'),
      });

    if (userReachedOwnLimit.value)
      return setError({
        reason: t('orderBook.error.accountLimit.reason'),
        reading: t('orderBook.error.accountLimit.reading'),
      });

    if (userReachedSpotLimit.value)
      return setError({
        reason: t('orderBook.error.spotLimit.reason'),
        reading: t('orderBook.error.spotLimit.reading'),
      });
  }

  // NOTE: corridor check could be enabled on blockchain later on; uncomment to return
  // if (isPriceTooHigh.value && quoteValue.value && baseValue.value)
  //   return setError({
  //     reason: 'Price is too far above/below the market price.',
  //     reading:
  //       'Price range alert: Your price is more than 50% above or below the current market price. Please enter a more closely aligned market price',
  //   });
  // if (isPriceTooLow.value && quoteValue.value && baseValue.value)
  //   return setError({
  //     reason: 'Price is too far above/below the market price.',
  //     reading:
  //       'Price range alert: Your price is more than 50% above or below the current market price. Please enter a more closely aligned market price',
  //   });

  if (!isPriceBeyondPrecision.value && baseValue.value && isLimitOrder.value) {
    const { tickSize } = currentOrderBook.value as OrderBook;

    return setError({
      reason: t('orderBook.error.multipleOf.reason'),
      reading: t('orderBook.error.multipleOf.reading', { value: tickSize?.toString() }),
    });
  }

  if (isMarketType.value) {
    // wait until any market quote being set to avoid error appearance
    await delay(300);

    if (!marketQuotePrice.value && !isZeroAmount.value) {
      return setError({
        reason: t('orderBook.error.marketNotAvailable.reason'),
        reading: t('orderBook.error.marketNotAvailable.reading'),
      });
    }
  }

  if (orderBookStatus.value === OrderBookStatus.PlaceAndCancel && priceExceedsSpread.value)
    return setError({
      reason: t('orderBook.error.exceedsSpread.reason'),
      reading: t('orderBook.error.exceedsSpread.reading'),
    });

  if ((!isZeroAmount.value && isOutOfAmountBounds.value && quoteValue.value) || isBalanceLessThanStepSize.value) {
    const { maxLotSize, minLotSize } = currentOrderBook.value as OrderBook;
    const { symbol } = baseAsset.value;

    return setError({
      reason: t('orderBook.error.outOfBounds.reason'),
      reading: t('orderBook.error.outOfBounds.reading', {
        max: `${maxLotSize?.toLocaleString()} ${symbol}`,
        min: `${minLotSize?.toLocaleString()} ${symbol}`,
      }),
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

const handleSideChange = (oldValue: string, newValue: string) => {
  updateBalanceSubscription();
  handleTabClick();

  if (oldValue?.startsWith('0x') && oldValue !== newValue) {
    amountSliderValue.value = 0;
  } else if (['Buy', 'Sell'].includes(oldValue) && oldValue !== newValue) {
    const orderBook = currentOrderBook.value;
    if (!orderBook) return;
    const maxLotSize = orderBook.maxLotSize;
    const maxBalance = getMaxValue(baseAsset.value, networkFee.value);

    const hasLessBalance = maxLotSize.gt(new FPNumber(maxBalance));

    if (hasLessBalance) {
      handleInputFieldBase('');
      amountSliderValue.value = 0;
    }
  }
};
watch(side, (newValue, oldValue) => {
  handleSideChange(oldValue as unknown as string, newValue as unknown as string);
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
    setTokenFromAddress(xor.value?.address ?? '');
    resetTokenToAddress();
  }

  setFromValue('');
  setToValue('');
  quoteValue.value = '';
  baseValue.value = '';
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
</script>

<style lang="scss">
.book-validation {
  // override popover styles
  &__popover {
    width: 450px;
    background-color: var(--s-color-utility-body);
    border-radius: $basic-spacing;
    color: var(--s-color-base-content-primary);
    border: none;
    padding: 0 !important;
    word-break: normal !important;
    font-size: var(--s-font-size-small);
  }

  &__disclaimer {
    width: 100%;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-dialog);
    padding: 20px $basic-spacing;
    position: relative;
    &-header {
      font-weight: 500;
      margin-bottom: 10px;
      width: 75%;
      text-align: left;
    }
    &-paragraph {
      color: var(--s-color-base-content-secondary);
      width: 75%;
      text-align: left;
    }
    &-warning.icon {
      position: absolute;
      background-color: #479aef;
      border: 2.25257px solid #f7f3f4;
      box-shadow: var(--s-shadow-element-pressed);
      top: 20px;
      right: 20px;
      border-radius: 50%;
      color: #fff;
      width: 46px;
      height: 46px;
      .s-icon-notifications-alert-triangle-24 {
        display: block;
        color: #fff;
        margin-top: 5px;
        margin-left: 7px;
      }
    }
  }
}

.order-book {
  @include custom-tabs;

  &__tab {
    margin-bottom: $inner-spacing-mini;
  }

  .s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {
    &:not(.is-active).is-disabled {
      color: var(--s-color-base-content-secondary);
    }
    &.is-disabled {
      cursor: not-allowed;
    }
  }

  &-input {
    margin-bottom: $inner-spacing-mini;

    // overwrite select-button styles
    button.el-button.neumorphic.s-tertiary:focus:not(:active) {
      outline: none;
    }

    button.el-button.el-button--select-token.token-select-button--token {
      &:hover,
      &:focus {
        box-shadow: var(--neu-button-tertiary-box-shadow);
        cursor: initial;
        outline: none;
      }
    }
  }

  .btn {
    width: 100%;
  }

  .buy-btn {
    width: 100%;
    background-color: #34ad87 !important;
  }

  .buy-btn.is-disabled {
    background-color: unset !important;
  }
}

.order-book-whitelist.el-popover {
  border-radius: var(--s-border-radius-small);
  padding: 0;
}

.set-widget {
  .el-loading-mask {
    border-radius: 20px;
  }
}

.order-book-choose-pair {
  width: 100%;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
  border-radius: var(--s-border-radius-small);
  margin-bottom: $inner-spacing-mini;
  padding: 10px $basic-spacing;

  &:hover {
    cursor: pointer;
  }
}

.book-inform-icon-btn {
  margin-left: $inner-spacing-mini;
}
</style>

<style lang="scss" scoped>
.order-book {
  padding: 4px $basic-spacing var(--s-size-small);

  &-choose-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;

    &-icon {
      color: var(--s-color-base-content-secondary);
      filter: drop-shadow(1px 1px 5px rgba(0, 0, 0, 0.01)) drop-shadow(-1px -1px 5px rgba(0, 0, 0, 0.01));

      &:hover {
        cursor: pointer;
      }
    }
  }

  &-pair-name {
    display: flex;
    align-items: center;
    font-size: 20px;
    font-weight: 700;
  }

  &-pair-data {
    display: flex;
    color: var(--s-color-base-content-secondary);

    &-item {
      display: flex;
      flex-direction: column;
      margin-right: 42px;

      > span {
        text-transform: capitalize;
      }

      &__value {
        font-size: var(--s-font-size-small);
      }
    }
  }

  &-fiat {
    color: var(--s-color-fiat-value);
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-small);
  }

  .order-book {
    &-total {
      display: flex;
      flex-direction: column;
      .total-line {
        border-bottom: none;
        &:last-child {
          margin-bottom: 4px;
        }
      }
    }
  }

  .delimiter {
    background: var(--s-color-base-border-secondary);
    margin: $inner-spacing-mini 0;
    height: 1px;
    width: 100%;
  }
}

.s-tabs.order-book__tab.el-tabs {
  i.s-icon-info-16 {
    margin-left: 6px;
  }
}
</style>
