import type { CodecString } from '@sora-substrate/util';
import type { Asset } from '@sora-substrate/util/build/assets/types';

export type OwnedAsset = Asset & { fiat: Nullable<CodecString> };

export type AssetCreationType = 'new' | 'existing';
