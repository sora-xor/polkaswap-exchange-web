<template>
  <s-button :class="['app-logo']" type="link" size="large" v-on="$listeners">
    <analog-logo :theme="theme" class="app-logo__image" />
  </s-button>
</template>

<script lang="ts">
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { Component, Prop, Vue } from 'vue-property-decorator';

import AnalogLogo from '@/components/shared/Logo/Analog.vue';

@Component({
  components: {
    AnalogLogo,
  },
})
export default class AppLogoButton extends Vue {
  @Prop({ default: Theme.LIGHT, type: String }) theme!: Theme;
}
</script>

<style lang="scss" scoped>
$logo-full-width: 172px;
$logo-full-height: 46px;

.app-logo {
  background-size: cover;
  width: $logo-full-width;
  height: $logo-full-height;
  border-radius: 0;

  &.el-button {
    padding: 0;
    margin-left: 0;
    margin-right: 0;
    transition-duration: 0s;
  }
}
</style>
