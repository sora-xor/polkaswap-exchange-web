import type { CodecString } from '@/lib/substrate/sdk';
import type { Asset } from '@/lib/substrate/sdk/assets/types';
import type { Nullable } from '@/types/common';

export type OwnedAsset = Asset & { fiat: Nullable<CodecString> };
