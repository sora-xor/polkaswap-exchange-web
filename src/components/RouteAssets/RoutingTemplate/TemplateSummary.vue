<template>
  <div class="container routing-template-summary">
    <div class="routing-template-summary__header">
      <div>
        <generic-page-header :title="'Routing Template Summary'" class="page-header__title" />
      </div>
      <div class="routing-template-summary__accept-button">
        <s-button type="primary" class="s-typography-button--big" @click="$emit('onRouteAssetsClick')">
          {{ t('adar.templates.routeAssets') }}
        </s-button>
      </div>
    </div>
    <div class="routing-template-summary__info">
      <!-- <div>BODY</div> -->
      <div>
        <p>label</p>
        <div>desc</div>
      </div>
      <s-divider />
      <div>
        <p>label</p>
        <div>desc</div>
      </div>
      <s-divider />
      <div>
        <p>label</p>
        <div>desc</div>
      </div>
      <s-divider />
      <div>
        <p>label</p>
        <div>desc</div>
      </div>
    </div>
    <div class="routing-template-summary__summary-details">
      <p>Summary details</p>
      <div>Summary details Table</div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import TranslationMixin from '@/components/mixins/TranslationMixin';
// import { Template } from '@/store/templates/types';
@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
  },
})
export default class TemplateInfo extends Mixins(TranslationMixin) {
  //   @Prop() readonly template!: Template;
}
</script>

<style scoped lang="scss">
.container {
  min-height: auto;
}
.routing-template-summary {
  font-weight: 600;
  font-size: var(--s-font-size-medium);

  &__header {
    @include flex-between;
  }

  &__info {
    > div {
      @include flex-start;
      gap: 16px;
      > p {
        width: 35%;
        text-transform: uppercase;
        font-weight: 800;
        font-size: var(--s-font-size-small);
        color: var(--s-color-brand-day);
      }

      > div {
        font-size: var(--s-font-size-big);
        width: 65%;
      }
    }
  }
  & > div:first-child {
    margin-bottom: $inner-spacing-big;
  }
  &__buttons-section {
    @include flex-start;
  }
  &__header-section {
    @include flex-between;
  }
  &__payment-section {
    @include flex-start;
    gap: 60px;
    align-items: flex-start;
    .address {
      &__value {
        @include flex-start;
        gap: 4px;
        & > div:first-child {
          @include text-ellipsis;
          width: 200px;
        }
      }
    }
    .asset {
      display: flex;
      justify-content: start;
      align-items: flex-start;
      flex-direction: column;
      &__symbol {
        background-color: var(--s-color-base-border-secondary);
        border-radius: var(--s-border-radius-mini);
        padding: 4px 16px;
        font-size: var(--s-font-size-big);
      }
    }
    .amount {
      & > div {
        @include flex-start;
        gap: 4px;
      }
    }
  }
  .payment-section {
    &__label {
      margin-bottom: 8px;
      font-weight: 800;
      font-size: var(--s-font-size-small);
      text-transform: uppercase;
      color: var(--s-color-brand-day);
    }
    &__value {
      font-size: var(--s-font-size-big);
    }
  }
}
</style>
