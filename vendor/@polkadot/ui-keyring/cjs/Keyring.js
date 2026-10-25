'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.Keyring = void 0;
var _keyring = require('@polkadot/keyring');
var _uiSettings = require('@polkadot/ui-settings');
var _util = require('@polkadot/util');
var _utilCrypto = require('@polkadot/util-crypto');
var _env = require('./observable/env');
var _Base = require('./Base');
var _defaults = require('./defaults');
var _options = require('./options');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

const RECENT_EXPIRY = 24 * 60 * 60;

// No accounts (or test accounts) should be loaded until after the chain determination.
// Chain determination occurs outside of Keyring. Loading `keyring.loadAll({ type: 'ed25519' | 'sr25519' })` is triggered
// from the API after the chain is received
class Keyring extends _Base.Base {
  keyringOption = new _options.KeyringOption();
  #stores = {
    account: () => this.accounts,
    address: () => this.addresses,
    contract: () => this.contracts,
  };
  addExternal(address) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const pair = this.keyring.addFromAddress(
      address,
      (0, _util.objectSpread)({}, meta, {
        isExternal: true,
      }),
      null
    );
    return {
      json: this.saveAccount(pair),
      pair,
    };
  }
  addHardware(address, hardwareType) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return this.addExternal(
      address,
      (0, _util.objectSpread)({}, meta, {
        hardwareType,
        isHardware: true,
      })
    );
  }
  addMultisig(addresses, threshold) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const address = (0, _utilCrypto.createKeyMulti)(addresses, threshold);

    // we could use `sortAddresses`, but rather use internal encode/decode so we are 100%
    const who = (0, _util.u8aSorted)(addresses.map((who) => this.decodeAddress(who))).map((who) =>
      this.encodeAddress(who)
    );
    return this.addExternal(
      address,
      (0, _util.objectSpread)({}, meta, {
        isMultisig: true,
        threshold: (0, _util.bnToBn)(threshold).toNumber(),
        who,
      })
    );
  }
  addPair(pair, password) {
    this.keyring.addPair(pair);
    return {
      json: this.saveAccount(pair, password),
      pair,
    };
  }
  addUri(suri, password) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    let type = arguments.length > 3 ? arguments[3] : undefined;
    const pair = this.keyring.addFromUri(suri, meta, type);
    return {
      json: this.saveAccount(pair, password),
      pair,
    };
  }
  backupAccount(pair, password) {
    if (!pair.isLocked) {
      pair.lock();
    }
    pair.decodePkcs8(password);
    return pair.toJson(password);
  }
  async backupAccounts(addresses, password) {
    const accountPromises = addresses.map((address) => {
      return new Promise((resolve) => {
        this._store.get((0, _defaults.accountKey)(address), resolve);
      });
    });
    const accounts = await Promise.all(accountPromises);
    return (0, _util.objectSpread)(
      {},
      (0, _utilCrypto.jsonEncrypt)((0, _util.stringToU8a)(JSON.stringify(accounts)), ['batch-pkcs8'], password),
      {
        accounts: accounts.map((account) => ({
          address: account.address,
          meta: account.meta,
        })),
      }
    );
  }
  createFromJson(json) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return this.keyring.createFromJson(
      (0, _util.objectSpread)({}, json, {
        meta: (0, _util.objectSpread)({}, json.meta, meta),
      })
    );
  }
  createFromUri(suri) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let type = arguments.length > 2 ? arguments[2] : undefined;
    return this.keyring.createFromUri(suri, meta, type);
  }
  encryptAccount(pair, password) {
    const json = pair.toJson(password);
    json.meta.whenEdited = Date.now();
    this.keyring.addFromJson(json);
    this.accounts.add(this._store, pair.address, json, pair.type);
  }
  forgetAccount(address) {
    this.keyring.removePair(address);
    this.accounts.remove(this._store, address);
  }
  forgetAddress(address) {
    this.addresses.remove(this._store, address);
  }
  forgetContract(address) {
    this.contracts.remove(this._store, address);
  }
  getAccount(address) {
    return this.getAddress(address, 'account');
  }
  getAccounts() {
    const available = this.accounts.subject.getValue();
    return Object.keys(available)
      .map((address) => this.getAddress(address, 'account'))
      .filter((account) => _env.env.isDevelopment() || account.meta.isTesting !== true);
  }
  getAddress(_address) {
    let type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    const address = (0, _util.isString)(_address) ? _address : this.encodeAddress(_address);
    const publicKey = this.decodeAddress(address);
    const stores = type ? [this.#stores[type]] : Object.values(this.#stores);
    const info = stores.reduce((lastInfo, store) => store().subject.getValue()[address] || lastInfo, undefined);
    return (
      info && {
        address,
        meta: info.json.meta,
        publicKey,
      }
    );
  }
  getAddresses() {
    const available = this.addresses.subject.getValue();
    return Object.keys(available).map((address) => this.getAddress(address));
  }
  getContract(address) {
    return this.getAddress(address, 'contract');
  }
  getContracts() {
    const available = this.contracts.subject.getValue();
    return Object.entries(available)
      .filter((_ref) => {
        let [
          ,
          {
            json: {
              meta: { contract },
            },
          },
        ] = _ref;
        return !!contract && contract.genesisHash === this.genesisHash;
      })
      .map((_ref2) => {
        let [address] = _ref2;
        return this.getContract(address);
      });
  }
  rewriteKey(json, key, hexAddr, creator) {
    if (hexAddr.substring(0, 2) === '0x') {
      return;
    }
    this._store.remove(key);
    this._store.set(creator(hexAddr), json);
  }
  loadAccount(json, key) {
    if (!json.meta.isTesting && json.encoded) {
      const pair = this.keyring.addFromJson(json, true);
      this.accounts.add(this._store, pair.address, json, pair.type);
    }
    const [, hexAddr] = key.split(':');
    this.rewriteKey(json, key, hexAddr.trim(), _defaults.accountKey);
  }
  loadAddress(json, key) {
    const { isRecent, whenCreated = 0 } = json.meta;
    if (isRecent && Date.now() - whenCreated > RECENT_EXPIRY) {
      this._store.remove(key);
      return;
    }

    // We assume anything hex that is not 32bytes (64 + 2 bytes hex) is an Ethereum-like address
    // (this caters for both H160 addresses as well as full or compressed publicKeys) - in the case
    // of both ecdsa and ethereum, we keep it as-is
    const address =
      (0, _util.isHex)(json.address) && json.address.length !== 66
        ? json.address
        : this.encodeAddress(
            (0, _util.isHex)(json.address)
              ? (0, _util.hexToU8a)(json.address)
              : // FIXME Just for the transition period (ignoreChecksum)
                this.decodeAddress(json.address, true)
          );
    const [, hexAddr] = key.split(':');
    this.addresses.add(this._store, address, json);
    this.rewriteKey(json, key, hexAddr, _defaults.addressKey);
  }
  loadContract(json, key) {
    const address = this.encodeAddress(this.decodeAddress(json.address));
    const [, hexAddr] = key.split(':');

    // move genesisHash to top-level (TODO Remove from contracts section?)
    json.meta.genesisHash = json.meta.genesisHash || (json.meta.contract && json.meta.contract.genesisHash);
    this.contracts.add(this._store, address, json);
    this.rewriteKey(json, key, hexAddr, _defaults.contractKey);
  }
  loadInjected(address, meta, type) {
    const json = {
      address,
      meta: (0, _util.objectSpread)({}, meta, {
        isInjected: true,
      }),
    };
    const pair = this.keyring.addFromAddress(address, json.meta, null, type);
    this.accounts.add(this._store, pair.address, json, pair.type);
  }
  allowGenesis(json) {
    if (json && json.meta && this.genesisHash) {
      const hashes = Object.values(_uiSettings.chains).find((hashes) => hashes.includes(this.genesisHash || '')) || [
        this.genesisHash,
      ];
      if (json.meta.genesisHash) {
        return hashes.includes(json.meta.genesisHash) || this.genesisHashes.includes(json.meta.genesisHash);
      } else if (json.meta.contract) {
        return hashes.includes(json.meta.contract.genesisHash);
      }
    }
    return true;
  }
  loadAll(options) {
    let injected = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super.initKeyring(options);
    this._store.all((key, json) => {
      if (!(0, _util.isFunction)(options.filter) || options.filter(json)) {
        try {
          if (this.allowGenesis(json)) {
            if (_defaults.accountRegex.test(key)) {
              this.loadAccount(json, key);
            } else if (_defaults.addressRegex.test(key)) {
              this.loadAddress(json, key);
            } else if (_defaults.contractRegex.test(key)) {
              this.loadContract(json, key);
            }
          }
        } catch (error) {
          console.warn(`Keyring: Unable to load ${key}:${(0, _util.stringify)(json)}`);
        }
      }
    });
    injected.forEach((account) => {
      if (this.allowGenesis(account)) {
        try {
          this.loadInjected(account.address, account.meta, account.type);
        } catch (error) {
          console.warn(`Keyring: Unable to inject ${(0, _util.stringify)(account)}`);
        }
      }
    });
    this.keyringOption.init(this);
  }
  restoreAccount(json, password) {
    const cryptoType = Array.isArray(json.encoding.content) ? json.encoding.content[1] : 'ed25519';
    const encType = Array.isArray(json.encoding.type) ? json.encoding.type : [json.encoding.type];
    const pair = (0, _keyring.createPair)(
      {
        toSS58: this.encodeAddress,
        type: cryptoType,
      },
      {
        publicKey: this.decodeAddress(json.address, true),
      },
      json.meta,
      (0, _util.isHex)(json.encoded) ? (0, _util.hexToU8a)(json.encoded) : (0, _utilCrypto.base64Decode)(json.encoded),
      encType
    );

    // unlock, save account and then lock (locking cleans secretKey, so needs to be last)
    pair.decodePkcs8(password);
    this.addPair(pair, password);
    pair.lock();
    return pair;
  }
  restoreAccounts(json, password) {
    const accounts = JSON.parse((0, _util.u8aToString)((0, _utilCrypto.jsonDecrypt)(json, password)));
    accounts.forEach((account) => {
      this.loadAccount(account, (0, _defaults.accountKey)(account.address));
    });
  }
  saveAccount(pair, password) {
    this.addTimestamp(pair);
    const json = pair.toJson(password);
    this.keyring.addFromJson(json);
    this.accounts.add(this._store, pair.address, json, pair.type);
    return json;
  }
  saveAccountMeta(pair, meta) {
    const address = pair.address;
    this._store.get((0, _defaults.accountKey)(address), (json) => {
      pair.setMeta(meta);
      json.meta = pair.meta;
      this.accounts.add(this._store, address, json, pair.type);
    });
  }
  saveAddress(address, meta) {
    let type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'address';
    const available = this.addresses.subject.getValue();
    const json = (available[address] && available[address].json) || {
      address,
      meta: {
        isRecent: undefined,
        whenCreated: Date.now(),
      },
    };
    Object.keys(meta).forEach((key) => {
      json.meta[key] = meta[key];
    });
    delete json.meta.isRecent;
    this.#stores[type]().add(this._store, address, json);
    return json;
  }
  saveContract(address, meta) {
    return this.saveAddress(address, meta, 'contract');
  }
  saveRecent(address) {
    const available = this.addresses.subject.getValue();
    if (!available[address]) {
      this.addresses.add(this._store, address, {
        address,
        meta: {
          genesisHash: this.genesisHash,
          isRecent: true,
          whenCreated: Date.now(),
        },
      });
    }
    return this.addresses.subject.getValue()[address];
  }
}
exports.Keyring = Keyring;
