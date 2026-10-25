export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
};

export type Edge<T> = {
  cursor: string;
  node: T;
};

export type QueryData<T> = {
  data: T;
};

export type QueryResponseNodes<T> = {
  nodes: T[];
  totalCount: number;
};

export type ConnectionQueryResponseData<T> = {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
};

export type ConnectionQueryResponse<T> = QueryData<ConnectionQueryResponseData<T>>;

export type SubscriptionPayload<T> = {
  payload: T;
};
