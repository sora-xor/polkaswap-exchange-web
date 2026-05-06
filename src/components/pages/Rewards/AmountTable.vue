<script lang="ts">
import { defineComponent, h } from 'vue';

import RewardsAmountTable from '@/features/rewards/components/rewards/AmountTable.vue';

export default defineComponent({
  name: 'RewardsAmountTable',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(RewardsAmountTable, attrs, slots);
  },
});
</script>
