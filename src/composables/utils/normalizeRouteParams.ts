import type { Nullable } from '@/types/common';

type RawParams = Nullable<Record<string, unknown>>;

type NormalizedParams = { first?: string; second?: string };

export function normalizeRouteParams(params: RawParams): NormalizedParams {
  if (!params || typeof params !== 'object') {
    return { first: undefined, second: undefined };
  }

  const first = typeof params.first === 'string' ? params.first : undefined;
  const second = typeof params.second === 'string' ? params.second : undefined;

  return { first, second };
}
