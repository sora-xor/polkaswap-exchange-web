<template>
  <div class="stub">
    This is stub layout
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class StubLayout extends Vue {}
</script>
