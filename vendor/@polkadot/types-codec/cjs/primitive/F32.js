'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.f32 = void 0;
var _Float = require('../native/Float');
// Copyright 2017-2023 @polkadot/types-codec authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name f32
 * @description
 * A 32-bit float
 */
class f32 extends _Float.Float.with(32) {
  // NOTE without this, we cannot properly determine extensions
  __FloatType = 'f32';
}
exports.f32 = f32;
