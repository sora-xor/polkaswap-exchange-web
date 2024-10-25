<template>
  <component :is="componentToRender" />
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';

import store from '@/store';

const PointSystemComponent = () => import('@/views/PointSystem.vue');
const PointSystemV2Component = () => import('@/views/PointSystemV2.vue');

export default class PointSystemWrapper extends Vue {
  get componentToRender() {
    if (store.state.settings.featureFlags.pointSystemV2) {
      return PointSystemV2Component;
    } else {
      return PointSystemComponent;
    }
  }
}
</script>
