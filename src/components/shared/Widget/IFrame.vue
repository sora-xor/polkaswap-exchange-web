<template>
  <div class="widget-container" :class="{ 'widget-container--bordered': withBorder }" v-loading="widgetLoading">
    <iframe v-if="src" class="widget" :src="src" @load="onLoadWidget" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';

@Component
export default class IFrameWidget extends Vue {
  @Prop({ default: '', type: String }) readonly src!: string;
  @Prop({ default: false, type: Boolean }) readonly withBorder!: boolean;

  @Watch('src', { immediate: true })
  private onChangeSrc(value) {
    if (value) {
      this.widgetLoading = true;
    }
  }

  widgetLoading = false;

  onLoadWidget(): void {
    this.widgetLoading = false;
  }
}
</script>

<style lang="scss">
.widget-container .el-loading-mask {
  background-color: var(--s-color-utility-surface);
}
</style>

<style lang="scss" scoped>
$widget-border-radius: 20px;

.widget {
  flex: 1;
  border: none;
  border-radius: $widget-border-radius;

  &-container {
    display: flex;
    border: none;
    width: 100%;
    min-height: 600px;
    overflow: hidden;

    &--bordered {
      .widget {
        box-shadow: var(--s-shadow-element);
        padding: $widget-border-radius $inner-spacing-mini;
        margin: $inner-spacing-tiny;
      }
    }
  }
}
</style>
