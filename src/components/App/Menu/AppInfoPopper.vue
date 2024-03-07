<template>
  <el-popover
    ref="infoPopup"
    :visible-arrow="false"
    placement="top-start"
    popper-class="app-info-popper"
    trigger="click"
  >
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
      <template v-for="product in products">
        <a
          v-if="product.href"
          :key="product.title"
          class="app-info-link app-info-link--product"
          target="_blank"
          rel="nofollow noopener"
          :href="product.href"
        >
          <s-icon v-if="product.icon" :name="product.icon" size="20" />
          <span>{{ product.title }}</span>
        </a>
        <div v-else :key="product.title" class="app-info-link app-info-link--product" @click="product.action">
          <s-icon v-if="product.icon" :name="product.icon" size="20" />
          <span>{{ product.title }}</span>
        </div>
      </template>
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
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { app, SocialNetworkLinks, Links } from '@/consts';

@Component
export default class AppInfoPopper extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  readonly SocialNetworkLinks = SocialNetworkLinks;
  readonly app = app;

  @Ref('infoPopup') private readonly infoPopup!: any;

  specVersion: Nullable<number> = null;

  created(): void {
    this.withApi(() => {
      this.specVersion = api.system.specVersion;
    });
  }

  private showSoraMobileDialog(): void {
    this.$emit('open-product-dialog', 'soraMobile');
    this.infoPopup?.doClose?.();
  }

  get products(): Array<{ title: string; icon?: string; href?: string; action?: () => void }> {
    return [
      {
        title: this.t('mobilePopup.sideMenu'),
        icon: 'symbols-24',
        action: this.showSoraMobileDialog,
      },
    ];
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
  @include popper-content;
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

    &--social,
    &--product {
      min-height: $social-link-min-height;
    }

    &--product:hover {
      cursor: pointer;
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
