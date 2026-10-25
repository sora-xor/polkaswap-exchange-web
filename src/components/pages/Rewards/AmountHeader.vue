<script lang="ts">
import { defineComponent, h } from 'vue';

import RewardsAmountHeader from '@/features/rewards/components/rewards/AmountHeader.vue';

export default defineComponent({
  name: 'RewardsAmountHeader',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(RewardsAmountHeader, attrs, slots);
  },
});
</script>
