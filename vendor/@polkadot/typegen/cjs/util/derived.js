'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.getSimilarTypes = getSimilarTypes;
var _generic = require('@polkadot/types/generic');
var _definitions = require('@polkadot/types/interfaces/democracy/definitions');
var _typesCodec = require('@polkadot/types-codec');
var _typesCreate = require('@polkadot/types-create');
var _util = require('@polkadot/util');
var _formatting = require('./formatting');
var _imports = require('./imports');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

function arrayToStrType(arr) {
  return `${arr.map((c) => `'${c}'`).join(' | ')}`;
}
const voteConvictions = arrayToStrType(_definitions.AllConvictions);

// Make types a little bit more flexible
// - if param instanceof AbstractInt, then param: u64 | Uint8array | AnyNumber
// etc
/** @internal */
function getSimilarTypes(registry, definitions, _type, imports) {
  const typeParts = _type.split('::');
  const type = typeParts[typeParts.length - 1];
  const possibleTypes = [(0, _formatting.formatType)(registry, definitions, type, imports)];
  if (type === 'Extrinsic') {
    (0, _imports.setImports)(definitions, imports, ['IExtrinsic']);
    return ['Extrinsic', 'IExtrinsic', 'string', 'Uint8Array'];
  } else if (type === 'Keys') {
    // This one is weird... surely it should popup as a Tuple? (but either way better as defined hex)
    return ['Keys', 'string', 'Uint8Array'];
  } else if (type === 'StorageKey') {
    // TODO We can do better
    return ['StorageKey', 'string', 'Uint8Array', 'any'];
  } else if (type === '()') {
    return ['null'];
  }
  const Clazz = registry.createClass(type);
  if ((0, _util.isChildClass)(_typesCodec.Vec, Clazz)) {
    const vecDef = (0, _typesCreate.getTypeDef)(type);
    const subDef = vecDef.sub;

    // this could be that we define a Vec type and refer to it by name
    if (subDef) {
      if (subDef.info === _typesCreate.TypeDefInfo.Plain) {
        possibleTypes.push(`(${getSimilarTypes(registry, definitions, subDef.type, imports).join(' | ')})[]`);
      } else if (subDef.info === _typesCreate.TypeDefInfo.Tuple) {
        const subs = subDef.sub.map((_ref) => {
          let { type } = _ref;
          return getSimilarTypes(registry, definitions, type, imports).join(' | ');
        });
        possibleTypes.push(`([${subs.join(', ')}])[]`);
      } else if (
        subDef.info === _typesCreate.TypeDefInfo.Option ||
        subDef.info === _typesCreate.TypeDefInfo.Vec ||
        subDef.info === _typesCreate.TypeDefInfo.VecFixed
      ) {
        // TODO: Add possibleTypes so imports work
      } else if (subDef.info === _typesCreate.TypeDefInfo.Struct) {
        // TODO: Add possibleTypes so imports work
      } else {
        throw new Error(`Unhandled subtype in Vec, ${(0, _util.stringify)(subDef)}`);
      }
    }
  } else if ((0, _util.isChildClass)(_typesCodec.Enum, Clazz)) {
    const { defKeys, isBasic } = new Clazz(registry);
    const keys = defKeys.filter((v) => !v.startsWith('__Unused'));
    if (isBasic) {
      possibleTypes.push(arrayToStrType(keys), 'number');
    } else {
      // TODO We don't really want any here, these should be expanded
      possibleTypes.push(...keys.map((k) => `{ ${k}: any }`), 'string');
    }
    possibleTypes.push('Uint8Array');
  } else if (
    (0, _util.isChildClass)(_typesCodec.AbstractInt, Clazz) ||
    (0, _util.isChildClass)(_typesCodec.Compact, Clazz)
  ) {
    possibleTypes.push('AnyNumber', 'Uint8Array');
  } else if ((0, _util.isChildClass)(_generic.GenericLookupSource, Clazz)) {
    possibleTypes.push('Address', 'AccountId', 'AccountIndex', 'LookupSource', 'string', 'Uint8Array');
  } else if ((0, _util.isChildClass)(_generic.GenericAccountId, Clazz)) {
    possibleTypes.push('string', 'Uint8Array');
  } else if ((0, _util.isChildClass)(_generic.GenericCall, Clazz)) {
    possibleTypes.push('IMethod', 'string', 'Uint8Array');
  } else if ((0, _util.isChildClass)(_typesCodec.bool, Clazz)) {
    possibleTypes.push('boolean', 'Uint8Array');
  } else if ((0, _util.isChildClass)(_typesCodec.Null, Clazz)) {
    possibleTypes.push('null');
  } else if ((0, _util.isChildClass)(_typesCodec.Struct, Clazz)) {
    const s = new Clazz(registry);
    const obj = s.defKeys.map((key) => `${key}?: any`).join('; ');
    possibleTypes.push(`{ ${obj} }`, 'string', 'Uint8Array');
  } else if ((0, _util.isChildClass)(_typesCodec.Option, Clazz)) {
    possibleTypes.push('null', 'Uint8Array');
    const optDef = (0, _typesCreate.getTypeDef)(type);
    const subDef = optDef.sub;
    if (subDef) {
      possibleTypes.push(...getSimilarTypes(registry, definitions, subDef.type, imports));
    } else {
      possibleTypes.push('object', 'string');
    }
  } else if ((0, _util.isChildClass)(_generic.GenericVote, Clazz)) {
    possibleTypes.push(`{ aye: boolean; conviction?: ${voteConvictions} | number }`, 'boolean', 'string', 'Uint8Array');
  } else if (
    (0, _util.isChildClass)(_typesCodec.WrapperKeepOpaque, Clazz) ||
    (0, _util.isChildClass)(_typesCodec.WrapperOpaque, Clazz)
  ) {
    // TODO inspect container
    possibleTypes.push('object', 'string', 'Uint8Array');
  } else if ((0, _util.isChildClass)(Uint8Array, Clazz)) {
    possibleTypes.push('string', 'Uint8Array');
  } else if ((0, _util.isChildClass)(String, Clazz)) {
    possibleTypes.push('string');
  } else if ((0, _util.isChildClass)(_typesCodec.Tuple, Clazz)) {
    const tupDef = (0, _typesCreate.getTypeDef)(type);
    const subDef = tupDef.sub;

    // this could be that we define a Tuple type and refer to it by name
    if (Array.isArray(subDef)) {
      const subs = subDef.map((_ref2) => {
        let { type } = _ref2;
        return getSimilarTypes(registry, definitions, type, imports).join(' | ');
      });
      possibleTypes.push(`[${subs.join(', ')}]`);
    }
  }
  return [...new Set(possibleTypes)];
}
