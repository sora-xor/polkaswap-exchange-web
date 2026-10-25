'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.generateDefaultTx = generateDefaultTx;
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

const MAPPED_NAMES = {
  class: 'clazz',
  new: 'updated',
};
const generateForMetaTemplate = _handlebars.default.compile((0, _util2.readTemplate)('tx'));
function mapName(_name) {
  const name = (0, _util.stringCamelCase)(_name);
  return MAPPED_NAMES[name] || name;
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
      .sort(_util2.compareName)
      .filter((_ref3) => {
        let { calls } = _ref3;
        return calls.isSome;
      })
      .map((_ref4) => {
        let { calls, name } = _ref4;
        (0, _util2.setImports)(allDefs, imports, ['SubmittableExtrinsic']);
        const sectionName = (0, _util.stringCamelCase)(name);
        const items = lookup
          .getSiType(calls.unwrap().type)
          .def.asVariant.variants.map((_ref5) => {
            let { docs, fields, name } = _ref5;
            const typesInfo = fields.map((_ref6, index) => {
              let { name, type, typeName } = _ref6;
              const typeDef = registry.lookup.getTypeDef(type);
              return [
                name.isSome ? mapName(name.unwrap()) : `param${index}`,
                typeName.isSome ? typeName.toString() : typeDef.type,
                typeDef.isFromSi ? typeDef.type : typeDef.lookupName || typeDef.type,
              ];
            });
            const params = typesInfo
              .map((_ref7) => {
                let [name, , typeStr] = _ref7;
                const similarTypes = (0, _util2.getSimilarTypes)(registry, allDefs, typeStr, imports);
                (0, _util2.setImports)(allDefs, imports, [typeStr, ...similarTypes]);
                return `${name}: ${similarTypes.join(' | ')}`;
              })
              .join(', ');
            return {
              args: typesInfo
                .map((_ref8) => {
                  let [, , typeStr] = _ref8;
                  return (0, _util2.formatType)(registry, allDefs, typeStr, imports);
                })
                .join(', '),
              docs,
              name: (0, _util.stringCamelCase)(name),
              params,
            };
          })
          .sort(_util2.compareName);
        return {
          items,
          name: sectionName,
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
          types: ['ApiTypes', 'AugmentedSubmittable', 'SubmittableExtrinsic', 'SubmittableExtrinsicFunction'],
        },
      ],
    });
  });
}

// Call `generateForMeta()` with current static metadata
/** @internal */
function generateDefaultTx(dest, data) {
  let extraTypes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let isStrict = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  let customLookupDefinitions = arguments.length > 4 ? arguments[4] : undefined;
  const { metadata, registry } = (0, _util2.initMeta)(data, extraTypes);
  return generateForMeta(registry, metadata, dest, extraTypes, isStrict, customLookupDefinitions);
}
