'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.readTemplate = readTemplate;
exports.writeFile = writeFile;
var _fs = _interopRequireDefault(require('fs'));
var _path = _interopRequireDefault(require('path'));
var _process = _interopRequireDefault(require('process'));
var _packageInfo = require('../packageInfo');
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

function writeFile(dest, generator, noLog) {
  !noLog && console.log(`${dest}\n\tGenerating`);
  let generated = generator();
  while (generated.includes('\n\n\n')) {
    generated = generated.replace(/\n\n\n/g, '\n\n');
  }
  !noLog && console.log('\tWriting');
  _fs.default.writeFileSync(dest, generated, {
    flag: 'w',
  });
  !noLog && console.log('');
}
function readTemplate(template) {
  // Inside the api repo itself, it will be 'auto'
  const rootDir =
    _packageInfo.packageInfo.path === 'auto'
      ? _path.default.join(_process.default.cwd(), 'packages/typegen/src')
      : _packageInfo.packageInfo.path;

  // NOTE With cjs in a subdir, search one lower as well
  const file = ['./templates', '../templates']
    .map((p) => _path.default.join(rootDir, p, `${template}.hbs`))
    .find((p) => _fs.default.existsSync(p));
  if (!file) {
    throw new Error(`Unable to locate ${template}.hbs from ${rootDir}`);
  }
  return _fs.default.readFileSync(file).toString();
}
