<template>
  <s-date-picker @change="handleChange" />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, LimitOrderSide } from '@/consts';
import { lazyComponent } from '@/router';
import { mutation } from '@/store/decorators';

@Component({
  components: {},
})
export default class DatePicker extends Mixins(TranslationMixin) {
  handleChange(values): void {}
}
</script>
