<template>
  <div class="identity">
    <s-tooltip v-if="identityName" border-radius="mini">
      <div class="account-identity">
        <div :class="['account-identity-status', { approved: isApproved }]">
          <s-icon :name="identityIcon" size="12"></s-icon>
        </div>
        {{ identityName }}
      </div>

      <template #content>
        <table class="identity-data">
          <tr v-for="row in identityData" :key="row.key">
            <td align="right" class="identity-data-key">{{ row.key }}</td>
            <td align="left" class="identity-data-value">{{ row.value }}</td>
          </tr>
        </table>
      </template>
    </s-tooltip>
    <template v-else>
      {{ localName }}
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import type { AccountIdentity } from '../../types/common';

const props = withDefaults(
  defineProps<{
    identity: AccountIdentity;
    localName?: string;
  }>(),
  {
    localName: '',
  }
);

const isApproved = computed(() => Boolean(props.identity?.approved));
const identityName = computed(() => props.identity?.name ?? '');
const identityLegalName = computed(() => props.identity?.legalName ?? '');
const identityIcon = computed(() => (isApproved.value ? 'basic-check-mark-24' : 'notifications-info-24'));
const identityData = computed(() =>
  [
    { key: 'display', value: identityName.value },
    { key: 'legal', value: identityLegalName.value },
    { key: 'local', value: props.localName },
  ].filter((item) => Boolean(item.value))
);

defineExpose({
  isApproved,
  identityName,
  identityLegalName,
  identityIcon,
  identityData,
});
</script>

<style scoped lang="scss">
.identity {
  display: inline-flex;
}

.account-identity {
  display: flex;
  align-items: center;
  gap: $basic-spacing-mini;

  &-status {
    display: flex;
    align-items: center;
    justify-content: center;
    width: $basic-spacing-medium;
    height: $basic-spacing-medium;
    border-radius: 50%;
    background-color: var(--s-color-status-info);

    &.approved {
      background-color: var(--s-color-status-success);
    }
  }
}
</style>
