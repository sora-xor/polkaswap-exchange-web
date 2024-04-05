/** "open", "close", "low", "high" data */
export type OCLH = [number, number, number, number];

export type SnapshotItem = {
  timestamp: number;
  price: OCLH;
  volume: number;
};

/** price, total amount, delta price percent data */
export type DepthChartStep = [number, number, number];

export type DepthChartData = {
  buy: Array<DepthChartStep>;
  sell: Array<DepthChartStep>;
  minBidPrice: number;
  maxAskPrice: number;
};
