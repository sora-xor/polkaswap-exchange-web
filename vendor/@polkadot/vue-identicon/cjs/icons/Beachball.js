'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Beachball = void 0;
const vue_1 = require('vue');
const ui_shared_1 = require('@polkadot/ui-shared');
/**
 * @name Beachball
 * @description The Beachball identicon
 */
exports.Beachball = (0, vue_1.defineComponent)({
  props: ['address', 'size', 'isAlternative'],
  render() {
    const { address, isAlternative, size } = this.$props;
    return (0, vue_1.h)({
      template: (0, ui_shared_1.beachballIcon)(address, {
        isAlternative,
        size,
      }).outerHTML,
    });
  },
});
