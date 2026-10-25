'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.accounts = void 0;
var _defaults = require('../defaults');
var _genericSubject = require('./genericSubject');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

const accounts = (0, _genericSubject.genericSubject)(_defaults.accountKey, true);
exports.accounts = accounts;
