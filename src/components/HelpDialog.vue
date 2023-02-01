<template>
  <dialog-base :visible.sync="isVisible" :title="t('helpDialog.title')">
    <div class="help-block help-links">
      <div v-for="(link, index) in links" :key="index">
        <a class="help-links-item" :href="link.href" target="_blank">
          <span>{{ link.title }}</span>
        </a>
        <s-divider v-if="index !== links.length - 1" class="help-links-item_divider" />
      </div>
    </div>
    <div class="help-information">
      <div class="help-block">{{ t('helpDialog.appVersion') }} {{ app.version }}</div>
      <div class="help-block">
        {{ t('helpDialog.contactUs') }}<br />
        {{ app.email }}
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { app, Links } from '@/consts';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class HelpDialog extends Mixins(TranslationMixin, mixins.DialogMixin) {
  readonly app = app;

  get links(): Array<{ title: string; href: string }> {
    return [
      {
        title: this.t('helpDialog.termsOfService'),
        href: Links.terms,
      },
      {
        title: this.t('helpDialog.privacyPolicy'),
        href: Links.privacy,
      },
    ];
  }
}
</script>

<style scoped lang="scss">
.help {
  &-block {
    margin-bottom: $inner-spacing-mini;
  }

  &-information {
    color: var(--s-color-base-content-tertiary);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
    margin-bottom: $inner-spacing-mini * 3;
  }

  &-links {
    &-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 19px 0;
      text-decoration: unset;
      color: unset;
      font-size: var(--s-heading4-font-size);
      line-height: var(--s-line-height-medium);

      &_divider {
        margin: unset;
      }

      &:hover {
        cursor: pointer;

        & > * {
          color: var(--s-color-button-tertiary-color);
        }
      }
    }
  }
}
</style>
