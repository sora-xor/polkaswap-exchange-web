// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Metadata, TypeRegistry } from '@polkadot/types';
import { registerDefinitions } from './register.js';
export function initMeta(staticMeta, extraTypes = {}) {
  const registry = new TypeRegistry();
  registerDefinitions(registry, extraTypes);
  const metadata = new Metadata(registry, staticMeta);
  registry.setMetadata(metadata);
  return {
    metadata,
    registry,
  };
}
