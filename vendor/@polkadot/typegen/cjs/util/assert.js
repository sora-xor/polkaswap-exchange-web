'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.assertDir = assertDir;
exports.assertFile = assertFile;
var _fs = _interopRequireDefault(require('fs'));
var _util = require('@polkadot/util');
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

function assertDir(path) {
  (0, _util.assert)(
    _fs.default.existsSync(path) && _fs.default.lstatSync(path).isDirectory(),
    `${path} is not a directory`
  );
  return path;
}
function assertFile(path) {
  (0, _util.assert)(_fs.default.existsSync(path) && _fs.default.lstatSync(path).isFile(), `${path} is not a file`);
  return path;
}
