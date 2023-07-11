<template>
  <div>
    <set-limit-order />
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';

@Component({
  components: {
    SetLimitOrder: lazyComponent(Components.SetLimitOrder),
  },
})
export default class OrderBook extends Mixins(TranslationMixin) {}
</script>

<style lang="scss" scoped></style>
