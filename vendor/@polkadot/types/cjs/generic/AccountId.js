'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.GenericAccountId33 = exports.GenericAccountId = void 0;
var _typesCodec = require('@polkadot/types-codec');
var _util = require('@polkadot/util');
var _utilCrypto = require('@polkadot/util-crypto');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

/** @internal */
function decodeAccountId(value) {
  if ((0, _util.isU8a)(value) || Array.isArray(value)) {
    return (0, _util.u8aToU8a)(value);
  } else if (!value) {
    return new Uint8Array();
  } else if ((0, _util.isHex)(value)) {
    return (0, _util.hexToU8a)(value);
  } else if ((0, _util.isString)(value)) {
    return (0, _utilCrypto.decodeAddress)(value.toString());
  }
  throw new Error(`Unknown type passed to AccountId constructor, found typeof ${typeof value}`);
}
class BaseAccountId extends _typesCodec.U8aFixed {
  constructor(registry) {
    let allowedBits = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 256 | 264;
    let value = arguments.length > 2 ? arguments[2] : undefined;
    const decoded = decodeAccountId(value);
    const decodedBits = decoded.length * 8;

    // Part of stream containing >= 32 bytes or a all empty (defaults)
    if (decodedBits < allowedBits && decoded.some((b) => b)) {
      throw new Error(`Invalid AccountId provided, expected ${allowedBits >> 3} bytes, found ${decoded.length}`);
    }
    super(registry, decoded, allowedBits);
  }

  /**
   * @description Compares the value of the input to see if there is a match
   */
  eq(other) {
    return super.eq(decodeAccountId(other));
  }

  /**
   * @description Converts the Object to to a human-friendly JSON, with additional fields, expansion and formatting of information
   */
  toHuman() {
    return this.toJSON();
  }

  /**
   * @description Converts the Object to JSON, typically used for RPC transfers
   */
  toJSON() {
    return this.toString();
  }

  /**
   * @description Converts the value in a best-fit primitive form
   */
  toPrimitive() {
    return this.toJSON();
  }

  /**
   * @description Returns the string representation of the value
   */
  toString() {
    return (0, _utilCrypto.encodeAddress)(this, this.registry.chainSS58);
  }

  /**
   * @description Returns the base runtime type name for this instance
   */
  toRawType() {
    return 'AccountId';
  }
}

/**
 * @name GenericAccountId
 * @description
 * A wrapper around an AccountId/PublicKey representation. Since we are dealing with
 * underlying PublicKeys (32 bytes in length), we extend from U8aFixed which is
 * just a Uint8Array wrapper with a fixed length.
 */
class GenericAccountId extends BaseAccountId {
  constructor(registry, value) {
    super(registry, 256, value);
  }
}
exports.GenericAccountId = GenericAccountId;
class GenericAccountId33 extends BaseAccountId {
  constructor(registry, value) {
    super(registry, 264, value);
  }
}
exports.GenericAccountId33 = GenericAccountId33;
