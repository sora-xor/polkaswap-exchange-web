'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.beachballIcon = beachballIcon;
const circle_js_1 = require('./shape/circle.js');
const element_js_1 = require('./svg/element.js');
const colors_js_1 = require('./colors.js');
const container_js_1 = require('./container.js');
const defaults_js_1 = require('./defaults.js');
const seeder_js_1 = require('./seeder.js');
function beachballIcon(seed, { size = 256 }, className = '', style) {
  const seeder = (0, seeder_js_1.seeder)(seed);
  const colorGen = (0, colors_js_1.colors)(seeder);
  const outer = (0, container_js_1.container)(size, 'white', className, style);
  const container = (0, container_js_1.container)(size, colorGen());
  const svg = (0, element_js_1.element)(size);
  outer.appendChild(container);
  container.appendChild(svg);
  for (let count = 0; count < defaults_js_1.SHAPE_COUNT; count++) {
    const fill = colorGen();
    const shape = (0, circle_js_1.circle)(seeder, fill, size, count);
    svg.appendChild(shape);
  }
  return outer;
}
