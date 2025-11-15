import * as jdenticon from 'jdenticon';
import { defineComponent, h } from 'vue';
/**
 * @name Jdenticon
 * @description The substrate default via Jdenticon
 */
export const Jdenticon = defineComponent({
  props: ['publicKey', 'size'],
  render() {
    const { publicKey, size } = this.$props;
    return h({
      template: jdenticon.toSvg(publicKey.substring(2), size),
    });
  },
});
