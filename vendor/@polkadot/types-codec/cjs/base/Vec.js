'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.Vec = void 0;
exports.decodeVec = decodeVec;
var _util = require('@polkadot/util');
var _Array = require('../abstract/Array');
var _utils = require('../utils');
// Copyright 2017-2023 @polkadot/types-codec authors & contributors
// SPDX-License-Identifier: Apache-2.0

const MAX_LENGTH = 64 * 1024;
const l = (0, _util.logger)('Vec');
function noopSetDefinition(d) {
  return d;
}
function decodeVecLength(value) {
  if (Array.isArray(value)) {
    return [value, value.length, 0];
  } else if ((0, _util.isU8a)(value) || (0, _util.isHex)(value)) {
    const u8a = (0, _util.u8aToU8a)(value);
    const [startAt, length] = (0, _util.compactFromU8aLim)(u8a);
    if (length > MAX_LENGTH) {
      throw new Error(`Vec length ${length.toString()} exceeds ${MAX_LENGTH}`);
    }
    return [u8a, length, startAt];
  } else if (!value) {
    return [null, 0, 0];
  }
  throw new Error(`Expected array/hex input to Vec<*> decoding, found ${typeof value}: ${(0, _util.stringify)(value)}`);
}
function decodeVec(registry, result, value, startAt, Type) {
  if (Array.isArray(value)) {
    const count = result.length;
    for (let i = 0; i < count; i++) {
      // 26/08/2022 this is actually a false positive - after recent eslint upgdates
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const entry = value[i];
      try {
        result[i] = entry instanceof Type ? entry : new Type(registry, entry);
      } catch (error) {
        l.error(`Unable to decode on index ${i}`, error.message);
        throw error;
      }
    }
    return [0, 0];
  } else if (!value) {
    return [0, 0];
  }

  // we don't need more checks, we already limited it via the length decoding
  return (0, _utils.decodeU8aVec)(registry, result, (0, _util.u8aToU8a)(value), startAt, Type);
}

/**
 * @name Vec
 * @description
 * This manages codec arrays. Internally it keeps track of the length (as decoded) and allows
 * construction with the passed `Type` in the constructor. It is an extension to Array, providing
 * specific encoding/decoding on top of the base type.
 */
class Vec extends _Array.AbstractArray {
  #Type;
  constructor(registry, Type) {
    let value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    let { definition, setDefinition = noopSetDefinition } =
      arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    const [decodeFrom, length, startAt] = decodeVecLength(value);
    super(registry, length);
    this.#Type = definition || setDefinition((0, _utils.typeToConstructor)(registry, Type));
    this.initialU8aLength = (
      (0, _util.isU8a)(decodeFrom)
        ? (0, _utils.decodeU8aVec)(registry, this, decodeFrom, startAt, this.#Type)
        : decodeVec(registry, this, decodeFrom, startAt, this.#Type)
    )[0];
  }
  static with(Type) {
    let definition;

    // eslint-disable-next-line no-return-assign
    const setDefinition = (d) => (definition = d);
    return class extends Vec {
      constructor(registry, value) {
        super(registry, Type, value, {
          definition,
          setDefinition,
        });
      }
    };
  }

  /**
   * @description The type for the items
   */
  get Type() {
    return this.#Type.name;
  }

  /**
   * @description Finds the index of the value in the array
   */
  indexOf(_other) {
    // convert type first, this removes overhead from the eq
    const other = _other instanceof this.#Type ? _other : new this.#Type(this.registry, _other);
    for (let i = 0; i < this.length; i++) {
      if (other.eq(this[i])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * @description Returns the base runtime type name for this instance
   */
  toRawType() {
    return `Vec<${this.registry.getClassName(this.#Type) || new this.#Type(this.registry).toRawType()}>`;
  }
}
exports.Vec = Vec;
