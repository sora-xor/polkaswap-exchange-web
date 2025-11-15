'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Identicon = void 0;
exports.encodeAccount = encodeAccount;
const vue_1 = require('vue');
const util_1 = require('@polkadot/util');
const util_crypto_1 = require('@polkadot/util-crypto');
const index_js_1 = require('./icons/index.js');
const util_js_1 = require('./util.js');
const DEFAULT_SIZE = 64;
function resolvePublicKey(value, prefix) {
  if ((0, util_1.isHex)(value) && (0, util_crypto_1.isEthereumAddress)(value)) {
    return value.padEnd(66, '0');
  }
  return (0, util_1.isU8a)(value) || (0, util_1.isHex)(value) ? (0, util_crypto_1.encodeAddress)(value, prefix) : value;
}
function encodeAccount(value, prefix) {
  try {
    const address = resolvePublicKey(value, prefix);
    const publicKey = (0, util_1.u8aToHex)((0, util_crypto_1.decodeAddress)(address, false, prefix));
    return { address, publicKey };
  } catch {
    return { address: '', publicKey: '0x' };
  }
}
/**
 * @name Identicon
 * @description The main Identicon component, taking a number of properties
 * @example
 * ```html
 * <Identicon :size="128" :theme="polkadot" :value="..." />
 * ```
 */
exports.Identicon = (0, vue_1.defineComponent)({
  components: {
    Beachball: index_js_1.Beachball,
    Empty: index_js_1.Empty,
    Jdenticon: index_js_1.Jdenticon,
    Polkadot: index_js_1.Polkadot,
  },
  created: function () {
    this.createData();
  },
  data: function () {
    return {
      address: '',
      iconSize: DEFAULT_SIZE,
      isAlternativeIcon: false,
      publicKey: '0x',
      type: 'empty',
    };
  },
  methods: {
    createData: function () {
      this.iconSize = this.size || DEFAULT_SIZE;
      this.type = this.theme;
      this.isAlternativeIcon = this.isAlternative || false;
      this.recodeAddress();
    },
    recodeAddress: function () {
      const { address, publicKey } = encodeAccount(this.value);
      this.address = address;
      this.publicKey = publicKey;
    },
  },
  props: ['prefix', 'isAlternative', 'size', 'theme', 'value'],
  render() {
    const { address, iconSize, isAlternativeIcon, publicKey, type } = this.$data;
    if (type === 'empty') {
      return (0, vue_1.h)(
        index_js_1.Empty,
        {
          ...(0, util_js_1.adaptVNodeAttrs)({
            key: address,
            size: iconSize,
          }),
        },
        []
      );
    } else if (type === 'jdenticon') {
      return (0, vue_1.h)(
        index_js_1.Jdenticon,
        {
          ...(0, util_js_1.adaptVNodeAttrs)({
            key: address,
            publicKey,
            size: iconSize,
          }),
        },
        []
      );
    } else if (type === 'substrate') {
      throw new Error('substrate type is not supported');
    }
    const cmp = type.charAt(0).toUpperCase() + type.slice(1);
    if (['Beachball', 'Polkadot'].includes(cmp)) {
      const component = cmp === 'Beachball' ? index_js_1.Beachball : index_js_1.Polkadot;
      return (0, vue_1.h)(
        component,
        {
          ...(0, util_js_1.adaptVNodeAttrs)({
            address,
            isAlternative: isAlternativeIcon,
            key: address,
            size: iconSize,
          }),
        },
        []
      );
    } else {
      return (0, vue_1.h)(cmp, {}, []);
    }
  },
  watch: {
    value: function () {
      this.recodeAddress();
    },
  },
});
