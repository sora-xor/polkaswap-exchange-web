// Copyright 2017-2023 @polkadot/api authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isUndefined } from '@polkadot/util';
function sig({ lookup }, { method, section }, args) {
  return `${section}.${method}(${args.map((a) => lookup.getTypeDef(a).type).join(', ')})`;
}

// sets up the arguments in the form of [creator, args] ready to be used in a storage
// call. Additionally, it verifies that the correct number of arguments have been passed
export function extractStorageArgs(registry, creator, _args) {
  const args = _args.filter((a) => !isUndefined(a));
  if (creator.meta.type.isPlain) {
    if (args.length !== 0) {
      throw new Error(`${sig(registry, creator, [])} does not take any arguments, ${args.length} found`);
    }
  } else {
    const { hashers, key } = creator.meta.type.asMap;
    const keys = hashers.length === 1 ? [key] : registry.lookup.getSiType(key).def.asTuple.map((t) => t);
    if (args.length !== keys.length) {
      throw new Error(
        `${sig(registry, creator, keys)} is a map, requiring ${keys.length} arguments, ${args.length} found`
      );
    }
  }

  // pass as tuple
  return [creator, args];
}
