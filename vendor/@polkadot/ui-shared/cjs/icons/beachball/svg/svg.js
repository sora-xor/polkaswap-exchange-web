'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.svg = svg;
const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(type) {
  return document.createElementNS(SVG_NS, type);
}
