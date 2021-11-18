<template>
  <div id="app">
    <component :is="layout">
      <template v-slot:default="layoutProps">
        <router-view v-bind="layoutProps" />
      </template>
    </component>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

import { lazyLayout } from '@/router';
import { LayoutNames } from '@/consts';

@Component
export default class App extends Vue {
  get layout() {
    return lazyLayout(this.$route.meta?.layout ?? LayoutNames.App);
  }
}
</script>

<style lang="scss">
html {
  overflow-y: hidden;
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-base);
}

ul ul {
  list-style-type: none;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  height: 100vh;
  color: var(--s-color-base-content-primary);
  background-color: var(--s-color-utility-body);
  transition: background-color 500ms linear;
}
</style>
