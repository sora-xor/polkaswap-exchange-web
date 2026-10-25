'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.circle = circle;
const svg_js_1 = require('./svg.js');
function circle(r, cx, cy) {
  const elem = (0, svg_js_1.svg)('circle');
  elem.setAttributeNS('', 'cx', `${cx}`);
  elem.setAttributeNS('', 'cy', `${cy}`);
  elem.setAttributeNS('', 'r', `${r}`);
  return elem;
}
