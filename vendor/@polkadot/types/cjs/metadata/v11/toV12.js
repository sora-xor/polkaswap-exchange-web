'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.toV12 = toV12;
var _util = require('@polkadot/util');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @internal
 **/
function toV12(registry, _ref) {
  let { extrinsic, modules } = _ref;
  return registry.createTypeUnsafe('MetadataV12', [
    {
      extrinsic,
      modules: modules.map((mod) =>
        registry.createTypeUnsafe('ModuleMetadataV12', [
          (0, _util.objectSpread)({}, mod, {
            index: 255,
          }),
        ])
      ),
    },
  ]);
}
