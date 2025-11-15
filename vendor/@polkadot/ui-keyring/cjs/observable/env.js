'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.env = void 0;
var _rxjs = require('rxjs');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

const subject = new _rxjs.BehaviorSubject(false);
const env = {
  isDevelopment: () => subject.getValue(),
  set: (isDevelopment) => {
    subject.next(isDevelopment);
  },
  subject,
};
exports.env = env;
