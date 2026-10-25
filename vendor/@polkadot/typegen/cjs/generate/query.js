'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.generateDefaultQuery = generateDefaultQuery;
var _handlebars = _interopRequireDefault(require('handlebars'));
var defaultDefs = _interopRequireWildcard(require('@polkadot/types/interfaces/definitions'));
var _StorageKey = require('@polkadot/types/primitive/StorageKey');
var _definitions2 = _interopRequireDefault(require('@polkadot/types-augment/lookup/definitions'));
var _util = require('@polkadot/util');
var _util2 = require('../util');
function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return { default: obj };
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

const generateForMetaTemplate = _handlebars.default.compile((0, _util2.readTemplate)('query'));

// From a storage entry metadata, we return [args, returnType]
/** @internal */
function entrySignature(lookup, allDefs, registry, section, storageEntry, imports) {
  try {
    const outputType = lookup.getTypeDef((0, _StorageKey.unwrapStorageSi)(storageEntry.type));
    if (storageEntry.type.isPlain) {
      const typeDef = lookup.getTypeDef(storageEntry.type.asPlain);
      (0, _util2.setImports)(allDefs, imports, [
        typeDef.lookupName || typeDef.type,
        storageEntry.modifier.isOptional ? 'Option' : null,
      ]);
      return [storageEntry.modifier.isOptional, '', '', (0, _util2.formatType)(registry, allDefs, outputType, imports)];
    } else if (storageEntry.type.isMap) {
      const { hashers, key, value } = storageEntry.type.asMap;
      const keyDefs =
        hashers.length === 1
          ? [lookup.getTypeDef(key)]
          : lookup.getSiType(key).def.asTuple.map((k) => lookup.getTypeDef(k));
      const similarTypes = keyDefs.map((k) =>
        (0, _util2.getSimilarTypes)(registry, allDefs, k.lookupName || k.type, imports)
      );
      const keyTypes = similarTypes.map((t) => t.join(' | '));
      const defValue = lookup.getTypeDef(value);
      (0, _util2.setImports)(allDefs, imports, [
        ...similarTypes.reduce((all, t) => all.concat(t), []),
        storageEntry.modifier.isOptional ? 'Option' : null,
        defValue.lookupName || defValue.type,
      ]);
      return [
        storageEntry.modifier.isOptional,
        keyDefs.map((k) => (0, _util2.formatType)(registry, allDefs, k.lookupName || k.type, imports)).join(', '),
        keyTypes.map((t, i) => `arg${keyTypes.length === 1 ? '' : i + 1}: ${t}`).join(', '),
        outputType.lookupName || (0, _util2.formatType)(registry, allDefs, outputType, imports),
      ];
    }
    throw new Error(`Expected Plain or Map type, found ${storageEntry.type.type}`);
  } catch (error) {
    throw new Error(
      `entrySignature: Cannot create signature for query ${section}.${storageEntry.name.toString()}:: ${error.message}`
    );
  }
}

/** @internal */
function generateForMeta(registry, meta, dest, extraTypes, isStrict, customLookupDefinitions) {
  (0, _util2.writeFile)(dest, () => {
    const allTypes = {
      '@polkadot/types-augment': {
        lookup: {
          ..._definitions2.default,
          ...customLookupDefinitions,
        },
      },
      '@polkadot/types/interfaces': defaultDefs,
      ...extraTypes,
    };
    const imports = (0, _util2.createImports)(allTypes);
    const allDefs = Object.entries(allTypes).reduce((defs, _ref) => {
      let [path, obj] = _ref;
      return Object.entries(obj).reduce((defs, _ref2) => {
        let [key, value] = _ref2;
        return {
          ...defs,
          [`${path}/${key}`]: value,
        };
      }, defs);
    }, {});
    const { lookup, pallets } = meta.asLatest;
    const modules = pallets
      .filter((_ref3) => {
        let { storage } = _ref3;
        return storage.isSome;
      })
      .map((_ref4) => {
        let { name, storage } = _ref4;
        const items = storage
          .unwrap()
          .items.map((storageEntry) => {
            const [isOptional, args, params, _returnType] = entrySignature(
              lookup,
              allDefs,
              registry,
              name.toString(),
              storageEntry,
              imports
            );
            const returnType = isOptional ? `Option<${_returnType}>` : _returnType;
            return {
              args,
              docs: storageEntry.docs,
              entryType: 'AugmentedQuery',
              name: (0, _util.stringCamelCase)(storageEntry.name),
              params,
              returnType,
            };
          })
          .sort(_util2.compareName);
        return {
          items,
          name: (0, _util.stringCamelCase)(name),
        };
      })
      .sort(_util2.compareName);
    imports.typesTypes.Observable = true;
    return generateForMetaTemplate({
      headerType: 'chain',
      imports,
      isStrict,
      modules,
      types: [
        ...Object.keys(imports.localTypes)
          .sort()
          .map((packagePath) => ({
            file: packagePath.replace('@polkadot/types-augment', '@polkadot/types'),
            types: Object.keys(imports.localTypes[packagePath]),
          })),
        {
          file: '@polkadot/api-base/types',
          types: ['ApiTypes', 'AugmentedQuery', 'QueryableStorageEntry'],
        },
      ],
    });
  });
}

// Call `generateForMeta()` with current static metadata
/** @internal */
function generateDefaultQuery(dest, data) {
  let extraTypes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let isStrict = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  let customLookupDefinitions = arguments.length > 4 ? arguments[4] : undefined;
  const { metadata, registry } = (0, _util2.initMeta)(data, extraTypes);
  return generateForMeta(registry, metadata, dest, extraTypes, isStrict, customLookupDefinitions);
}
