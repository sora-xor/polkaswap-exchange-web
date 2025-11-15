// Copyright 2017-2023 @polkadot/ui-settings authors & contributors
// SPDX-License-Identifier: Apache-2.0

import EventEmitter from 'eventemitter3';
import store from 'store';
import { hasProcess, isUndefined } from '@polkadot/util';
import {
  CAMERA,
  CAMERA_DEFAULT,
  CRYPTOS,
  CRYPTOS_ETH,
  CRYPTOS_LEDGER,
  ENDPOINT_DEFAULT,
  ENDPOINTS,
  ICON_DEFAULT,
  ICONS,
  LANGUAGE_DEFAULT,
  LEDGER_CONN,
  LEDGER_CONN_DEFAULT,
  LOCKING,
  LOCKING_DEFAULT,
  METADATA_UP,
  METADATA_UP_DEFAULT,
  NOTIFICATION_DEFAULT,
  PREFIX_DEFAULT,
  PREFIXES,
  STORAGE,
  STORAGE_DEFAULT,
  UIMODE_DEFAULT,
  UIMODES,
  UITHEME_DEFAULT,
  UITHEMES,
} from './defaults/index.js';
function withDefault(options, option, fallback) {
  const _option = option || fallback;
  return options.some(({ value }) => value === _option) ? _option : fallback;
}
export class Settings {
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
    const settings = store.get('settings') || {};
    this.#emitter = new EventEmitter();

    // will become deprecated for supporting substrate connect light clients. apiType structure should be used instead
    this.#apiUrl =
      (typeof settings.apiUrl === 'string' && settings.apiUrl) ||
      (hasProcess && process.env && process.env.WS_URL) ||
      ENDPOINT_DEFAULT.value;
    this.#apiType = {
      param: this.#apiUrl,
      type: 'json-rpc',
    };
    this.#camera = withDefault(CAMERA, settings.camera, CAMERA_DEFAULT);
    this.#ledgerConn = withDefault(LEDGER_CONN, settings.ledgerConn, LEDGER_CONN_DEFAULT);
    this.#i18nLang = settings.i18nLang || LANGUAGE_DEFAULT;
    this.#icon = settings.icon || ICON_DEFAULT;
    this.#locking = settings.locking || LOCKING_DEFAULT;
    this.#metadataUp = withDefault(METADATA_UP, settings.storage, METADATA_UP_DEFAULT);
    this.#notification = settings.notification || NOTIFICATION_DEFAULT;
    this.#prefix = isUndefined(settings.prefix) ? PREFIX_DEFAULT : settings.prefix;
    this.#storage = withDefault(STORAGE, settings.storage, STORAGE_DEFAULT);
    this.#uiMode = settings.uiMode || UIMODE_DEFAULT;
    this.#uiTheme = settings.uiTheme || UITHEME_DEFAULT;
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
    return CAMERA;
  }
  get availableCryptos() {
    return CRYPTOS;
  }
  get availableCryptosEth() {
    return CRYPTOS_ETH;
  }
  get availableCryptosLedger() {
    return CRYPTOS_LEDGER;
  }
  get availableIcons() {
    return ICONS;
  }
  get availableLedgerConn() {
    return LEDGER_CONN;
  }
  get availableLocking() {
    return LOCKING;
  }
  get availableMetadataUp() {
    return METADATA_UP;
  }
  get availableNodes() {
    return ENDPOINTS;
  }
  get availablePrefixes() {
    return PREFIXES;
  }
  get availableStorage() {
    return STORAGE;
  }
  get availableUIModes() {
    return UIMODES;
  }
  get availableUIThemes() {
    return UITHEMES;
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
    this.#prefix = isUndefined(settings.prefix) ? this.#prefix : settings.prefix;
    this.#storage = settings.storage || this.#storage;
    this.#uiMode = settings.uiMode || this.#uiMode;
    this.#uiTheme = settings.uiTheme || this.#uiTheme;
    const newValues = this.get();
    store.set('settings', newValues);
    this.#emitter.emit('change', newValues);
  }
  on(type, cb) {
    this.#emitter.on(type, cb);
  }
}
export const settings = new Settings();
