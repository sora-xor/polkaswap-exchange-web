import { SubqueryMutationTypes } from './subquery';
import { SubscriptionPayload } from '../../types';

export type SubquerySubscriptionPayload<T> = SubscriptionPayload<{
  id: string;
  mutation_type: SubqueryMutationTypes;
  _entity: T;
}>;
