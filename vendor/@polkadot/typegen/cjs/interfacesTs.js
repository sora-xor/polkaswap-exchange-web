'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.main = main;
var _staticKusama = _interopRequireDefault(require('@polkadot/types-support/cjs/metadata/static-kusama'));
var _staticPolkadot = _interopRequireDefault(require('@polkadot/types-support/cjs/metadata/static-polkadot'));
var _staticSubstrate = _interopRequireDefault(require('@polkadot/types-support/cjs/metadata/static-substrate'));
var _generate = require('./generate');
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

const BASE = 'packages/api-augment/src';
const METAS = Object.entries({
  kusama: _staticKusama.default,
  polkadot: _staticPolkadot.default,
  substrate: _staticSubstrate.default,
});
function main() {
  (0, _generate.generateDefaultInterface)();
  (0, _generate.generateDefaultLookup)();
  (0, _generate.generateDefaultRpc)();
  (0, _generate.generateDefaultTsDef)();
  for (const [name, staticMeta] of METAS) {
    console.log();
    console.log(`*** Generating for ${name}`);
    (0, _generate.generateDefaultConsts)(`${BASE}/${name}/consts.ts`, staticMeta);
    (0, _generate.generateDefaultErrors)(`${BASE}/${name}/errors.ts`, staticMeta);
    (0, _generate.generateDefaultEvents)(`${BASE}/${name}/events.ts`, staticMeta);
    (0, _generate.generateDefaultQuery)(`${BASE}/${name}/query.ts`, staticMeta);
    (0, _generate.generateDefaultRuntime)(`${BASE}/${name}/runtime.ts`, staticMeta);
    (0, _generate.generateDefaultTx)(`${BASE}/${name}/tx.ts`, staticMeta);
  }
}
