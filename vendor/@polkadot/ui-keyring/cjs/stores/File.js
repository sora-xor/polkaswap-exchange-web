'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.FileStore = void 0;
var _fs = _interopRequireDefault(require('fs'));
var _mkdirp = _interopRequireDefault(require('mkdirp'));
var _path = _interopRequireDefault(require('path'));
var _util = require('@polkadot/util');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

// NOTE untested and unused by any known apps, probably broken in various mysterious ways
class FileStore {
  #path;
  constructor(path) {
    if (!_fs.default.existsSync(path)) {
      _mkdirp.default.sync(path);
    }
    this.#path = path;
  }
  all(fn) {
    _fs.default
      .readdirSync(this.#path)
      .filter((key) => !['.', '..', '.DS_Store'].includes(key))
      .forEach((key) => {
        const value = this._readKey(key);
        (value == null ? void 0 : value.address) && fn(key, value);
      });
  }
  get(key, fn) {
    const value = this._readKey(key);
    (0, _util.assert)(value == null ? void 0 : value.address, `Invalid JSON found for ${key}`);
    fn(value);
  }
  remove(key, fn) {
    _fs.default.unlinkSync(this._getPath(key));
    fn && fn();
  }
  set(key, value, fn) {
    _fs.default.writeFileSync(this._getPath(key), Buffer.from(JSON.stringify(value), 'utf-8'));
    fn && fn();
  }
  _getPath(key) {
    return _path.default.join(this.#path, key);
  }
  _readKey(key) {
    try {
      return JSON.parse(_fs.default.readFileSync(this._getPath(key)).toString('utf-8'));
    } catch (error) {
      console.error(error);
    }
    return undefined;
  }
}
exports.FileStore = FileStore;
