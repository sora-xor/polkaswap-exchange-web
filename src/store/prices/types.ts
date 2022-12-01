export type PriceState = {
  price: string | undefined;
  priceReversed: string | undefined;
};

export type PricesPayload = Partial<{
  assetAAddress: string;
  assetBAddress: string;
  amountA: string;
  amountB: string;
}>;
