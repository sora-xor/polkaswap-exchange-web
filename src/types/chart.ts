/** "open", "close", "low", "high" data */
export type OCLH = [number, number, number, number];

export type SnapshotItem = {
  timestamp: number;
  price: OCLH;
};
