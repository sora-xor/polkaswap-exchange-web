'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.toCallsOnly = toCallsOnly;
var _util = require('@polkadot/util');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

function trimDocs(docs) {
  const strings = docs.map((d) => d.toString().trim());
  const firstEmpty = strings.findIndex((d) => !d.length);
  return firstEmpty === -1 ? strings : strings.slice(0, firstEmpty);
}

/** @internal */
function toCallsOnly(registry, _ref) {
  let { extrinsic, lookup, pallets } = _ref;
  return registry
    .createTypeUnsafe('MetadataLatest', [
      {
        extrinsic,
        lookup: {
          types: lookup.types.map((_ref2) => {
            let { id, type } = _ref2;
            return registry.createTypeUnsafe('PortableType', [
              {
                id,
                type: (0, _util.objectSpread)({}, type, {
                  docs: trimDocs(type.docs),
                }),
              },
            ]);
          }),
        },
        pallets: pallets.map((_ref3) => {
          let { calls, index, name } = _ref3;
          return {
            calls: registry.createTypeUnsafe('Option<PalletCallMetadataLatest>', [calls.unwrapOr(null)]),
            index,
            name,
          };
        }),
      },
    ])
    .toJSON();
}
