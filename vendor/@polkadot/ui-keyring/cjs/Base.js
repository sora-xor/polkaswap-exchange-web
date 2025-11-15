'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.Base = void 0;
var _keyring = require('@polkadot/keyring');
var _util = require('@polkadot/util');
var _accounts = require('./observable/accounts');
var _addresses = require('./observable/addresses');
var _contracts = require('./observable/contracts');
var _env = require('./observable/env');
var _Browser = require('./stores/Browser');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

// direct import (skip index with all)

class Base {
  #accounts;
  #addresses;
  #contracts;
  #keyring;
  _genesisHashAdd = [];
  constructor() {
    this.#accounts = _accounts.accounts;
    this.#addresses = _addresses.addresses;
    this.#contracts = _contracts.contracts;
    this._store = new _Browser.BrowserStore();
  }
  get accounts() {
    return this.#accounts;
  }
  get addresses() {
    return this.#addresses;
  }
  get contracts() {
    return this.#contracts;
  }
  get keyring() {
    if (this.#keyring) {
      return this.#keyring;
    }
    throw new Error("Keyring should be initialised via 'loadAll' before use");
  }
  get genesisHash() {
    return this._genesisHash;
  }
  get genesisHashes() {
    return this._genesisHash ? [this._genesisHash, ...this._genesisHashAdd] : [...this._genesisHashAdd];
  }
  decodeAddress = (key, ignoreChecksum, ss58Format) => {
    return this.keyring.decodeAddress(key, ignoreChecksum, ss58Format);
  };
  encodeAddress = (key, ss58Format) => {
    return this.keyring.encodeAddress(key, ss58Format);
  };
  getPair(address) {
    return this.keyring.getPair(address);
  }
  getPairs() {
    return this.keyring.getPairs().filter((pair) => _env.env.isDevelopment() || pair.meta.isTesting !== true);
  }
  isAvailable(_address) {
    const accountsValue = this.accounts.subject.getValue();
    const addressesValue = this.addresses.subject.getValue();
    const contractsValue = this.contracts.subject.getValue();
    const address = (0, _util.isString)(_address) ? _address : this.encodeAddress(_address);
    return !accountsValue[address] && !addressesValue[address] && !contractsValue[address];
  }
  isPassValid(password) {
    return password.length > 0;
  }
  setSS58Format(ss58Format) {
    if (this.#keyring && (0, _util.isNumber)(ss58Format)) {
      this.#keyring.setSS58Format(ss58Format);
    }
  }
  setDevMode(isDevelopment) {
    _env.env.set(isDevelopment);
  }
  initKeyring(options) {
    const keyring = (0, _keyring.createTestKeyring)(options, true);
    if ((0, _util.isBoolean)(options.isDevelopment)) {
      this.setDevMode(options.isDevelopment);
    }
    this.#keyring = keyring;
    this._genesisHash =
      options.genesisHash &&
      ((0, _util.isString)(options.genesisHash) ? options.genesisHash.toString() : options.genesisHash.toHex());
    this._genesisHashAdd = options.genesisHashAdd || [];
    this._store = options.store || this._store;
    this.addAccountPairs();
  }
  addAccountPairs() {
    this.keyring.getPairs().forEach((_ref) => {
      let { address, meta } = _ref;
      this.accounts.add(this._store, address, {
        address,
        meta,
      });
    });
  }
  addTimestamp(pair) {
    if (!pair.meta.whenCreated) {
      pair.setMeta({
        whenCreated: Date.now(),
      });
    }
  }
}
exports.Base = Base;
