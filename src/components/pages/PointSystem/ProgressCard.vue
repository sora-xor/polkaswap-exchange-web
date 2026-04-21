<script lang="ts">
import { defineComponent, h } from 'vue';

import ProgressCard from '@/features/rewards/components/point-system/ProgressCard.vue';

export default defineComponent({
  name: 'ProgressCard',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(ProgressCard, attrs, slots);
  },
});
</script>
