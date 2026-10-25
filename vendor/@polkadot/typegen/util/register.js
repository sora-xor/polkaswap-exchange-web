// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

export function registerDefinitions(registry, extras) {
  Object.values(extras).forEach((def) => {
    Object.values(def).forEach(({ types }) => {
      registry.register(types);
    });
  });
}
