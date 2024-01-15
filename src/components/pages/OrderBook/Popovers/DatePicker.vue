<template>
  <div>
    <!-- <s-date-picker @change="handleChange" /> -->
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {},
})
export default class DatePicker extends Mixins(TranslationMixin) {}
</script>
