<template>
  <div class="stub">
    <stub-background class="stub-animation" />
    <div class="stub-content">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import StubBackground from '@/components/Stub/Background.vue';

@Component({
  components: {
    StubBackground,
  },
})
export default class StubLayout extends Vue {}
</script>

<style lang="scss" scoped>
.stub {
  position: relative;
  width: 100%;
  height: 100%;
}

.stub-animation {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}

// .stub-content {
//  background: conic-gradient(from 60.27deg at 74.46% -61.66%, rgba(242, 153, 133, 0.68) 0deg, #FF3B7B 117.86deg, rgba(169, 69, 209, 0.605193) 168.75deg, rgba(24, 165, 184, 0.2) 220.98deg, rgba(171, 24, 184, 0.25) 297.86deg, rgba(242, 44, 109, 0.38) 360deg);
// }
</style>
