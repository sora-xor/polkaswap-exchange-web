export type PriceState = {
  price: string;
  priceReversed: string;
};

export type PricesPayload = Partial<{
  assetAAddress: string;
  assetBAddress: string;
  amountA: string;
  amountB: string;
}>;
