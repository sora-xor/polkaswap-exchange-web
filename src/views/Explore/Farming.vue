<template>
  <div>Farming</div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import DemeterPageMixin from '@/modules/demeterFarming/mixins/PageMixin';

@Component
export default class ExploreFarming extends Mixins(DemeterPageMixin) {
  // override DemeterPageMixin
  isFarmingPage = true;
}
</script>
