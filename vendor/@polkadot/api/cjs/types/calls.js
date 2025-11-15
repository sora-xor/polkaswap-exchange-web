'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
var _calls = require('@polkadot/api-base/types/calls');
Object.keys(_calls).forEach(function (key) {
  if (key === 'default' || key === '__esModule') return;
  if (key in exports && exports[key] === _calls[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _calls[key];
    },
  });
});
