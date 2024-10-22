import type { CodecString } from '@sora-substrate/sdk';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export type OwnedAsset = Asset & { fiat: Nullable<CodecString> };

export type AssetCreationType = 'new' | 'existing';
