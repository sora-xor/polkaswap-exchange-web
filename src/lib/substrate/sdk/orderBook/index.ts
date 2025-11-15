import { map } from 'rxjs';
import { assert } from '@polkadot/util';
import { FPNumber } from '@sora-substrate/math';
import { OrderBookStatus, PriceVariant } from '@sora-substrate/liquidity-proxy';
import type { OrderBook, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';
import type { Observable } from '@polkadot/types/types';
import type { Option } from '@polkadot/types-codec';
import type {
  CommonBalanceUnit,
  CommonPrimitivesPriceVariant,
  OrderBookLimitOrder,
  OrderBookOrderBookStatus,
  OrderBook as OrderBookStruct,
} from '@polkadot/types/lookup';

import { toAssetId } from '../assets';
import { Operation } from '../types';
import { MAX_ORDERS_PER_SINGLE_PRICE, MAX_TIMESTAMP } from './consts';
import { Messages } from '../logger';
import type { Api } from '../api';
import type { AggregatedOrderBook, AssetIdOrAsset, LimitOrder, LimitOrderHistory, OrderId } from './types';
import type { AccountAsset, Asset } from '../assets/types';

function toFP(value: CommonBalanceUnit): FPNumber {
  const decimals = value.isDivisible.isTrue ? FPNumber.DEFAULT_PRECISION : 0;
  return FPNumber.fromCodecValue(value.inner.toString(), decimals);
}

const getStatus = (status: OrderBookOrderBookStatus): OrderBookStatus => {
  if (status.isTrade) return OrderBookStatus.Trade;
  if (status.isPlaceAndCancel) return OrderBookStatus.PlaceAndCancel;
  if (status.isOnlyCancel) return OrderBookStatus.OnlyCancel;

  return OrderBookStatus.Stop;
};

const getPriceVariant = (variant: CommonPrimitivesPriceVariant): PriceVariant => {
  if (variant.isBuy) {
    return PriceVariant.Buy;
  } else {
    return PriceVariant.Sell;
  }
};

const formatOrderBookOption = (option: Option<OrderBookStruct>): OrderBook | null => {
  if (!option.isSome) return null;

  const { orderBookId, status, lastOrderId, tickSize, stepLotSize, minLotSize, maxLotSize } = option.unwrap();

  const dexId = orderBookId.dexId.toNumber();
  const base = toAssetId(orderBookId.base);
  const quote = toAssetId(orderBookId.quote);

  return {
    orderBookId: { dexId, base, quote },
    status: getStatus(status),
    lastOrderId: lastOrderId.toNumber(),
    tickSize: toFP(tickSize),
    stepLotSize: toFP(stepLotSize),
    minLotSize: toFP(minLotSize),
    maxLotSize: toFP(maxLotSize),
  };
};

export class OrderBookModule<T> {
  constructor(private readonly root: Api<T>) {}

  /**
   * Get order books object `Record<serializedKey, OrderBook>`
   */
  public async getOrderBooks(): Promise<Record<string, OrderBook>> {
    const entries = await this.root.api.query.orderBook.orderBooks.entries();

    const orderBooks = entries.reduce<Record<string, OrderBook>>((buffer, [_, value]) => {
      const book = formatOrderBookOption(value);

      if (!book) return buffer;

      const { base, quote } = book.orderBookId;

      buffer[this.serializeKey(base, quote)] = book;

      return buffer;
    }, {});

    return orderBooks;
  }

  /**
   * Get user's order book addresses
   * @param account account address
   */
  public async getUserOrderBooks(account: string): Promise<string[]> {
    const entries = await this.root.api.query.orderBook.userLimitOrders.entries(account);

    return entries.map(([key, _]) => {
      const { base, quote } = key.args[1];
      return this.serializeKey(toAssetId(base), toAssetId(quote));
    });
  }

  /**
   * Creates a subscription that relies on block emitting
   * @param account account address
   * @returns array of book addresses the user is in
   */
  public subscribeOnUserOrderBooks(account: string): Observable<Promise<string[]>> {
    return this.root.system.getBlockNumberObservable().pipe(map(() => this.getUserOrderBooks(account)));
  }

  /**
   * Get observable order book data
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   */
  public getOrderBookObservable(base: string, quote: string): Observable<OrderBook | null> {
    const dexId = this.root.dex.getDexId(quote);

    return this.root.apiRx.query.orderBook
      .orderBooks({ dexId, base, quote })
      .pipe(map((option) => formatOrderBookOption(option)));
  }

  /**
   * Get mappings price to amount of asks
   *
   * Represented as **[[price, amount], [price, amount], ...]**
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param dex (optional) dexId number to avoid unnecessary array search if it's already known before
   */
  public async getAggregatedAsks(base: string, quote: string, dex?: number): Promise<Array<OrderBookPriceVolume>> {
    const dexId = dex ?? this.root.dex.getDexId(quote);
    const data = await this.root.api.query.orderBook.aggregatedAsks({ dexId, base, quote });
    const asks: Array<[FPNumber, FPNumber]> = [];
    data.forEach((value, key) => {
      const price = toFP(key);
      const amount = toFP(value);
      asks.push([price, amount]);
    });
    return asks;
  }

  /**
   * Subscribe on mappings price to amount of asks
   *
   * Represented as **[[price, amount], [price, amount], ...]**
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param dex (optional) dexId number to avoid unnecessary array search if it's already known before
   */
  public subscribeOnAggregatedAsks(base: string, quote: string, dex?: number): Observable<Array<OrderBookPriceVolume>> {
    const dexId = dex ?? this.root.dex.getDexId(quote);
    return this.root.apiRx.query.orderBook.aggregatedAsks({ dexId, base, quote }).pipe(
      map((data) => {
        const asks: Array<[FPNumber, FPNumber]> = [];

        data.forEach((value, key) => {
          const price = toFP(key);
          const amount = toFP(value);
          asks.push([price, amount]);
        });

        return asks;
      })
    );
  }

  /**
   * Get mappings price to amount of bids
   *
   * Represented as **[[price, amount], [price, amount], ...]**
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param dex (optional) dexId number to avoid unnecessary array search if it's already known before
   */
  public async getAggregatedBids(base: string, quote: string, dex?: number): Promise<Array<OrderBookPriceVolume>> {
    const dexId = dex ?? this.root.dex.getDexId(quote);
    const data = await this.root.api.query.orderBook.aggregatedBids({ dexId, base, quote });
    const bids: Array<[FPNumber, FPNumber]> = [];
    data.forEach((value, key) => {
      const price = toFP(key);
      const amount = toFP(value);
      bids.push([price, amount]);
    });
    return bids;
  }

  /**
   * Subscribe on mappings price to amount of bids
   *
   * Represented as **[[price, amount], [price, amount], ...]**
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param dex (optional) dexId number to avoid unnecessary array search if it's already known before
   */
  public subscribeOnAggregatedBids(base: string, quote: string, dex?: number): Observable<Array<OrderBookPriceVolume>> {
    const dexId = dex ?? this.root.dex.getDexId(quote);
    return this.root.apiRx.query.orderBook.aggregatedBids({ dexId, base, quote }).pipe(
      map((data) => {
        const bids: Array<[FPNumber, FPNumber]> = [];

        data.forEach((value, key) => {
          const price = toFP(key);
          const amount = toFP(value);
          bids.push([price, amount]);
        });

        return bids;
      })
    );
  }

  /**
   * Get mappings price to amount of asks and bids
   *
   * Represented as **{ asks: [[price, amount], [price, amount], ...], bids: [[price, amount], [price, amount], ...] }**
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   */
  public async getAggregatedAsksAndBids(base: string, quote: string): Promise<AggregatedOrderBook> {
    const dexId = this.root.dex.getDexId(quote);
    const asks = await this.getAggregatedAsks(base, quote, dexId);
    const bids = await this.getAggregatedBids(base, quote, dexId);

    return { asks, bids };
  }

  /**
   * Get user's limit order ids
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param account account address
   */
  public async getUserLimitOrdersIds(base: string, quote: string, account: string): Promise<Array<number>> {
    const dexId = this.root.dex.getDexId(quote);
    const idsCodec = await this.root.api.query.orderBook.userLimitOrders(account, { dexId, base, quote });
    return (idsCodec.unwrapOrDefault().toJSON() ?? []) as Array<number>;
  }

  /**
   * Get all user's limit order ids
   * @param account account address
   */
  public async getAllUserLimitOrdersIds(account: string): Promise<Array<OrderId>> {
    const data = await this.root.api.query.orderBook.userLimitOrders.entries(account);
    return data.flatMap(([key, value]) => {
      const { base, quote } = key.args[1];
      const baseId = toAssetId(base);
      const quoteId = toAssetId(quote);
      const ids = (value.unwrapOrDefault().toJSON() ?? []) as Array<number>;
      return ids.map<OrderId>((id) => ({ base: baseId, quote: quoteId, id }));
    });
  }

  /**
   * Subscribe on user's limit order ids
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param account account address
   */
  public subscribeOnUserLimitOrdersIds(base: string, quote: string, account: string): Observable<Array<number>> {
    const dexId = this.root.dex.getDexId(quote);
    return this.root.apiRx.query.orderBook
      .userLimitOrders(account, { dexId, base, quote })
      .pipe(map((idsCodec) => idsCodec.unwrapOrDefault().toJSON() as Array<number>));
  }

  private formatLimitOrder(
    orderCodec: Option<OrderBookLimitOrder>,
    base: string,
    quote: string,
    dexId: number
  ): LimitOrder | null {
    if (!orderCodec.isSome) return null;
    const order = orderCodec.unwrap();

    return {
      orderBookId: { dexId, base, quote },
      id: order.id.toNumber(),
      expiresAt: order.expiresAt.toNumber(),
      lifespan: order.lifespan.toNumber(),
      time: order.time.toNumber(),
      owner: order.owner.toString(),
      side: getPriceVariant(order.side),
      price: toFP(order.price),
      amount: toFP(order.amount),
      originalAmount: toFP(order.originalAmount),
    };
  }

  /**
   * Get user's limit order info
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param id limit order id
   * @returns formatted limit order info
   */
  public async getLimitOrder(base: string, quote: string, id: number): Promise<LimitOrder | null> {
    const dexId = this.root.dex.getDexId(quote);
    const orderCodec = await this.root.api.query.orderBook.limitOrders({ dexId, base, quote }, id);

    return this.formatLimitOrder(orderCodec, base, quote, dexId);
  }

  /**
   * Checks for order being available to be placed
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param side order side
   * @param price order price
   */
  public async isOrderPlaceable(base: string, quote: string, side: PriceVariant, price: string): Promise<boolean> {
    const dexId = this.root.dex.getDexId(quote);

    const query = side === PriceVariant.Sell ? this.root.api.query.orderBook.asks : this.root.api.query.orderBook.bids;
    const inner = new FPNumber(price).toCodecBigInt();

    const idsRaw = await query({ dexId, base, quote }, { inner, isDivisible: true });

    return (idsRaw.unwrapOrDefault() ?? []).length < MAX_ORDERS_PER_SINGLE_PRICE;
  }

  /**
   * Subscribe on user's limit order info. You can track the % of filling
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param id limit order id
   */
  public subscribeOnLimitOrder(base: string, quote: string, id: number): Observable<LimitOrder | null> {
    const dexId = this.root.dex.getDexId(quote);
    return this.root.apiRx.query.orderBook
      .limitOrders({ dexId, base, quote }, id)
      .pipe(map((orderCodec) => this.formatLimitOrder(orderCodec, base, quote, dexId)));
  }

  /**
   * Place limit order
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param price order price
   * @param amount order amount
   * @param side buy or sell
   * @param timestamp order expiration
   */
  public placeLimitOrder(
    base: string,
    quote: string,
    price: string,
    amount: string,
    side: PriceVariant,
    timestamp?: number
  ): Promise<T>;
  /**
   * Place limit order
   * @param base base orderbook Asset or AccountAsset structure
   * @param quote quote orderbook Asset or AccountAsset structure
   * @param price order price
   * @param amount order amount
   * @param side buy or sell
   * @param timestamp order expiration
   */
  public placeLimitOrder(
    base: Asset | AccountAsset,
    quote: Asset | AccountAsset,
    price: string,
    amount: string,
    side: PriceVariant,
    timestamp?: number
  ): Promise<T>;
  public placeLimitOrder(
    base: AssetIdOrAsset,
    quote: AssetIdOrAsset,
    price: string,
    amount: string,
    side: PriceVariant,
    timestamp = MAX_TIMESTAMP
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const areAddresses = typeof base === 'string' && typeof quote === 'string';
    const baseAddress = areAddresses ? base : (base as Asset).address;
    const quoteAddress = areAddresses ? quote : (quote as Asset).address;
    const dexId = this.root.dex.getDexId(quoteAddress);

    const historyItem: LimitOrderHistory = {
      type: Operation.OrderBookPlaceLimitOrder,
      assetAddress: baseAddress,
      asset2Address: quoteAddress,
      price,
      amount,
      side,
      limitOrderTimestamp: timestamp,
    };

    if (!areAddresses) {
      historyItem.symbol = (base as unknown as Asset).symbol;
      historyItem.symbol2 = (quote as unknown as Asset).symbol;
    }

    return this.root.submitExtrinsic(
      this.root.api.tx.orderBook.placeLimitOrder(
        { dexId, base: baseAddress, quote: quoteAddress },
        new FPNumber(price).toCodecString(),
        new FPNumber(amount).toCodecString(),
        side,
        timestamp
      ),
      this.root.account.pair,
      historyItem
    );
  }

  /**
   * Cancel one limit order by id
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param orderId number
   */
  public cancelLimitOrder(base: string, quote: string, orderId: number): Promise<T>;
  /**
   * Cancel one limit order by id
   * @param base base orderbook Asset or AccountAsset structure
   * @param quote quote orderbook Asset or AccountAsset structure
   * @param orderId number
   */
  public cancelLimitOrder(base: Asset | AccountAsset, quote: Asset | AccountAsset, orderId: number): Promise<T>;
  public cancelLimitOrder(base: AssetIdOrAsset, quote: AssetIdOrAsset, orderId: number): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const areAddresses = typeof base === 'string' && typeof quote === 'string';
    const baseAddress = areAddresses ? base : (base as Asset).address;
    const quoteAddress = areAddresses ? quote : (quote as Asset).address;
    const dexId = this.root.dex.getDexId(quoteAddress);

    const historyItem: LimitOrderHistory = {
      type: Operation.OrderBookCancelLimitOrder,
      assetAddress: baseAddress,
      asset2Address: quoteAddress,
      limitOrderIds: [orderId],
    };

    if (!areAddresses) {
      historyItem.symbol = (base as unknown as Asset).symbol;
      historyItem.symbol2 = (quote as unknown as Asset).symbol;
    }

    return this.root.submitExtrinsic(
      this.root.api.tx.orderBook.cancelLimitOrder({ dexId, base: baseAddress, quote: quoteAddress }, orderId),
      this.root.account.pair,
      historyItem
    );
  }

  /**
   * Cancel several limit orders at once
   * @param base base orderbook asset ID
   * @param quote quote orderbook asset ID
   * @param orderIds array ids
   */
  public cancelLimitOrderBatch(base: string, quote: string, orderIds: number[]): Promise<T>;
  /**
   * Cancel several limit orders at once
   * @param base base orderbook Asset or AccountAsset structure
   * @param quote quote orderbook Asset or AccountAsset structure
   * @param orderIds array ids
   */
  public cancelLimitOrderBatch(base: Asset | AccountAsset, quote: Asset | AccountAsset, orderIds: number[]): Promise<T>;
  public cancelLimitOrderBatch(base: AssetIdOrAsset, quote: AssetIdOrAsset, orderIds: number[]): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    const areAddresses = typeof base === 'string' && typeof quote === 'string';
    const baseAddress = areAddresses ? base : (base as Asset).address;
    const quoteAddress = areAddresses ? quote : (quote as Asset).address;
    const dexId = this.root.dex.getDexId(quoteAddress);

    const historyItem: LimitOrderHistory = {
      type: Operation.OrderBookCancelLimitOrders,
      assetAddress: baseAddress,
      asset2Address: quoteAddress,
      limitOrderIds: orderIds,
    };

    if (!areAddresses) {
      historyItem.symbol = (base as unknown as Asset).symbol;
      historyItem.symbol2 = (quote as unknown as Asset).symbol;
    }

    return this.root.submitExtrinsic(
      this.root.api.tx.orderBook.cancelLimitOrdersBatch([
        [{ dexId, base: baseAddress, quote: quoteAddress }, orderIds],
      ]),
      this.root.account.pair,
      historyItem
    );
  }

  /** {baseAssetId},{quoteAssetId} serialization */
  public serializeKey(base: string, quote: string): string {
    if (!(base && quote)) return '';
    return `${base},${quote}`;
  }

  /** {baseAssetId},{quoteAssetId} deserialization -> { base: string; quote: string; } */
  public deserializeKey(key: string): Partial<{ base: string; quote: string }> | null {
    if (!key) return null;
    const [base, quote] = key.split(',');
    return { base, quote };
  }

  /**
   * Estimates the min and max network fees for Place Limit Order operation.
   *
   * **Before the usage** you need to execute `calcStaticNetworkFees` method.
   *
   * Uses the same approach with the SORA blockchain.
   *
   * @see https://github.com/sora-xor/sora2-network/blob/cf0988e4a99384cdf7e6cf438fc26a0088fd6c75/pallets/order-book/src/fee_calculator.rs#L53C15-L53C15
   *
   * If the TX will fail or the order will become market order the `max` fee will be used.
   * Otherwise, `min` fee should be used.
   */
  public estimatePlaceOrderNetworkFee(timestamp = MAX_TIMESTAMP): { max: number; min: number } {
    const baseFee = FPNumber.fromCodecValue(this.root.NetworkFee.OrderBookPlaceLimitOrder);
    const marketMakerMaxFee = baseFee.div(FPNumber.TWO).toNumber(0);

    if (timestamp < MAX_TIMESTAMP) {
      const lifeRatio = timestamp / MAX_TIMESTAMP;
      const part = marketMakerMaxFee / 7;

      const constPart = part * 4;
      const dynamicPart = part * 3 * lifeRatio;

      return { max: baseFee.toNumber(0), min: Math.floor(constPart + dynamicPart) };
    } else {
      return { max: baseFee.toNumber(0), min: marketMakerMaxFee };
    }
  }
}
