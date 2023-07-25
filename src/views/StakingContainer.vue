<template>
  <router-view v-bind="$attrs" v-on="$listeners" />
</template>

<script lang="ts">
import { api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

@Component
export default class StakingContainer extends Mixins() {}
</script>
