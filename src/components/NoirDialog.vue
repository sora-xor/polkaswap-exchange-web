<template>
  <dialog-base :visible.sync="isVisible" custom-class="noir-dialog">
    <slot />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import DialogMixin from './mixins/DialogMixin';
import DialogBase from './DialogBase.vue';

@Component({
  components: {
    DialogBase,
  },
})
export default class NoirDialog extends Mixins(DialogMixin) {}
</script>
