'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Polkadot = void 0;
const vue_1 = require('vue');
const ui_shared_1 = require('@polkadot/ui-shared');
const util_js_1 = require('../util.js');
/**
 * @name Polkadot
 * @description The Polkadot default identicon
 */
exports.Polkadot = (0, vue_1.defineComponent)({
  props: ['address', 'isAlternative', 'size'],
  render() {
    const { address, isAlternative, size } = this.$props;
    const circles = (0, ui_shared_1.polkadotIcon)(address, { isAlternative }).map(({ cx, cy, fill, r }) =>
      (0, vue_1.h)('circle', { ...(0, util_js_1.adaptVNodeAttrs)({ cx, cy, fill, r }) }, [])
    );
    return (0, vue_1.h)(
      'svg',
      {
        ...(0, util_js_1.adaptVNodeAttrs)({
          height: size,
          viewBox: '0 0 64 64',
          width: size,
        }),
      },
      circles
    );
  },
});
