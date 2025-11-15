import { defineComponent, h } from 'vue';
import { polkadotIcon } from '@polkadot/ui-shared';
import { adaptVNodeAttrs } from '../util.js';
/**
 * @name Polkadot
 * @description The Polkadot default identicon
 */
export const Polkadot = defineComponent({
  props: ['address', 'isAlternative', 'size'],
  render() {
    const { address, isAlternative, size } = this.$props;
    const circles = polkadotIcon(address, { isAlternative }).map(({ cx, cy, fill, r }) =>
      h('circle', { ...adaptVNodeAttrs({ cx, cy, fill, r }) }, [])
    );
    return h(
      'svg',
      {
        ...adaptVNodeAttrs({
          height: size,
          viewBox: '0 0 64 64',
          width: size,
        }),
      },
      circles
    );
  },
});
