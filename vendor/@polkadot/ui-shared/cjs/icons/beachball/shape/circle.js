'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.circle = circle;
const defaults_js_1 = require('../defaults.js');
const circle_js_1 = require('../svg/circle.js');
function circle(seeder, fill, diameter, count) {
  const center = diameter / 2;
  const angle = seeder() * 360;
  const radius =
    ((defaults_js_1.SHAPE_COUNT - count) / defaults_js_1.SHAPE_COUNT) * (diameter / 2) + (diameter / 8) * seeder();
  const offset = (diameter / 4) * (seeder() + (count + 1) / defaults_js_1.SHAPE_COUNT);
  const cx = offset * Math.sin(angle) + center;
  const cy = offset * Math.cos(angle) + center;
  const svg = (0, circle_js_1.circle)(radius, cx, cy);
  svg.setAttributeNS('', 'fill', fill);
  return svg;
}
