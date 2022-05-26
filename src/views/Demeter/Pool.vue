<template>
  <pool-base v-bind="$attrs" v-on="$listeners">
    <template #title-append="liquidityInfo">
      {{ liquidityInfo.address }}
    </template>
    <template #append="liquidityInfo">
      {{ liquidityInfo.address }}
    </template>
  </pool-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import router, { lazyView } from '@/router';
import { PageNames } from '@/consts';

@Component({
  components: {
    PoolBase: lazyView(PageNames.Pool),
  },
})
export default class DemeterPools extends Mixins() {}
</script>
