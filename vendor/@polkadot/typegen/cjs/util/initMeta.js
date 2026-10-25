'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.initMeta = initMeta;
var _types = require('@polkadot/types');
var _register = require('./register');
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

function initMeta(staticMeta) {
  let extraTypes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const registry = new _types.TypeRegistry();
  (0, _register.registerDefinitions)(registry, extraTypes);
  const metadata = new _types.Metadata(registry, staticMeta);
  registry.setMetadata(metadata);
  return {
    metadata,
    registry,
  };
}
