'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.registerDefinitions = registerDefinitions;
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

function registerDefinitions(registry, extras) {
  Object.values(extras).forEach((def) => {
    Object.values(def).forEach((_ref) => {
      let { types } = _ref;
      registry.register(types);
    });
  });
}
