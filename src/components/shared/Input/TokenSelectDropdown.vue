<template>
  <s-dropdown ref="dropdown" tabindex="-1" trigger="click" class="token-select-dropdown" v-on="$listeners">
    <token-select-button :token="token" icon="chevron-down-rounded-16" @click="handleButtonClick" />

    <template #menu>
      <s-dropdown-item v-for="item in tokens" :value="item" :key="item.address" tabindex="0">
        {{ item.symbol }}
      </s-dropdown-item>
    </template>
  </s-dropdown>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Ref } from 'vue-property-decorator';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type SDropdown from '@soramitsu/soramitsu-js-ui/lib/components/Dropdown/SDropdown/SDropdown.vue';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
  },
})
export default class TokenSelectDropdown extends Mixins() {
  @Prop({ default: () => null, type: Object }) readonly token!: Asset;
  @Prop({ default: () => [], type: Array }) readonly tokens!: Asset[];

  @Ref('dropdown') readonly dropdown!: SDropdown;

  handleButtonClick(): void {
    // emulate click in el-dropdown
    (this.dropdown.$refs.dropdown as SDropdown).handleClick();
  }
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
