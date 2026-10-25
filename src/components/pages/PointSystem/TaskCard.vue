<script lang="ts">
import { defineComponent, h } from 'vue';

import TaskCard from '@/features/rewards/components/point-system/TaskCard.vue';

export default defineComponent({
  name: 'TaskCard',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(TaskCard, attrs, slots);
  },
});
</script>
