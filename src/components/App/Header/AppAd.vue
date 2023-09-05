<template>
  <a class="ad" :href="LINK" target="_blank" rel="nofollow noopener">
    <Adv1 />
  </a>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import Adv1 from '@/assets/img/ads/adv1.svg?inline';

@Component({
  components: {
    Adv1,
  },
})
export default class AppAd extends Vue {
  readonly LINK = 'https://gleam.io/zHQmD/polkaswap-34000-xst-airdrop-campaign';
}
</script>

<style lang="scss" scoped>
.ad {
  text-decoration: none;
  height: 40px;
  width: 280px;
}
</style>
