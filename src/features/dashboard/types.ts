import type { CodecString } from '@sora-substrate/sdk';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

export type OwnedAsset = Asset & { fiat: Nullable<CodecString> };
