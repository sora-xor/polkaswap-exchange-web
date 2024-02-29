<template>
  <base-widget title="All trades" tooltip="Some text"> </base-widget>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
  },
})
export default class SwapTransactions extends Vue {
  @Prop({ default: () => null, type: Object }) readonly baseAsset!: Nullable<AccountAsset>;
  @Prop({ default: () => null, type: Object }) readonly quoteAsset!: Nullable<AccountAsset>;
}
</script>
