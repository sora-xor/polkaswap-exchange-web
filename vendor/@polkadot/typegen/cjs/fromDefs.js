'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.main = main;
var _path = _interopRequireDefault(require('path'));
var _yargs = _interopRequireDefault(require('yargs'));
var substrateDefs = _interopRequireWildcard(require('@polkadot/types/cjs/interfaces/definitions'));
var _interfaceRegistry = require('./generate/interfaceRegistry');
var _tsDef = require('./generate/tsDef');
var _generate = require('./generate');
var _util = require('./util');
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

function main() {
  const {
    endpoint,
    input,
    package: pkg,
  } = _yargs.default.strict().options({
    endpoint: {
      description:
        'The endpoint to connect to (e.g. wss://kusama-rpc.polkadot.io) or relative path to a file containing the JSON output of an RPC state_getMetadata call',
      type: 'string',
    },
    input: {
      description: 'The directory to use for the user definitions',
      required: true,
      type: 'string',
    },
    package: {
      description: 'The package name & path to use for the user types',
      required: true,
      type: 'string',
    },
  }).argv;
  const inputPath = (0, _util.assertDir)(_path.default.join(process.cwd(), input));
  let userDefs = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    userDefs = require((0, _util.assertFile)(_path.default.join(inputPath, 'definitions.ts')));
  } catch (error) {
    console.error('ERROR: Unable to load user definitions:', error.message);
  }
  const userKeys = Object.keys(userDefs);
  const filteredBase = Object.entries(substrateDefs)
    .filter((_ref) => {
      let [key] = _ref;
      if (userKeys.includes(key)) {
        console.warn(`Override found for ${key} in user types, ignoring in @polkadot/types`);
        return false;
      }
      return true;
    })
    .reduce((defs, _ref2) => {
      let [key, value] = _ref2;
      defs[key] = value;
      return defs;
    }, {});
  const allDefs = {
    '@polkadot/types/interfaces': filteredBase,
    [pkg]: userDefs,
  };
  (0, _tsDef.generateTsDef)(allDefs, inputPath, pkg);
  (0, _interfaceRegistry.generateInterfaceTypes)(allDefs, _path.default.join(inputPath, 'augment-types.ts'));
  if (endpoint) {
    if (endpoint.startsWith('wss://') || endpoint.startsWith('ws://')) {
      (0, _util.getMetadataViaWs)(endpoint)
        .then((metadata) => (0, _generate.generateDefaultLookup)(inputPath, metadata))
        .catch(() => process.exit(1));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const metaHex = require((0, _util.assertFile)(_path.default.join(process.cwd(), endpoint))).result;
      (0, _generate.generateDefaultLookup)(inputPath, metaHex);
    }
  }
}
