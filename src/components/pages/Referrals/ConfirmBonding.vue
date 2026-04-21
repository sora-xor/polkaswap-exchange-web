<script lang="ts">
import { defineComponent, h } from 'vue';

import ConfirmBonding from '@/features/referrals/components/ConfirmBonding.vue';

export default defineComponent({
  name: 'ReferralsConfirmBonding',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(ConfirmBonding, attrs, slots);
  },
});
</script>
