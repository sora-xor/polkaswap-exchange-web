<template>
  <s-card v-bind="{ shadow: 'always', size: 'small', borderRadius: 'medium', ...$attrs }" class="account-card">
    <div class="account" @click="handleClick">
      <div class="account-avatar">
        <slot name="avatar"></slot>
      </div>
      <div class="account-details s-flex">
        <div class="account-credentials s-flex">
          <div class="account-credentials_name">
            <slot name="name"></slot>
          </div>
          <div class="account-credentials_description">
            <slot name="description"></slot>
          </div>
        </div>
        <slot></slot>
      </div>
    </div>
  </s-card>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
  (event: 'click', value: MouseEvent): void;
}>();

const handleClick = (event: MouseEvent): void => {
  emit('click', event);
};
</script>

<style lang="scss">
.account-card {
  display: flex;
  align-items: center;
  position: static;
  overflow: hidden;

  & > .el-card__body {
    flex: 1;
    min-width: 0;
    max-width: 100%;
  }

  &.s-card.s-size-small > .el-card__body {
    padding: 0;
  }

  &.s-card.neumorphic {
    border-width: 0px;
    border-style: solid;
    border-color: transparent;

    &.s-size-small {
      padding: 8px 16px;
    }
  }
}

.account {
  &-avatar {
    & > img {
      max-width: 100%;
    }
  }
  &-details {
    .el-button + .el-button {
      margin-left: 0;
    }
  }
}
</style>

<style scoped lang="scss">
@use '../../styles/mixins' as *;

$gap: 12px;
$avatar-size: 32px;

.account {
  display: flex;
  align-items: center;
  gap: $gap;
  width: 100%;
  min-width: 0;

  &-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: $avatar-size;
    height: $avatar-size;
    border-radius: 50%;
    overflow: hidden;
  }

  &-details {
    flex: 1;
    align-items: center;
    min-width: 0;
    max-width: calc(100% - $gap - $avatar-size);
  }

  &-credentials {
    flex: 1;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    overflow: hidden;

    &_name,
    &_description {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: var(--s-letter-spacing-small);
    }

    &_name {
      font-size: var(--s-font-size-medium);
      font-weight: 600;
      line-height: var(--s-line-height-medium);
      outline: none;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &_description {
      @include value-prefix(width, fit-content);
      @include hint-text;
      outline: none;
    }
  }
}
</style>
