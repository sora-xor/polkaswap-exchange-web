<template>
  <div class="order-book-widget">Charts Widget</div>
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
export default class BookChartsWidget extends Mixins(TranslationMixin) {}
</script>
