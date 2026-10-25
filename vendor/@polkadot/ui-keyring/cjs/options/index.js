'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.KeyringOption = void 0;
var _rxjs = require('rxjs');
var _util = require('@polkadot/util');
var _observable = require('../observable');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

let hasCalledInitOptions = false;
const sortByName = (a, b) => {
  const valueA = a.option.name;
  const valueB = b.option.name;
  return valueA.localeCompare(valueB);
};
const sortByCreated = (a, b) => {
  const valueA = a.json.meta.whenCreated || 0;
  const valueB = b.json.meta.whenCreated || 0;
  if (valueA < valueB) {
    return 1;
  }
  if (valueA > valueB) {
    return -1;
  }
  return 0;
};
class KeyringOption {
  optionsSubject = new _rxjs.BehaviorSubject(this.emptyOptions());
  createOptionHeader(name) {
    return {
      key: `header-${name.toLowerCase()}`,
      name,
      value: null,
    };
  }
  init(keyring) {
    (0, _util.assert)(!hasCalledInitOptions, 'Unable to initialise options more than once');
    _observable.obervableAll.subscribe(() => {
      const opts = this.emptyOptions();
      this.addAccounts(keyring, opts);
      this.addAddresses(keyring, opts);
      this.addContracts(keyring, opts);
      opts.address = this.linkItems({
        Addresses: opts.address,
        Recent: opts.recent,
      });
      opts.account = this.linkItems({
        Accounts: opts.account,
        Development: opts.testing,
      });
      opts.contract = this.linkItems({
        Contracts: opts.contract,
      });
      opts.all = [].concat(opts.account, opts.address);
      opts.allPlus = [].concat(opts.account, opts.address, opts.contract);
      this.optionsSubject.next(opts);
    });
    hasCalledInitOptions = true;
  }
  linkItems(items) {
    return Object.keys(items).reduce((result, header) => {
      const options = items[header];
      return result.concat(options.length ? [this.createOptionHeader(header)] : [], options);
    }, []);
  }
  addAccounts(keyring, options) {
    const available = keyring.accounts.subject.getValue();
    Object.values(available)
      .sort(sortByName)
      .forEach((_ref) => {
        let {
          json: {
            meta: { isTesting = false },
          },
          option,
        } = _ref;
        if (!isTesting) {
          options.account.push(option);
        } else {
          options.testing.push(option);
        }
      });
  }
  addAddresses(keyring, options) {
    const available = keyring.addresses.subject.getValue();
    Object.values(available)
      .filter((_ref2) => {
        let { json } = _ref2;
        return !!json.meta.isRecent;
      })
      .sort(sortByCreated)
      .forEach((_ref3) => {
        let { option } = _ref3;
        options.recent.push(option);
      });
    Object.values(available)
      .filter((_ref4) => {
        let { json } = _ref4;
        return !json.meta.isRecent;
      })
      .sort(sortByName)
      .forEach((_ref5) => {
        let { option } = _ref5;
        options.address.push(option);
      });
  }
  addContracts(keyring, options) {
    const available = keyring.contracts.subject.getValue();
    Object.values(available)
      .sort(sortByName)
      .forEach((_ref6) => {
        let { option } = _ref6;
        options.contract.push(option);
      });
  }
  emptyOptions() {
    return {
      account: [],
      address: [],
      all: [],
      allPlus: [],
      contract: [],
      recent: [],
      testing: [],
    };
  }
}
exports.KeyringOption = KeyringOption;
