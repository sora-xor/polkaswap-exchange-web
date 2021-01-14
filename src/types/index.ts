// TODO: Change to AccountAsset from @sora-substrate/util for all places
export interface Token {
  name: string;
  symbol: string;
  address: string;
  balance: number;
  price: number;
  priceChange: number;
}
