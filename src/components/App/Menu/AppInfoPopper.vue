<template>
  <el-popover :visible-arrow="false" placement="top-start" popper-class="app-info-popper" trigger="click">
    <div class="app-info">
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
          v-for="(link, index) in sortedTextLinks"
          :key="index"
          class="app-info-link app-info-link--text"
          target="_blank"
          rel="nofollow noopener"
          :href="link.href"
        >
          <span>{{ link.title }}</span>
        </a>
      </div>
      <div class="app-info__versions">
        <div>{{ app.name }} v{{ app.version }}</div>
        <div v-if="specVersion">{{ TranslationConsts.Sora }} v{{ specVersion }}</div>
      </div>
    </div>
    <template #reference>
      <slot />
    </template>
  </el-popover>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { api, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { app, SocialNetworkLinks, Links } from '@/consts';

@Component
export default class AppInfoPopper extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  readonly SocialNetworkLinks = SocialNetworkLinks;
  readonly app = app;

  specVersion: Nullable<number> = null;

  created(): void {
    this.withApi(() => {
      this.specVersion = api.system.specVersion;
    });
  }

  get textLinks(): Array<{ title: string; href: string }> {
    return [
      {
        title: this.t('footerMenu.privacy'),
        href: Links.privacy,
      },
      {
        title: this.t('releaseNotesText'),
        href: Links.releaseNotes,
      },
      {
        title: this.t('helpDialog.termsOfService'),
        href: Links.terms,
      },
    ];
  }

  get sortedTextLinks(): Array<{ title: string; href: string }> {
    return this.textLinks.sort((a, b) => {
      const nameA = a.title.toUpperCase();
      const nameB = b.title.toUpperCase();

      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });
  }
}
</script>

<style lang="scss">
$popper-mix-width: 170px;

.app-info-popper.el-popover.el-popper {
  background: var(--s-color-utility-body);
  border-color: var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  box-shadow: var(--s-shadow-dialog);
  color: var(--s-color-base-content-primary);
  padding: $inner-spacing-medium;
  min-width: $popper-mix-width;
}

.app-info {
  .el-divider {
    margin: 0;
  }
  &-link:not(:active) {
    @include focus-outline;
  }
}
</style>

<style lang="scss" scoped>
$social-link-min-height: 34px;

.app-info {
  line-height: var(--s-line-height-medium);

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

    &--text {
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
