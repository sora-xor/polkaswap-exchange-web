'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.seeder = seeder;
const util_1 = require('@polkadot/util');
const DIVISOR = 256 * 256;
function seeder(_seed = new Uint8Array(32)) {
  const seed = (0, util_1.isU8a)(_seed) ? _seed : (0, util_1.stringToU8a)(_seed);
  let index = (seed[Math.floor(seed.length / 2)] % seed.length) - 1;
  const next = () => {
    index += 1;
    if (index === seed.length) {
      index = 0;
    }
    return seed[index];
  };
  return () => {
    return (next() * 256 + next()) / DIVISOR;
  };
}
