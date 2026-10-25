'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.generateCallTypes = generateCallTypes;
exports.generateDefaultRuntime = generateDefaultRuntime;
var _handlebars = _interopRequireDefault(require('handlebars'));
var defaultDefs = _interopRequireWildcard(require('@polkadot/types/interfaces/definitions'));
var _definitions2 = _interopRequireDefault(require('@polkadot/types-augment/lookup/definitions'));
var _util = require('@polkadot/util');
var _utilCrypto = require('@polkadot/util-crypto');
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

const generateCallsTypesTemplate = _handlebars.default.compile((0, _util2.readTemplate)('calls'));

/** @internal */
function getDefs(apis, defs) {
  const named = {};
  const all = Object.values(defs);
  for (let j = 0; j < all.length; j++) {
    const set = all[j].runtime;
    if (set) {
      const sections = Object.entries(set);
      for (let i = 0; i < sections.length; i++) {
        const [_section, sec] = sections[i];
        const sectionHash = (0, _utilCrypto.blake2AsHex)(_section, 64);
        const api =
          apis &&
          apis.find((_ref) => {
            let [h] = _ref;
            return h === sectionHash;
          });
        if (api) {
          const ver = sec.find((_ref2) => {
            let { version } = _ref2;
            return version === api[1];
          });
          if (ver) {
            const methods = Object.entries(ver.methods);
            if (methods.length) {
              const section = (0, _util.stringCamelCase)(_section);
              if (!named[section]) {
                named[section] = {};
              }
              for (let m = 0; m < methods.length; m++) {
                const [_method, def] = methods[m];
                const method = (0, _util.stringCamelCase)(_method);
                named[section][method] = (0, _util.objectSpread)(
                  {
                    method,
                    name: `${_section}_${method}`,
                    section,
                    sectionHash,
                    version: ver.version,
                  },
                  def
                );
              }
            }
          } else {
            console.warn(`Unable to find matching version for runtime ${_section}, expected ${api[1]}`);
          }
        }
      }
    }
  }
  return named;
}

/** @internal */
function generateCallTypes(registry, meta, dest, extraTypes, isStrict, customLookupDefinitions) {
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

    // find the system.Version in metadata
    let apis = null;
    const sysp = meta.asLatest.pallets.find((_ref3) => {
      let { name } = _ref3;
      return name.eq('System');
    });
    if (sysp) {
      const verc = sysp.constants.find((_ref4) => {
        let { name } = _ref4;
        return name.eq('Version');
      });
      if (verc) {
        apis = registry.createType('RuntimeVersion', verc.value).apis.map((_ref5) => {
          let [k, v] = _ref5;
          return [k.toHex(), v.toNumber()];
        });
      } else {
        console.error('Unable to find System.Version pallet, skipping API extraction');
      }
    } else {
      console.error('Unable to find System pallet, skipping API extraction');
    }
    const allDefs = Object.entries(allTypes).reduce((defs, _ref6) => {
      let [path, obj] = _ref6;
      return Object.entries(obj).reduce((defs, _ref7) => {
        let [key, value] = _ref7;
        return {
          ...defs,
          [`${path}/${key}`]: value,
        };
      }, defs);
    }, {});
    const definitions = getDefs(apis, imports.definitions);
    const callKeys = Object.keys(definitions);
    const modules = callKeys
      .map((section) => {
        const calls = definitions[section];
        const allMethods = Object.keys(calls)
          .sort()
          .map((methodName) => {
            const def = calls[methodName];
            (0, _util2.setImports)(allDefs, imports, [def.type]);
            const args = def.params.map((param) => {
              const similarTypes = (0, _util2.getSimilarTypes)(registry, imports.definitions, param.type, imports);
              (0, _util2.setImports)(allDefs, imports, [param.type, ...similarTypes]);
              return `${param.name}: ${similarTypes.join(' | ')}`;
            });
            return {
              args: args.join(', '),
              docs: [def.description],
              name: methodName,
              sectionHash: def.sectionHash,
              sectionName: def.section,
              sectionVersion: def.version,
              type: (0, _util2.formatType)(registry, allDefs, def.type, imports),
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        return {
          items: allMethods,
          name: section || 'unknown',
          sectionHash: allMethods.length && allMethods[0].sectionHash,
          sectionName: allMethods.length && allMethods[0].sectionName,
          sectionVersion: allMethods.length && allMethods[0].sectionVersion,
        };
      })
      .filter((_ref8) => {
        let { items } = _ref8;
        return items.length;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    if (modules.length) {
      imports.typesTypes.Observable = true;
    }
    return generateCallsTypesTemplate({
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
          types: ['ApiTypes', 'AugmentedCall', 'DecoratedCallBase'],
        },
      ],
    });
  });
}
function generateDefaultRuntime(dest, data) {
  let extraTypes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let isStrict = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  let customLookupDefinitions = arguments.length > 4 ? arguments[4] : undefined;
  const { metadata, registry } = (0, _util2.initMeta)(data, extraTypes);
  generateCallTypes(registry, metadata, dest, extraTypes, isStrict, customLookupDefinitions);
}
