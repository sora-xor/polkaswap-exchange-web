<script lang="ts">
import { defineComponent, h } from 'vue';

import RewardsItemTooltip from '@/features/rewards/components/rewards/ItemTooltip.vue';

export default defineComponent({
  name: 'RewardsItemTooltip',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(RewardsItemTooltip, attrs, slots);
  },
});
</script>
