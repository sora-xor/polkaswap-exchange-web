'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.WrapperKeepOpaque = void 0;
var _util = require('@polkadot/util');
var _Raw = require('../native/Raw');
var _utils = require('../utils');
var _Bytes = require('./Bytes');
// Copyright 2017-2023 @polkadot/types-codec authors & contributors
// SPDX-License-Identifier: Apache-2.0

function decodeRaw(registry, typeName, value) {
  const Type = (0, _utils.typeToConstructor)(registry, typeName);
  if ((0, _util.isU8a)(value) || (0, _util.isHex)(value)) {
    try {
      const [, u8a] = (0, _util.isHex)(value)
        ? [0, (0, _util.u8aToU8a)(value)]
        : value instanceof _Raw.Raw
          ? [0, value.subarray()]
          : (0, _util.compactStripLength)(value);
      return [Type, new Type(registry, u8a), value];
    } catch {
      return [Type, null, value];
    }
  }
  const instance = new Type(registry, value);
  return [Type, instance, (0, _util.compactAddLength)(instance.toU8a())];
}
class WrapperKeepOpaque extends _Bytes.Bytes {
  #Type;
  #decoded;
  #opaqueName;
  constructor(registry, typeName, value) {
    let { opaqueName = 'WrapperKeepOpaque' } = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    const [Type, decoded, u8a] = decodeRaw(registry, typeName, value);
    super(registry, u8a);
    this.#Type = Type;
    this.#decoded = decoded;
    this.#opaqueName = opaqueName;
  }
  static with(Type) {
    return class extends WrapperKeepOpaque {
      constructor(registry, value) {
        super(registry, Type, value);
      }
    };
  }

  /**
   * @description Checks if the wrapper is decodable
   */
  get isDecoded() {
    return !!this.#decoded;
  }

  /**
   * @description Returns a breakdown of the hex encoding for this Codec
   */
  inspect() {
    return this.#decoded
      ? {
          inner: [this.#decoded.inspect()],
          outer: [(0, _util.compactToU8a)(this.length)],
        }
      : {
          outer: [(0, _util.compactToU8a)(this.length), this.toU8a(true)],
        };
  }

  /**
   * @description Converts the Object to to a human-friendly JSON, with additional fields, expansion and formatting of information
   */
  toHuman(isExtended) {
    return this.#decoded ? this.#decoded.toHuman(isExtended) : super.toHuman();
  }

  /**
   * @description Converts the value in a best-fit primitive form
   */
  toPrimitive() {
    return this.#decoded ? this.#decoded.toPrimitive() : super.toPrimitive();
  }

  /**
   * @description Returns the base runtime type name for this instance
   */
  toRawType() {
    return `${this.#opaqueName}<${this.registry.getClassName(this.#Type) || (this.#decoded ? this.#decoded.toRawType() : new this.#Type(this.registry).toRawType())}>`;
  }

  /**
   * @description Converts the Object to to a string (either decoded or bytes)
   */
  toString() {
    return this.#decoded ? this.#decoded.toString() : super.toString();
  }

  /**
   * @description Returns the decoded that the WrapperKeepOpaque represents (if available), throws if non-decodable
   */
  unwrap() {
    if (!this.#decoded) {
      throw new Error(`${this.#opaqueName}: unwrapping an undecodable value`);
    }
    return this.#decoded;
  }
}
exports.WrapperKeepOpaque = WrapperKeepOpaque;
