<template>
  <info-line
    :label="t('dexSettings.slippageTolerance')"
    :label-tooltip="t('dexSettings.slippageToleranceHint')"
    :value="0.5"
  />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { components } from '@soramitsu/soraneo-wallet-web';

@Component({
  components: {
    InfoLine: components.InfoLine,
  },
})
export default class SlippageTolerance extends Mixins(TranslationMixin) {}
</script>
