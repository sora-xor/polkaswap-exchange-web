'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.element = element;
const svg_js_1 = require('./svg.js');
function element(size, type = 'svg', x = 0, y = 0) {
  const elem = (0, svg_js_1.svg)(type);
  elem.setAttributeNS('', 'x', `${x}`);
  elem.setAttributeNS('', 'y', `${y}`);
  elem.setAttributeNS('', 'width', `${size}`);
  elem.setAttributeNS('', 'height', `${size}`);
  return elem;
}
