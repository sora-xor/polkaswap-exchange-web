'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.generateDefaultConsts = generateDefaultConsts;
var _handlebars = _interopRequireDefault(require('handlebars'));
var defaultDefs = _interopRequireWildcard(require('@polkadot/types/interfaces/definitions'));
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

const generateForMetaTemplate = _handlebars.default.compile((0, _util2.readTemplate)('consts'));

/** @internal */
function generateForMeta(meta, dest, extraTypes, isStrict, customLookupDefinitions) {
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
    const { lookup, pallets, registry } = meta.asLatest;
    const modules = pallets
      .filter((_ref3) => {
        let { constants } = _ref3;
        return constants.length > 0;
      })
      .map((_ref4) => {
        let { constants, name } = _ref4;
        if (!isStrict) {
          (0, _util2.setImports)(allDefs, imports, ['Codec']);
        }
        const items = constants
          .map((_ref5) => {
            let { docs, name, type } = _ref5;
            const typeDef = lookup.getTypeDef(type);
            const returnType = typeDef.lookupName || (0, _util2.formatType)(registry, allDefs, typeDef, imports);
            (0, _util2.setImports)(allDefs, imports, [returnType]);
            return {
              docs,
              name: (0, _util.stringCamelCase)(name),
              type: returnType,
            };
          })
          .sort(_util2.compareName);
        return {
          items,
          name: (0, _util.stringCamelCase)(name),
        };
      })
      .sort(_util2.compareName);
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
          types: ['ApiTypes', 'AugmentedConst'],
        },
      ],
    });
  });
}

// Call `generateForMeta()` with current static metadata
/** @internal */
function generateDefaultConsts(dest, data) {
  let extraTypes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let isStrict = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  let customLookupDefinitions = arguments.length > 4 ? arguments[4] : undefined;
  const { metadata } = (0, _util2.initMeta)(data, extraTypes);
  return generateForMeta(metadata, dest, extraTypes, isStrict, customLookupDefinitions);
}
