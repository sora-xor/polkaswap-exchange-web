import { PolkaswapMutationTypes } from './polkaswap';

import type { SubscriptionPayload } from '../../types';

export type PolkaswapSubscriptionPayload<T> = SubscriptionPayload<{
  id: string;
  mutation_type: PolkaswapMutationTypes;
  _entity: T;
}>;
