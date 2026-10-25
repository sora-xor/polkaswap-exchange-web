// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import { assert } from '@polkadot/util';

// NOTE untested and unused by any known apps, probably broken in various mysterious ways
export class FileStore {
  #path;
  constructor(path) {
    if (!fs.existsSync(path)) {
      mkdirp.sync(path);
    }
    this.#path = path;
  }
  all(fn) {
    fs.readdirSync(this.#path)
      .filter((key) => !['.', '..', '.DS_Store'].includes(key))
      .forEach((key) => {
        const value = this._readKey(key);
        (value == null ? void 0 : value.address) && fn(key, value);
      });
  }
  get(key, fn) {
    const value = this._readKey(key);
    assert(value == null ? void 0 : value.address, `Invalid JSON found for ${key}`);
    fn(value);
  }
  remove(key, fn) {
    fs.unlinkSync(this._getPath(key));
    fn && fn();
  }
  set(key, value, fn) {
    fs.writeFileSync(this._getPath(key), Buffer.from(JSON.stringify(value), 'utf-8'));
    fn && fn();
  }
  _getPath(key) {
    return path.join(this.#path, key);
  }
  _readKey(key) {
    try {
      return JSON.parse(fs.readFileSync(this._getPath(key)).toString('utf-8'));
    } catch (error) {
      console.error(error);
    }
    return undefined;
  }
}
