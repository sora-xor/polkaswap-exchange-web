<script lang="ts">
import { defineComponent, h } from 'vue';

import ConfirmInviteUser from '@/features/referrals/components/ConfirmInviteUser.vue';

export default defineComponent({
  name: 'ReferralsConfirmInviteUser',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(ConfirmInviteUser, attrs, slots);
  },
});
</script>
