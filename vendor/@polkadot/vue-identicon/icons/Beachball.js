import { defineComponent, h } from 'vue';
import { beachballIcon } from '@polkadot/ui-shared';
/**
 * @name Beachball
 * @description The Beachball identicon
 */
export const Beachball = defineComponent({
  props: ['address', 'size', 'isAlternative'],
  render() {
    const { address, isAlternative, size } = this.$props;
    return h({
      template: beachballIcon(address, {
        isAlternative,
        size,
      }).outerHTML,
    });
  },
});
