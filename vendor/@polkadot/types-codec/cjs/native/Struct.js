'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.Struct = void 0;
var _util = require('@polkadot/util');
var _utils = require('../utils');
// Copyright 2017-2023 @polkadot/types-codec authors & contributors
// SPDX-License-Identifier: Apache-2.0

function noopSetDefinition(d) {
  return d;
}

/** @internal */
function decodeStructFromObject(registry, _ref, value, jsonMap) {
  let [Types, keys] = _ref;
  let jsonObj;
  const typeofArray = Array.isArray(value);
  const typeofMap = value instanceof Map;
  if (!typeofArray && !typeofMap && !(0, _util.isObject)(value)) {
    throw new Error(
      `Struct: Cannot decode value ${(0, _util.stringify)(value)} (typeof ${typeof value}), expected an input object, map or array`
    );
  } else if (typeofArray && value.length !== keys.length) {
    throw new Error(
      `Struct: Unable to map ${(0, _util.stringify)(value)} array to object with known keys ${keys.join(', ')}`
    );
  }
  const raw = new Array(keys.length);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const jsonKey = jsonMap.get(key) || key;
    const Type = Types[i];
    let assign;
    try {
      if (typeofArray) {
        assign = value[i];
      } else if (typeofMap) {
        assign = jsonKey && value.get(jsonKey);
      } else {
        assign = jsonKey && value[jsonKey];
        if ((0, _util.isUndefined)(assign)) {
          if ((0, _util.isUndefined)(jsonObj)) {
            const entries = Object.entries(value);
            jsonObj = {};
            for (let e = 0; e < entries.length; e++) {
              jsonObj[(0, _util.stringCamelCase)(entries[e][0])] = entries[e][1];
            }
          }
          assign = jsonKey && jsonObj[jsonKey];
        }
      }
      raw[i] = [key, assign instanceof Type ? assign : new Type(registry, assign)];
    } catch (error) {
      let type = Type.name;
      try {
        type = new Type(registry).toRawType();
      } catch (error) {
        // ignore
      }
      throw new Error(`Struct: failed on ${jsonKey}: ${type}:: ${error.message}`);
    }
  }
  return [raw, 0];
}

/**
 * @name Struct
 * @description
 * A Struct defines an Object with key-value pairs - where the values are Codec values. It removes
 * a lot of repetition from the actual coding, define a structure type, pass it the key/Codec
 * values in the constructor and it manages the decoding. It is important that the constructor
 * values matches 100% to the order in th Rust code, i.e. don't go crazy and make it alphabetical,
 * it needs to decoded in the specific defined order.
 * @noInheritDoc
 */
class Struct extends Map {
  #jsonMap;
  #Types;
  constructor(registry, Types, value) {
    let jsonMap = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : new Map();
    let { definition, setDefinition = noopSetDefinition } =
      arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    const typeMap = definition || setDefinition((0, _utils.mapToTypeMap)(registry, Types));
    const [decoded, decodedLength] =
      (0, _util.isU8a)(value) || (0, _util.isHex)(value)
        ? (0, _utils.decodeU8aStruct)(registry, new Array(typeMap[0].length), (0, _util.u8aToU8a)(value), typeMap)
        : value instanceof Struct
          ? [value, 0]
          : decodeStructFromObject(registry, typeMap, value || {}, jsonMap);
    super(decoded);
    this.initialU8aLength = decodedLength;
    this.registry = registry;
    this.#jsonMap = jsonMap;
    this.#Types = typeMap;
  }
  static with(Types, jsonMap) {
    var _class;
    let definition;

    // eslint-disable-next-line no-return-assign
    const setDefinition = (d) => (definition = d);
    return (
      (_class = class extends Struct {
        constructor(registry, value) {
          super(registry, Types, value, jsonMap, {
            definition,
            setDefinition,
          });
        }
      }),
      (() => {
        const keys = Object.keys(Types);
        (0, _util.objectProperties)(_class.prototype, keys, (k, _, self) => self.get(k));
      })(),
      _class
    );
  }

  /**
   * @description The available keys for this struct
   */
  get defKeys() {
    return this.#Types[1];
  }

  /**
   * @description Checks if the value is an empty value
   */
  get isEmpty() {
    for (const v of this.values()) {
      if (!v.isEmpty) {
        return false;
      }
    }
    return true;
  }

  /**
   * @description The length of the value when encoded as a Uint8Array
   */
  get encodedLength() {
    let total = 0;
    for (const v of this.values()) {
      total += v.encodedLength;
    }
    return total;
  }

  /**
   * @description returns a hash of the contents
   */
  get hash() {
    return this.registry.hash(this.toU8a());
  }

  /**
   * @description Returns the Type description of the structure
   */
  get Type() {
    const result = {};
    const [Types, keys] = this.#Types;
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = new Types[i](this.registry).toRawType();
    }
    return result;
  }

  /**
   * @description Compares the value of the input to see if there is a match
   */
  eq(other) {
    return (0, _utils.compareMap)(this, other);
  }

  /**
   * @description Returns a specific names entry in the structure
   * @param key The name of the entry to retrieve
   */
  get(key) {
    return super.get(key);
  }

  /**
   * @description Returns the values of a member at a specific index (Rather use get(name) for performance)
   */
  getAtIndex(index) {
    return this.toArray()[index];
  }

  /**
   * @description Returns the a types value by name
   */
  getT(key) {
    return super.get(key);
  }

  /**
   * @description Returns a breakdown of the hex encoding for this Codec
   */
  inspect(isBare) {
    const inner = new Array();
    for (const [k, v] of this.entries()) {
      inner.push({
        ...v.inspect(!isBare || (0, _util.isBoolean)(isBare) ? isBare : isBare[k]),
        name: (0, _util.stringCamelCase)(k),
      });
    }
    return {
      inner,
    };
  }

  /**
   * @description Converts the Object to an standard JavaScript Array
   */
  toArray() {
    return [...this.values()];
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
  toHuman(isExtended) {
    const json = {};
    for (const [k, v] of this.entries()) {
      json[k] = v.toHuman(isExtended);
    }
    return json;
  }

  /**
   * @description Converts the Object to JSON, typically used for RPC transfers
   */
  toJSON() {
    const json = {};
    for (const [k, v] of this.entries()) {
      // Here we pull out the entry against the JSON mapping (if supplied)
      // since this representation goes over RPC and needs to be correct
      json[this.#jsonMap.get(k) || k] = v.toJSON();
    }
    return json;
  }

  /**
   * @description Converts the value in a best-fit primitive form
   */
  toPrimitive() {
    const json = {};
    for (const [k, v] of this.entries()) {
      json[k] = v.toPrimitive();
    }
    return json;
  }

  /**
   * @description Returns the base runtime type name for this instance
   */
  toRawType() {
    return (0, _util.stringify)((0, _utils.typesToMap)(this.registry, this.#Types));
  }

  /**
   * @description Returns the string representation of the value
   */
  toString() {
    return (0, _util.stringify)(this.toJSON());
  }

  /**
   * @description Encodes the value as a Uint8Array as per the SCALE specifications
   * @param isBare true when the value has none of the type-specific prefixes (internal)
   */
  toU8a(isBare) {
    const encoded = [];
    for (const [k, v] of this.entries()) {
      encoded.push(v.toU8a(!isBare || (0, _util.isBoolean)(isBare) ? isBare : isBare[k]));
    }
    return (0, _util.u8aConcatStrict)(encoded);
  }
}
exports.Struct = Struct;
