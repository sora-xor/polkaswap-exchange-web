'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
var _exportNames = {
  compareName: true,
};
exports.compareName = compareName;
var _assert = require('./assert');
Object.keys(_assert).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _assert[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _assert[key];
    },
  });
});
var _derived = require('./derived');
Object.keys(_derived).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _derived[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _derived[key];
    },
  });
});
var _docs = require('./docs');
Object.keys(_docs).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _docs[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _docs[key];
    },
  });
});
var _file = require('./file');
Object.keys(_file).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _file[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _file[key];
    },
  });
});
var _formatting = require('./formatting');
Object.keys(_formatting).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _formatting[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _formatting[key];
    },
  });
});
var _imports = require('./imports');
Object.keys(_imports).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _imports[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _imports[key];
    },
  });
});
var _initMeta = require('./initMeta');
Object.keys(_initMeta).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _initMeta[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _initMeta[key];
    },
  });
});
var _register = require('./register');
Object.keys(_register).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _register[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _register[key];
    },
  });
});
var _wsMeta = require('./wsMeta');
Object.keys(_wsMeta).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _wsMeta[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _wsMeta[key];
    },
  });
});
// Copyright 2017-2023 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

function compareName(a, b) {
  return a.name.toString().localeCompare(b.name.toString());
}
