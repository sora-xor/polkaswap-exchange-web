'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.Float = void 0;
var _util = require('@polkadot/util');
// Copyright 2017-2023 @polkadot/types-codec authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name Float
 * @description
 * A Codec wrapper for F32 & F64 values. You generally don't want to be using
 * f32/f64 in your runtime, operations on fixed points numbers are preferable. This class
 * was explicitly added since scale-codec has a flag that enables this and it is available
 * in some eth_* RPCs
 */
class Float extends Number {
  #bitLength;
  constructor(registry, value) {
    let { bitLength = 32 } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    super(
      (0, _util.isU8a)(value) || (0, _util.isHex)(value)
        ? value.length === 0
          ? 0
          : (0, _util.u8aToFloat)((0, _util.u8aToU8a)(value), {
              bitLength,
            })
        : value || 0
    );
    this.#bitLength = bitLength;
    this.encodedLength = bitLength / 8;
    this.initialU8aLength = this.encodedLength;
    this.registry = registry;
  }
  static with(bitLength) {
    return class extends Float {
      constructor(registry, value) {
        super(registry, value, {
          bitLength,
        });
      }
    };
  }

  /**
   * @description returns a hash of the contents
   */
  get hash() {
    return this.registry.hash(this.toU8a());
  }

  /**
   * @description Returns true if the type wraps an empty/default all-0 value
   */
  get isEmpty() {
    return this.valueOf() === 0;
  }

  /**
   * @description Compares the value of the input to see if there is a match
   */
  eq(other) {
    return this.valueOf() === Number(other);
  }

  /**
   * @description Returns a breakdown of the hex encoding for this Codec
   */
  inspect() {
    return {
      outer: [this.toU8a()],
    };
  }

  /**
   * @description Returns a hex string representation of the value
   */
  toHex() {
    return (0, _util.u8aToHex)(this.toU8a());
  }

  /**
   * @description Converts the Object to to a human-friendly JSON, with additional fields, expansion and formatting of information
   */
  toHuman() {
    return this.toString();
  }

  /**
   * @description Converts the Object to JSON, typically used for RPC transfers
   */
  toJSON() {
    // Not sure if this is actually a hex or a string value
    // (would need to check against RPCs to see the result here)
    return this.toHex();
  }

  /**
   * @description Returns the number representation (Same as valueOf)
   */
  toNumber() {
    return this.valueOf();
  }

  /**
   * @description Converts the value in a best-fit primitive form
   */
  toPrimitive() {
    return this.toNumber();
  }

  /**
   * @description Returns the base runtime type name for this instance
   */
  toRawType() {
    return `f${this.#bitLength}`;
  }

  /**
   * @description Encodes the value as a Uint8Array as per the SCALE specifications
   */
  toU8a() {
    return (0, _util.floatToU8a)(this, {
      bitLength: this.#bitLength,
    });
  }
}
exports.Float = Float;
