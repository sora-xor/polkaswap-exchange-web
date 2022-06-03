<template>
  <div class="container">
    <router-view v-bind="$attrs" v-on="$listeners" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

@Component
export default class StakingContainer extends Mixins() {}
</script>
