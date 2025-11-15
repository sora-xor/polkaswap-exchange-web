'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.square = square;
const defaults_js_1 = require('../defaults.js');
const rect_js_1 = require('../svg/rect.js');
function square(seeder, fill, diameter, count) {
  const center = diameter / 2;
  const svg = (0, rect_js_1.rect)(diameter);
  const firstRot = seeder();
  const angle = Math.PI * 2 * firstRot;
  const scale = count / defaults_js_1.SHAPE_COUNT;
  const velocity = (diameter / defaults_js_1.SHAPE_COUNT) * seeder() + scale * diameter;
  const tx = (Math.cos(angle) * velocity).toFixed(3);
  const ty = (Math.sin(angle) * velocity).toFixed(3);
  const rot = (firstRot * 360 + seeder() * 180).toFixed(1);
  svg.setAttributeNS('', 'transform', `translate(${tx} ${ty}) rotate(${rot} ${center} ${center})`);
  svg.setAttributeNS('', 'fill', fill);
  return svg;
}
