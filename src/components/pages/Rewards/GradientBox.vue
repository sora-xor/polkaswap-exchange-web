<script lang="ts">
import { computed, defineComponent, h } from 'vue';

import type { PropType } from 'vue';
import type { KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';

/**
 * Gradient container that adapts the background based on the reward token symbol.
 */
export default defineComponent({
  name: 'RewardsGradientBox',
  compatConfig: {
    MODE: 3,
  },
  props: {
    symbol: {
      type: String as PropType<KnownSymbols | ''>,
      default: '',
    },
  },
  setup(props, { slots }) {
    const symbolClass = computed(() => {
      if (!props.symbol) return '';
      return `gradient-box--${props.symbol.toLowerCase()}`;
    });

    return () =>
      h(
        'div',
        {
          class: ['gradient-box', symbolClass.value],
        },
        slots.default?.()
      );
  },
});
</script>

<style lang="scss" scoped>
.gradient-box {
  padding: $inner-spacing-medium * 2 $inner-spacing-medium $inner-spacing-medium * 1.5;
  border-radius: var(--s-border-radius-medium);
  background: linear-gradient(101.79deg, #e81860 8.64%, #f89b29 93.47%);
  display: flex;
  flex-flow: column nowrap;

  &--pswap {
    background: linear-gradient(110.38deg, #e81860 13.54%, #6453c1 86.15%);
  }

  &--val {
    background: linear-gradient(110.38deg, #c8ac5f 13.54%, #967e2c 86.15%);
  }
}
</style>
