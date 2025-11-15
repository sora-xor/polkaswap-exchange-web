import type { Asset } from '../assets/types';

export type SoulBoundToken = Asset & {
  externalUrl?: string;
  issuedAt?: string;
  regulatedAssets: string[];
};
