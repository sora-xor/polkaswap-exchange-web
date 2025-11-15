'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.CAMERA_DEFAULT = exports.CAMERA = void 0;
Object.defineProperty(exports, 'CRYPTOS', {
  enumerable: true,
  get: function () {
    return _crypto.CRYPTOS;
  },
});
Object.defineProperty(exports, 'CRYPTOS_ETH', {
  enumerable: true,
  get: function () {
    return _crypto.CRYPTOS_ETH;
  },
});
Object.defineProperty(exports, 'CRYPTOS_LEDGER', {
  enumerable: true,
  get: function () {
    return _crypto.CRYPTOS_LEDGER;
  },
});
Object.defineProperty(exports, 'ENDPOINTS', {
  enumerable: true,
  get: function () {
    return _endpoints.ENDPOINTS;
  },
});
Object.defineProperty(exports, 'ENDPOINT_DEFAULT', {
  enumerable: true,
  get: function () {
    return _endpoints.ENDPOINT_DEFAULT;
  },
});
Object.defineProperty(exports, 'ICONS', {
  enumerable: true,
  get: function () {
    return _ui.ICONS;
  },
});
Object.defineProperty(exports, 'ICON_DEFAULT', {
  enumerable: true,
  get: function () {
    return _ui.ICON_DEFAULT;
  },
});
Object.defineProperty(exports, 'ICON_DEFAULT_HOST', {
  enumerable: true,
  get: function () {
    return _ui.ICON_DEFAULT_HOST;
  },
});
exports.LANGUAGE_DEFAULT = void 0;
Object.defineProperty(exports, 'LEDGER_CONN', {
  enumerable: true,
  get: function () {
    return _ledger.LEDGER_CONN;
  },
});
Object.defineProperty(exports, 'LEDGER_CONN_DEFAULT', {
  enumerable: true,
  get: function () {
    return _ledger.LEDGER_CONN_DEFAULT;
  },
});
exports.METADATA_UP_DEFAULT = exports.METADATA_UP = exports.LOCKING_DEFAULT = exports.LOCKING = void 0;
Object.defineProperty(exports, 'NOTIFICATION_DEFAULT', {
  enumerable: true,
  get: function () {
    return _ui.NOTIFICATION_DEFAULT;
  },
});
Object.defineProperty(exports, 'PREFIXES', {
  enumerable: true,
  get: function () {
    return _ss.PREFIXES;
  },
});
Object.defineProperty(exports, 'PREFIX_DEFAULT', {
  enumerable: true,
  get: function () {
    return _ss.PREFIX_DEFAULT;
  },
});
exports.STORAGE_DEFAULT = exports.STORAGE = void 0;
Object.defineProperty(exports, 'UIMODES', {
  enumerable: true,
  get: function () {
    return _ui.UIMODES;
  },
});
Object.defineProperty(exports, 'UIMODE_DEFAULT', {
  enumerable: true,
  get: function () {
    return _ui.UIMODE_DEFAULT;
  },
});
Object.defineProperty(exports, 'UITHEMES', {
  enumerable: true,
  get: function () {
    return _ui.UITHEMES;
  },
});
Object.defineProperty(exports, 'UITHEME_DEFAULT', {
  enumerable: true,
  get: function () {
    return _ui.UITHEME_DEFAULT;
  },
});
var _crypto = require('./crypto');
var _endpoints = require('./endpoints');
var _ledger = require('./ledger');
var _ss = require('./ss58');
var _ui = require('./ui');
// Copyright 2017-2023 @polkadot/ui-settings authors & contributors
// SPDX-License-Identifier: Apache-2.0

const CAMERA_DEFAULT = 'off';
exports.CAMERA_DEFAULT = CAMERA_DEFAULT;
const CAMERA = [
  {
    info: 'on',
    text: 'Allow camera access',
    value: 'on',
  },
  {
    info: 'off',
    text: 'Do not allow camera access',
    value: 'off',
  },
];
exports.CAMERA = CAMERA;
const LANGUAGE_DEFAULT = 'default';
exports.LANGUAGE_DEFAULT = LANGUAGE_DEFAULT;
const LOCKING_DEFAULT = 'session';
exports.LOCKING_DEFAULT = LOCKING_DEFAULT;
const LOCKING = [
  {
    info: 'session',
    text: 'Once per session',
    value: 'session',
  },
  {
    info: 'tx',
    text: 'On each transaction',
    value: 'tx',
  },
];
exports.LOCKING = LOCKING;
const METADATA_UP_DEFAULT = 'off';
exports.METADATA_UP_DEFAULT = METADATA_UP_DEFAULT;
const METADATA_UP = [
  {
    info: 'off',
    text: 'Do not auto-update extension metadata',
    value: 'off',
  },
  {
    info: 'on',
    text: 'Auto-update extension metadata',
    value: 'on',
  },
];
exports.METADATA_UP = METADATA_UP;
const STORAGE_DEFAULT = 'off';
exports.STORAGE_DEFAULT = STORAGE_DEFAULT;
const STORAGE = [
  {
    info: 'on',
    text: 'Allow local in-browser account storage',
    value: 'on',
  },
  {
    info: 'off',
    text: 'Do not allow local in-browser account storage',
    value: 'off',
  },
];
exports.STORAGE = STORAGE;
