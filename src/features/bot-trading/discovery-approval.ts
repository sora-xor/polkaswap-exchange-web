import type { DiscoveryFinalist } from './discovery';

/** Review form data is transient; the controller recomputes every spend limit before signing. */
export interface DiscoveryApproval {
  finalists: DiscoveryFinalist[];
  values: Record<
    string,
    {
      allocation: string;
      orderLimit: string;
      feeBudgetXor: string;
      maxDrawdownPercent: string;
    }
  >;
  sharedCapXor: string;
  password: string;
}
