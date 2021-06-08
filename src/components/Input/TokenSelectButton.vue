<template>
  <s-button
    type="tertiary"
    size="small"
    border-radius="mini"
    icon="chevron-down-rounded-16"
    icon-position="right"
  >
    <template v-if="token">
      <token-logo :token="token" size="small" />
      {{ token.symbol }}
    </template>
    <template v-else>
      {{ t('buttons.chooseToken') }}
    </template>
  </s-button>
</template>
