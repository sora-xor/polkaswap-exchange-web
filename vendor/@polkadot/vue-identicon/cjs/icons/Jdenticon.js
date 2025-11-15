'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Jdenticon = void 0;
const tslib_1 = require('tslib');
const jdenticon = tslib_1.__importStar(require('jdenticon'));
const vue_1 = require('vue');
/**
 * @name Jdenticon
 * @description The substrate default via Jdenticon
 */
exports.Jdenticon = (0, vue_1.defineComponent)({
  props: ['publicKey', 'size'],
  render() {
    const { publicKey, size } = this.$props;
    return (0, vue_1.h)({
      template: jdenticon.toSvg(publicKey.substring(2), size),
    });
  },
});
