<template>
  <div class="header">
    <back-button v-if="hasBackButton" class="back-button" :page="previousPage" @back="$emit('back')" />
    <h3 class="title"><slot /></h3>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { StakingPageNames } from '../../consts';
import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents } from '../consts';

@Component({
  components: {
    BackButton: soraStakingLazyComponent(SoraStakingComponents.BackButton),
  },
})
export default class SoraStaking extends Mixins() {
  @Prop({ type: String }) readonly previousPage?: StakingPageNames;
  @Prop({ type: Boolean }) readonly hasBackButton?: boolean;
}
</script>

<style lang="scss" scoped>
.header {
  position: relative;
  pointer-events: none;
  display: flex;
  width: 100%;
  height: 42px;
  justify-content: center;
  align-items: center;
}

.back-button {
  position: absolute;
  pointer-events: all;
  left: 0;
}

.title {
  font-weight: 300;
}
</style>
