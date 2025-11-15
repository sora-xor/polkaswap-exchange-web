'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.obervableAll = void 0;
var _rxjs = require('rxjs');
var _accounts = require('./accounts');
var _addresses = require('./addresses');
var _contracts = require('./contracts');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

const obervableAll = (0, _rxjs.combineLatest)([
  _accounts.accounts.subject,
  _addresses.addresses.subject,
  _contracts.contracts.subject,
]).pipe(
  (0, _rxjs.map)((_ref) => {
    let [accounts, addresses, contracts] = _ref;
    return {
      accounts,
      addresses,
      contracts,
    };
  })
);
exports.obervableAll = obervableAll;
