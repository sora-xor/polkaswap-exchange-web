'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.addresses = void 0;
var _defaults = require('../defaults');
var _genericSubject = require('./genericSubject');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

const addresses = (0, _genericSubject.genericSubject)(_defaults.addressKey);
exports.addresses = addresses;
