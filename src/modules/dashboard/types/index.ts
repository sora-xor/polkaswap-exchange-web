import type { CodecString } from '@/lib/substrate/sdk';
import type { Asset } from '@/lib/substrate/sdk/assets/types';

export type OwnedAsset = Asset & { fiat: Nullable<CodecString> };
