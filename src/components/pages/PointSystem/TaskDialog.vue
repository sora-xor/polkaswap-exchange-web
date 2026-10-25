<script lang="ts">
import { defineComponent, h } from 'vue';

import TaskDialog from '@/features/rewards/components/point-system/TaskDialog.vue';

export default defineComponent({
  name: 'TaskDialog',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(TaskDialog, attrs, slots);
  },
});
</script>
