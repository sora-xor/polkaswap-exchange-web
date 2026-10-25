// Copyright 2017-2023 @polkadot/types-codec authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @name Object
 * @description A type extends the Base class, when it holds a value
 */
export class AbstractObject {
  constructor(registry, value, initialU8aLength) {
    this.$ = value;
    this.initialU8aLength = initialU8aLength;
    this.registry = registry;
  }

  /**
   * @description The length of the value when encoded as a Uint8Array
   */
  get encodedLength() {
    return this.toU8a().length;
  }

  /**
   * @description returns a hash of the contents
   */
  get hash() {
    return this.registry.hash(this.toU8a());
  }

  /**
   * @description Checks if the value is an empty value
   */

  /**
   * @description Returns the string representation of the value
   */
  toString() {
    return this.$.toString();
  }

  /**
   * @description Encodes the value as a Uint8Array as per the SCALE specifications
   * @param isBare true when the value has none of the type-specific prefixes (internal)
   */

  /**
   * @description Return the internal value (JS-aligned, same result as $)
   */
  valueOf() {
    return this.$;
  }
}
