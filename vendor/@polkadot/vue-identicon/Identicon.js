import { defineComponent, h } from 'vue';
import { isHex, isU8a, u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress, isEthereumAddress } from '@polkadot/util-crypto';
import { Beachball, Empty, Jdenticon, Polkadot } from './icons/index.js';
import { adaptVNodeAttrs } from './util.js';
const DEFAULT_SIZE = 64;
function resolvePublicKey(value, prefix) {
  if (isHex(value) && isEthereumAddress(value)) {
    return value.padEnd(66, '0');
  }
  return isU8a(value) || isHex(value) ? encodeAddress(value, prefix) : value;
}
export function encodeAccount(value, prefix) {
  try {
    const address = resolvePublicKey(value, prefix);
    const publicKey = u8aToHex(decodeAddress(address, false, prefix));
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
export const Identicon = defineComponent({
  components: {
    Beachball,
    Empty,
    Jdenticon,
    Polkadot,
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
      return h(
        Empty,
        {
          ...adaptVNodeAttrs({
            key: address,
            size: iconSize,
          }),
        },
        []
      );
    } else if (type === 'jdenticon') {
      return h(
        Jdenticon,
        {
          ...adaptVNodeAttrs({
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
      const component = cmp === 'Beachball' ? Beachball : Polkadot;
      return h(
        component,
        {
          ...adaptVNodeAttrs({
            address,
            isAlternative: isAlternativeIcon,
            key: address,
            size: iconSize,
          }),
        },
        []
      );
    } else {
      return h(cmp, {}, []);
    }
  },
  watch: {
    value: function () {
      this.recodeAddress();
    },
  },
});
