<template>
  <div class="widget-container" v-loading="widgetLoading">
    <iframe v-if="src" class="widget" :src="src" @load="onLoadWidget" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'

@Component
export default class MoonpayWidget extends Vue {
  @Prop({ default: '', type: String }) readonly src!: string

  @Watch('src', { immediate: true })
  private onChangeSrc (value) {
    if (value) {
      this.widgetLoading = true
    }
  }

  widgetLoading = false

  onLoadWidget (): void {
    this.widgetLoading = false
  }
}
</script>

<style lang="scss">
.widget-container .el-loading-mask {
  background-color: var(--s-color-utility-surface);
}
</style>

<style lang="scss" scoped>
.widget-container {
  display: flex;
  border: none;
  width: 100%;
  min-height: 574px;
  overflow: hidden;
}
.widget {
  flex: 1;
  border: none;
  border-radius: 20px;
}
</style>
