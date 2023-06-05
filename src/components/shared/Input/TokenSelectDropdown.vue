<template>
  <s-dropdown ref="dropdown" tabindex="-1" trigger="click" class="token-select-dropdown" v-on="$listeners">
    <token-select-button :token="token" icon="chevron-down-rounded-16" />

    <template #menu>
      <s-dropdown-item v-for="item in tokens" :value="item" :key="item.address" tabindex="0">
        {{ item.symbol }}
      </s-dropdown-item>
    </template>
  </s-dropdown>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import type { Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
  },
})
export default class TokenSelectDropdown extends Mixins() {
  @Prop({ default: () => null, type: Object }) readonly token!: Asset;
  @Prop({ default: () => [], type: Array }) readonly tokens!: Asset[];
}
</script>

<style lang="scss">
.token-select-dropdown {
  & > span {
    & > i {
      display: none;
    }
  }
}
</style>
