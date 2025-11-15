import {
  typesBundle as soraTypesBundle,
  types as soraTypes,
  typesAlias as soraTypeAlias,
  rpc as soraRpc,
} from '@sora-substrate/type-definitions';
import {
  OverrideBundleType,
  OverrideModuleType,
  RegistryTypes,
  DefinitionRpc,
  DefinitionRpcSub,
} from '@polkadot/types/types';

import './interfaces/augment-api';
import './interfaces/augment-api-consts';
import './interfaces/augment-api-query';
import './interfaces/augment-api-tx';
import './interfaces/augment-types';

export * from './interfaces';
export * from './interfaces/augment-api-mobx';

export const types: RegistryTypes = soraTypes;

export const rpc: Record<string, Record<string, DefinitionRpc | DefinitionRpcSub>> = soraRpc;

export const typesAlias: Record<string, OverrideModuleType> = soraTypeAlias;

export const typesBundle = soraTypesBundle as OverrideBundleType;
