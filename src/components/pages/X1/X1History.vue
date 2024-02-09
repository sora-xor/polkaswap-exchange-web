<template>
  <div class="x1-history">
    <x1ex-logo :theme="libraryTheme" />
    <div class="message">{{ `${t('comingSoonText')}...` }}</div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Mixins, Component } from 'vue-property-decorator';

import { getter } from '../../../store/decorators';
import X1exLogo from '../../shared/Logo/X1ex.vue';

import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

@Component({
  components: {
    X1exLogo,
  },
})
export default class X1History extends Mixins(mixins.TranslationMixin) {
  @getter.libraryTheme libraryTheme!: Theme;
}
</script>

<style lang="scss" scoped>
.x1-history {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  margin-bottom: 98px;
}
</style>
