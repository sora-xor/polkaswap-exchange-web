'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.MagicNumber = exports.MAGIC_NUMBER = void 0;
var _typesCodec = require('@polkadot/types-codec');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const MAGIC_NUMBER = 0x6174656d; // `meta`, reversed for Little Endian encoding
exports.MAGIC_NUMBER = MAGIC_NUMBER;
class MagicNumber extends _typesCodec.U32 {
  constructor(registry, value) {
    super(registry, value);
    if (!this.isEmpty && !this.eq(MAGIC_NUMBER)) {
      throw new Error(
        `MagicNumber mismatch: expected ${registry.createTypeUnsafe('u32', [MAGIC_NUMBER]).toHex()}, found ${this.toHex()}`
      );
    }
  }
}
exports.MagicNumber = MagicNumber;
