'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.colors = colors;
const colord_1 = require('colord');
const defaults_js_1 = require('./defaults.js');
const WOBBLE = 30;
function colors(seeder) {
  const amount = seeder() * WOBBLE - WOBBLE / 2;
  const all = defaults_js_1.COLORS.map((hex) => (0, colord_1.colord)(hex).rotate(amount));
  return (alpha = 1) => {
    const index = Math.floor(all.length * seeder());
    return all.splice(index, 1)[0].alpha(alpha).toHslString();
  };
}
