import { FPNumber } from '@sora-substrate/math';

import { LiquiditySourceTypes, Errors } from '../../../consts';
import { SwapChunk } from '../../../common/primitives';

// Cluster of liquidity that stores the aggregated liquidity chunks from one source.
export class Cluster {
  public total!: SwapChunk;
  public chunks!: SwapChunk[];

  constructor() {
    this.total = SwapChunk.default();
    this.chunks = [];
  }

  public getTotal(): SwapChunk {
    return this.total;
  }

  public pushBack(chunk: SwapChunk) {
    this.chunks.push(chunk);
    this.total = this.total.saturatingAdd(chunk);
  }

  public popBack(): SwapChunk | null {
    const chunk = this.chunks.pop();

    if (!chunk) return null;

    this.total = this.total.saturatingSub(chunk);
    return chunk;
  }

  public isEmpty(): boolean {
    return this.chunks.length === 0;
  }
}

export class Aggregation extends Map<LiquiditySourceTypes, Cluster> {
  public getTotal(source: LiquiditySourceTypes): SwapChunk {
    const cluster = this.get(source);

    if (!cluster) return SwapChunk.default();

    return cluster.getTotal();
  }

  public getMutCluster(source: LiquiditySourceTypes): Cluster {
    const cluster = this.get(source);

    if (!cluster) throw new Error(Errors.AggregationError);

    return cluster;
  }

  public pushChunk(source: LiquiditySourceTypes, chunk: SwapChunk) {
    let cluster = this.get(source);

    if (cluster) {
      cluster.pushBack(chunk);
    } else {
      cluster = new Cluster();
      cluster.pushBack(chunk);
      this.set(source, cluster);
    }
  }

  // Returns the queue with sources in ascending order
  public getTotalPriceAscendingQueue(): LiquiditySourceTypes[] {
    const queue: [LiquiditySourceTypes, FPNumber][] = [];

    for (const [source, cluster] of this.entries()) {
      queue.push([source, cluster.getTotal().price]);
    }

    const sorted = queue.sort(([, priceLeft], [, priceRight]) => {
      if (FPNumber.isGreaterThan(priceLeft, priceRight)) return 1;
      if (FPNumber.isLessThan(priceLeft, priceRight)) return -1;
      return 0;
    });

    return sorted.map(([source]) => source);
  }
}
