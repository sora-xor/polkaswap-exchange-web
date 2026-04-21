<script lang="ts">
import { defineComponent, h } from 'vue';

import PointCard from '@/features/rewards/components/point-system/PointCard.vue';

export default defineComponent({
  name: 'PointCard',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(PointCard, attrs, slots);
  },
});
</script>
