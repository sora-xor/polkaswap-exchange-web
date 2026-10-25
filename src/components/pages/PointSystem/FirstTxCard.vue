<script lang="ts">
import { defineComponent, h } from 'vue';

import FirstTxCard from '@/features/rewards/components/point-system/FirstTxCard.vue';

export default defineComponent({
  name: 'FirstTxCard',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(FirstTxCard, attrs, slots);
  },
});
</script>
