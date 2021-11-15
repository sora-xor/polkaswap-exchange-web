<template>
  <s-tooltip
    :open-delay="0"
    :close-delay="500"
    :show-arrow="false"
    placement="top-start"
    popper-class="app-info-popper"
  >
    <div slot="content" class="app-info">
      <div>
        <a
          v-for="item in SocialNetworkLinks"
          :key="item.title"
          class="app-info-link app-info-link--social"
          target="_blank"
          rel="nofollow noopener"
          :href="item.href"
        >
          <s-icon :name="item.icon" size="20" />
          <span>{{ t(`social.${item.title}`) }}</span>
        </a>
      </div>
      <s-divider />
      <div>
        <a
          class="app-info-link app-info-link--wiki"
          target="_blank"
          rel="nofollow noopener"
          :href="t('helpDialog.privacyPolicyLink')"
        >
          <span>{{ t('helpDialog.privacyPolicy') }}</span>
        </a>
        <a
          class="app-info-link app-info-link--wiki"
          target="_blank"
          rel="nofollow noopener"
          :href="t('helpDialog.termsOfServiceLink')"
        >
          <span>{{ t('helpDialog.termsOfService') }}</span>
        </a>
      </div>
      <div class="app-info__versions">
        <div>{{ app.name }} v{{ app.version }}</div>
        <div v-if="spec">{{ spec.name }} v{{ spec.version }}</div>
      </div>
    </div>
    <slot />
  </s-tooltip>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { app, SocialNetworkLinks } from '@/consts';

type Spec = {
  name: string;
  version: number;
};

@Component
export default class AppInfoPopper extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  readonly SocialNetworkLinks = SocialNetworkLinks;
  readonly app = app;

  spec: Nullable<Spec> = null;

  created(): void {
    this.withApi(() => {
      const { specName, specVersion } = api.api.consts.system.version;

      this.spec = {
        name: String(specName),
        version: Number(specVersion),
      };
    });
  }
}
</script>

<style lang="scss">
$popper-mix-width: 170px;

.app-info-popper.el-tooltip__popper.neumorphic {
  background: var(--s-color-utility-body);
  border-color: var(--s-color-base-border-secondary);
  box-shadow: var(--s-shadow-dialog);
  color: var(--s-color-base-content-primary);
  padding: $inner-spacing-medium;
  min-width: $popper-mix-width;
}

.app-info {
  .el-divider {
    margin: 0;
  }
}
</style>

<style lang="scss" scoped>
$social-link-min-height: 34px;

.app-info {
  line-height: var(--s-line-height-medium);
  letter-spacing: var(--s-letter-spacing-small);

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-small;
  }

  &-link {
    display: flex;
    align-items: center;
    font-size: var(--s-font-size-extra-small);

    &,
    &:hover,
    &:focus,
    &:visited {
      text-decoration: none;
      color: inherit;
    }

    &:hover,
    &:focus {
      i {
        color: var(--s-color-base-content-secondary);
      }
    }

    i {
      color: var(--s-color-base-content-tertiary);

      & + span {
        margin-left: $inner-spacing-small;
      }
    }

    &--social {
      min-height: $social-link-min-height;
    }

    &--wiki {
      & + & {
        margin-top: $basic-spacing-small;
      }
    }
  }
  &__versions {
    font-size: var(--s-font-size-extra-mini);
    color: var(--s-color-base-content-secondary);
  }
}
</style>
