// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @internal
 **/
export function toV13(registry, metadata) {
  return registry.createTypeUnsafe('MetadataV13', [metadata]);
}
