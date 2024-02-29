<template>
  <base-widget title="All trades" tooltip="Some text"> </base-widget>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
  },
})
export default class SwapTransactionsWidget extends Vue {
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;
}
</script>
