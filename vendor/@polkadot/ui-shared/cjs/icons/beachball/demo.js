'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const util_1 = require('@polkadot/util');
const util_crypto_1 = require('@polkadot/util-crypto');
const index_js_1 = require('./index.js');
const element = document.getElementById('demo');
function generateIcon(seed = (0, util_crypto_1.encodeAddress)((0, util_crypto_1.randomAsU8a)(32))) {
  const start = Date.now();
  if ((0, util_1.isNull)(element)) {
    throw new Error('Unable to find #demo element');
  }
  element.appendChild((0, index_js_1.beachballIcon)(seed, { isAlternative: false, size: 100 }, 'padded'));
  console.log(`Icon generated in ${Date.now() - start}ms`);
}
function generateIcons(count = 512) {
  generateIcon((0, util_crypto_1.encodeAddress)(new Uint8Array(32)));
  for (let index = 1; index < count; index++) {
    generateIcon();
  }
}
generateIcons();
