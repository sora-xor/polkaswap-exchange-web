<template>
  <div>
    <h1>Explore</h1>
    <router-view v-bind="$attrs" v-on="$listeners" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

@Component
export default class ExploreContainer extends Mixins() {}
</script>
