'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.f64 = void 0;
var _Float = require('../native/Float');
// Copyright 2017-2023 @polkadot/types-codec authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name f64
 * @description
 * A 64-bit float
 */
class f64 extends _Float.Float.with(64) {
  // NOTE without this, we cannot properly determine extensions
  __FloatType = 'f64';
}
exports.f64 = f64;
