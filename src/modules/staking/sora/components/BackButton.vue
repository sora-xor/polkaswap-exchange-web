<template>
  <s-button type="action" size="medium" @click="back()">
    <s-icon name="arrows-chevron-left-rounded-24" />
  </s-button>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import router from '@/router';

import { StakingPageNames } from '../../consts';

@Component
export default class BackButton extends Mixins() {
  @Prop({ type: String }) readonly page?: StakingPageNames;

  back() {
    if (this.page) {
      router.push({ name: this.page });
    }
    this.$emit('back');
  }
}
</script>
