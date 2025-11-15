import type { SubmittableExtrinsic as SubmittableExtrinsicBase } from '../submittable/types';
import type {
  QueryableStorageEntry as QueryableStorageEntryBase,
  SubmittableExtrinsicFunction as SubmittableExtrinsicFunctionBase,
} from '../types';
export type QueryableStorageEntry = QueryableStorageEntryBase<'promise'>;
export type SubmittableExtrinsic = SubmittableExtrinsicBase<'promise'>;
export type SubmittableExtrinsicFunction = SubmittableExtrinsicFunctionBase<'promise'>;
