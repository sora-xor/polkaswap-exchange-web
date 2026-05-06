<script lang="ts">
import { defineComponent, h } from 'vue';

import RewardsGradientBox from '@/features/rewards/components/rewards/GradientBox.vue';

export default defineComponent({
  name: 'RewardsGradientBox',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(RewardsGradientBox, attrs, slots);
  },
});
</script>
