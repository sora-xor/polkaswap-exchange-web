<template>
  <div>
    <span>Update is available. </span>
    <span @click="refresh" class="link">Refresh app</span>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

@Component
export default class UpdateMessage extends Mixins() {
  @Prop({ default: () => {}, type: Function }) refresh!: VoidFunction;
}
</script>
