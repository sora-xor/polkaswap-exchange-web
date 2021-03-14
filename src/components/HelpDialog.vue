<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('helpDialog.title')"
  >
    <div class="help-block help-links">
      <div v-for="(link, index) in links" :key="index">
        <a
          class="help-links-item"
          :href="link.url"
          target="_blank"
        >
          <span>{{ link.title }}</span>
          <s-icon name="external-link" size="16" />
        </a>
        <s-divider v-if="index !== links.length - 1" class="help-links-item_divider" />
      </div>
    </div>
    <div class="help-information">
      <div class="help-block">
        {{ t('helpDialog.appVersion') }} {{ appVersion }}
      </div>
      <div class="help-block">
        {{ t('helpDialog.contactUs') }}<br>
        {{ appEmail }}
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from './mixins/TranslationMixin'
import DialogMixin from './mixins/DialogMixin'
import DialogBase from './DialogBase.vue'

import { AppVersion, AppEmail } from '@/consts'

@Component({
  components: {
    DialogBase
  }
})
export default class HelpDialog extends Mixins(TranslationMixin, DialogMixin) {
  readonly appVersion = AppVersion
  readonly appEmail = AppEmail

  readonly links = [
    {
      title: this.t('helpDialog.termsOfService'),
      url: this.t('helpDialog.termsOfServiceLink')
    },
    {
      title: this.t('helpDialog.privacyPolicy'),
      url: this.t('helpDialog.privacyPolicyLink')
    }
  ]
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
    line-height: $s-line-height-big;
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
      line-height: $s-line-height-medium;
      letter-spacing: $s-letter-spacing-small;

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
