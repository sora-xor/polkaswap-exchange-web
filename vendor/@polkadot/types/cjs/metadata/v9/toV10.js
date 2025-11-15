'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.toV10 = toV10;
var _util = require('@polkadot/util');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

// migrate a storage hasher type
// see https://github.com/paritytech/substrate/pull/4462
/** @internal */
function createStorageHasher(registry, hasher) {
  // Blake2_128_Concat has been added at index 2, so we increment all the
  // indexes greater than 2
  if (hasher.toNumber() >= 2) {
    return registry.createTypeUnsafe('StorageHasherV10', [hasher.toNumber() + 1]);
  }
  return registry.createTypeUnsafe('StorageHasherV10', [hasher]);
}

/** @internal */
function createStorageType(registry, entryType) {
  if (entryType.isMap) {
    return [
      (0, _util.objectSpread)({}, entryType.asMap, {
        hasher: createStorageHasher(registry, entryType.asMap.hasher),
      }),
      1,
    ];
  }
  if (entryType.isDoubleMap) {
    return [
      (0, _util.objectSpread)({}, entryType.asDoubleMap, {
        hasher: createStorageHasher(registry, entryType.asDoubleMap.hasher),
        key2Hasher: createStorageHasher(registry, entryType.asDoubleMap.key2Hasher),
      }),
      2,
    ];
  }
  return [entryType.asPlain, 0];
}

/** @internal */
function convertModule(registry, mod) {
  const storage = mod.storage.unwrapOr(null);
  return registry.createTypeUnsafe('ModuleMetadataV10', [
    (0, _util.objectSpread)({}, mod, {
      storage: storage
        ? (0, _util.objectSpread)({}, storage, {
            items: storage.items.map((item) =>
              (0, _util.objectSpread)({}, item, {
                type: registry.createTypeUnsafe('StorageEntryTypeV10', createStorageType(registry, item.type)),
              })
            ),
          })
        : null,
    }),
  ]);
}

/** @internal */
function toV10(registry, _ref) {
  let { modules } = _ref;
  return registry.createTypeUnsafe('MetadataV10', [
    {
      modules: modules.map((mod) => convertModule(registry, mod)),
    },
  ]);
}
