<template>
  <div ref="lottie" class="lottie-loader" :style="`width: ${size}px; height: ${size}px`">
    <lottie-animation path="json/loader.json" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import LottieAnimation from 'lottie-vuejs/src/LottieAnimation.vue'
import { delay } from '@/utils'

@Component({
  components: {
    LottieAnimation
  }
})
export default class LottieLoader extends Vue {
  @Prop({ default: '', type: String }) readonly size!: string

  async waitForLoadersMount (): Promise<void> {
    await delay()
    const lottieLoader = document.querySelector('.lottie-loader') as any
    const loaders = document.querySelectorAll('.el-lottie-loading') as any
    if (lottieLoader === null || loaders === null) {
      return await this.waitForLoadersMount()
    }
    if (loaders.length) {
      loaders.forEach(loader => {
        loader.parentElement.appendChild(lottieLoader as Node)
        loader.parentElement.removeChild(loader)
      })
    }
  }

  async mounted (): Promise<void> {
    await this.waitForLoadersMount()
  }
}
</script>

<style lang="scss">
$lottie-loader-class: '.lottie-loader';
#{$lottie-loader-class} {
  display: none;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  margin: auto;
  z-index: 9999;
}
.el-loading-mask {
  .el-loading-spinner {
    margin-top: 0;
  }
  #{$lottie-loader-class} {
    display: block;
  }
}
</style>
