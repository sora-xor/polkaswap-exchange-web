'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Empty = void 0;
const vue_1 = require('vue');
/**
 * @name Empty
 * @description An empty identicon
 */
exports.Empty = (0, vue_1.defineComponent)({
  props: ['size'],
  template: `
    <svg :height="size" :width="size" viewBox="0 0 64 64">
      <circle cx="50%" cy="50%" fill="#eee" r="50%" />
    </svg>
  `,
});
