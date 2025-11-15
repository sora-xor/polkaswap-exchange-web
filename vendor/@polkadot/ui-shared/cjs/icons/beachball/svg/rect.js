'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.rect = rect;
const element_js_1 = require('./element.js');
function rect(size) {
  const elem = (0, element_js_1.element)(size, 'rect');
  elem.setAttributeNS('', 'rx', `${size / 16}`);
  elem.setAttributeNS('', 'ry', `${size / 16}`);
  return elem;
}
