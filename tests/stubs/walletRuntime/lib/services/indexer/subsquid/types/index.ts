export type SubsquidPoolXYKEntity = {
  poolId: string;
};

export type SubsquidQueryResponse<T = unknown> = {
  nodes: T[];
};
