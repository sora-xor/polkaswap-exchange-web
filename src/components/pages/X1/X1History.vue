<template>
  <div class="x1-history">
    <x1ex-logo :theme="libraryTheme" />
    <div class="message">Coming soon...</div>
  </div>
</template>

<script lang="ts">
import { Mixins, Component } from 'vue-property-decorator';

import { getter } from '../../../store/decorators';
import X1exLogo from '../../shared/Logo/X1ex.vue';

import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

@Component({
  components: {
    X1exLogo,
  },
})
export default class X1History extends Mixins() {
  @getter.libraryTheme libraryTheme!: Theme;
}
</script>

<style lang="scss">
.x1-history {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}
</style>
