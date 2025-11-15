import type { U8aFixed, Struct } from '@polkadot/types-codec';

// This import doesn't work in some client apps so it's better to override it on high level
// import type { CommonPrimitivesAssetId32 } from '@polkadot/types/lookup';
export interface CommonPrimitivesAssetId32Override extends Struct {
  readonly code: U8aFixed;
}
