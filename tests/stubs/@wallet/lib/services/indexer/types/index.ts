export type ConnectionQueryResponse<T = unknown> = {
  totalCount?: number;
  edges?: Array<{ node: T }>;
};

export type OrderStatus = 'Filled' | 'PartialFill' | 'Cancelled' | 'Unknown';

export type PoolXYKEntity = {
  poolId: string;
  reserves: string;
};
