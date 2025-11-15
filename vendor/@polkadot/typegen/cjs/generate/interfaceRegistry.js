'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.generateDefaultInterface = generateDefaultInterface;
exports.generateInterfaceTypes = generateInterfaceTypes;
var _handlebars = _interopRequireDefault(require('handlebars'));
var _codec = require('@polkadot/types/codec');
var _create = require('@polkadot/types/create');
var defaultDefinitions = _interopRequireWildcard(require('@polkadot/types/interfaces/definitions'));
var defaultPrimitives = _interopRequireWildcard(require('@polkadot/types/primitive'));
var _util = require('../util');
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

const primitiveClasses = {
  ...defaultPrimitives,
  Json: _codec.Json,
  Raw: _codec.Raw,
};
const generateInterfaceTypesTemplate = _handlebars.default.compile((0, _util.readTemplate)('interfaceRegistry'));

/** @internal */
function generateInterfaceTypes(importDefinitions, dest) {
  const registry = new _create.TypeRegistry();
  (0, _util.writeFile)(dest, () => {
    Object.entries(importDefinitions).reduce((acc, def) => Object.assign(acc, def), {});
    const imports = (0, _util.createImports)(importDefinitions);
    const definitions = imports.definitions;
    const items = [];

    // first we create imports for our known classes from the API
    Object.keys(primitiveClasses)
      .filter((name) => !name.includes('Generic'))
      .forEach((primitiveName) => {
        (0, _util.setImports)(definitions, imports, [primitiveName]);
        items.push(primitiveName);
      });
    const existingTypes = {};

    // ensure we have everything registered since we will get the definition
    // form the available types (so any unknown should show after this)
    Object.values(definitions).forEach((_ref) => {
      let { types } = _ref;
      registry.register(types);
    });

    // create imports for everything that we have available
    Object.values(definitions).forEach((_ref2) => {
      let { types } = _ref2;
      (0, _util.setImports)(definitions, imports, Object.keys(types));
      const uniqueTypes = Object.keys(types).filter((type) => !existingTypes[type]);
      uniqueTypes.forEach((type) => {
        existingTypes[type] = true;
        items.push(type);
      });
    });
    return generateInterfaceTypesTemplate({
      headerType: 'defs',
      imports,
      items: items.sort((a, b) => a.localeCompare(b)),
      types: [
        ...Object.keys(imports.localTypes)
          .sort()
          .map((packagePath) => ({
            file: packagePath,
            types: Object.keys(imports.localTypes[packagePath]),
          })),
      ],
    });
  });
}

// Generate `packages/types/src/interfaceRegistry.ts`, the registry of all interfaces
function generateDefaultInterface() {
  generateInterfaceTypes(
    {
      '@polkadot/types/interfaces': defaultDefinitions,
    },
    'packages/types-augment/src/registry/interfaces.ts'
  );
}
