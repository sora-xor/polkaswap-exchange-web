'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.settings = exports.Settings = void 0;
var _eventemitter = _interopRequireDefault(require('eventemitter3'));
var _store = _interopRequireDefault(require('store'));
var _util = require('@polkadot/util');
var _defaults = require('./defaults');
// Copyright 2017-2023 @polkadot/ui-settings authors & contributors
// SPDX-License-Identifier: Apache-2.0

function withDefault(options, option, fallback) {
  const _option = option || fallback;
  return options.some((_ref) => {
    let { value } = _ref;
    return value === _option;
  })
    ? _option
    : fallback;
}
class Settings {
  #emitter;
  #apiType;

  // will become deprecated for supporting substrate connect light clients. apiType structure should be used instead
  #apiUrl;
  #camera;
  #i18nLang;
  #icon;
  #ledgerConn;
  #locking;
  #metadataUp;
  #prefix;
  #storage;
  #uiMode;
  #uiTheme;
  #notification;
  constructor() {
    const settings = _store.default.get('settings') || {};
    this.#emitter = new _eventemitter.default();

    // will become deprecated for supporting substrate connect light clients. apiType structure should be used instead
    this.#apiUrl =
      (typeof settings.apiUrl === 'string' && settings.apiUrl) ||
      (_util.hasProcess && process.env && process.env.WS_URL) ||
      _defaults.ENDPOINT_DEFAULT.value;
    this.#apiType = {
      param: this.#apiUrl,
      type: 'json-rpc',
    };
    this.#camera = withDefault(_defaults.CAMERA, settings.camera, _defaults.CAMERA_DEFAULT);
    this.#ledgerConn = withDefault(_defaults.LEDGER_CONN, settings.ledgerConn, _defaults.LEDGER_CONN_DEFAULT);
    this.#i18nLang = settings.i18nLang || _defaults.LANGUAGE_DEFAULT;
    this.#icon = settings.icon || _defaults.ICON_DEFAULT;
    this.#locking = settings.locking || _defaults.LOCKING_DEFAULT;
    this.#metadataUp = withDefault(_defaults.METADATA_UP, settings.storage, _defaults.METADATA_UP_DEFAULT);
    this.#notification = settings.notification || _defaults.NOTIFICATION_DEFAULT;
    this.#prefix = (0, _util.isUndefined)(settings.prefix) ? _defaults.PREFIX_DEFAULT : settings.prefix;
    this.#storage = withDefault(_defaults.STORAGE, settings.storage, _defaults.STORAGE_DEFAULT);
    this.#uiMode = settings.uiMode || _defaults.UIMODE_DEFAULT;
    this.#uiTheme = settings.uiTheme || _defaults.UITHEME_DEFAULT;
  }
  get camera() {
    return this.#camera;
  }
  get apiType() {
    return this.#apiType;
  }
  get apiUrl() {
    return this.#apiUrl;
  }
  get i18nLang() {
    return this.#i18nLang;
  }
  get icon() {
    return this.#icon;
  }
  get notification() {
    return this.#notification;
  }
  get ledgerConn() {
    return this.#ledgerConn;
  }
  get locking() {
    return this.#locking;
  }
  get metadataUp() {
    return this.#metadataUp;
  }
  get prefix() {
    return this.#prefix;
  }
  get storage() {
    return this.#storage;
  }
  get uiMode() {
    return this.#uiMode;
  }
  get uiTheme() {
    return this.#uiTheme;
  }
  get availableCamera() {
    return _defaults.CAMERA;
  }
  get availableCryptos() {
    return _defaults.CRYPTOS;
  }
  get availableCryptosEth() {
    return _defaults.CRYPTOS_ETH;
  }
  get availableCryptosLedger() {
    return _defaults.CRYPTOS_LEDGER;
  }
  get availableIcons() {
    return _defaults.ICONS;
  }
  get availableLedgerConn() {
    return _defaults.LEDGER_CONN;
  }
  get availableLocking() {
    return _defaults.LOCKING;
  }
  get availableMetadataUp() {
    return _defaults.METADATA_UP;
  }
  get availableNodes() {
    return _defaults.ENDPOINTS;
  }
  get availablePrefixes() {
    return _defaults.PREFIXES;
  }
  get availableStorage() {
    return _defaults.STORAGE;
  }
  get availableUIModes() {
    return _defaults.UIMODES;
  }
  get availableUIThemes() {
    return _defaults.UITHEMES;
  }
  get() {
    return {
      apiType: this.#apiType,
      apiUrl: this.#apiUrl,
      camera: this.#camera,
      i18nLang: this.#i18nLang,
      icon: this.#icon,
      ledgerConn: this.#ledgerConn,
      locking: this.#locking,
      metadataUp: this.#metadataUp,
      notification: this.#notification,
      prefix: this.#prefix,
      storage: this.#storage,
      uiMode: this.#uiMode,
      uiTheme: this.#uiTheme,
    };
  }
  set(settings) {
    this.#apiType = settings.apiType || this.#apiType;
    this.#apiUrl = settings.apiUrl || this.#apiUrl;
    this.#camera = settings.camera || this.#camera;
    this.#ledgerConn = settings.ledgerConn || this.#ledgerConn;
    this.#i18nLang = settings.i18nLang || this.#i18nLang;
    this.#icon = settings.icon || this.#icon;
    this.#locking = settings.locking || this.#locking;
    this.#metadataUp = settings.metadataUp || this.#metadataUp;
    this.#notification = settings.notification || this.#notification;
    this.#prefix = (0, _util.isUndefined)(settings.prefix) ? this.#prefix : settings.prefix;
    this.#storage = settings.storage || this.#storage;
    this.#uiMode = settings.uiMode || this.#uiMode;
    this.#uiTheme = settings.uiTheme || this.#uiTheme;
    const newValues = this.get();
    _store.default.set('settings', newValues);
    this.#emitter.emit('change', newValues);
  }
  on(type, cb) {
    this.#emitter.on(type, cb);
  }
}
exports.Settings = Settings;
const settings = new Settings();
exports.settings = settings;
