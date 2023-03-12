<template>
  <dialog-base class="statistics-dialog" :visible.sync="isVisible" :title="'SORA Network service selection'">
    <s-scrollbar class="statistics-dialog__scrollbar">
      <div class="statistics-dialog__group" v-for="(group, index) in groupServices" :key="group.key">
        <span class="statistics-dialog__group-title">{{ group.title }}</span>
        <s-radio-group v-model="model[group.key]" class="statistics-dialog__block s-flex" disabled>
          <s-radio
            v-for="service in group.services"
            :key="service.endpoint"
            :label="service.endpoint"
            :value="service.endpoint"
            size="medium"
            class="statistics-dialog__item s-flex"
          >
            <div class="service-item s-flex">
              <div class="service-item__label s-flex">
                <div class="service-item__name">{{ service.name }}</div>
                <div class="service-item__endpoint">{{ service.endpoint }}</div>
              </div>
              <div class="service-item__status">
                {{ service.online ? 'Online' : 'Offline' }}
              </div>
            </div>
          </s-radio>
        </s-radio-group>
        <s-divider v-if="index !== groupServices.length - 1" :key="group.title + '_divider'" />
      </div>
    </s-scrollbar>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '../../mixins/TranslationMixin';
import QrCode from '../../../assets/img/mobile/qr-code.svg?inline';

@Component({
  components: {
    DialogBase: components.DialogBase,
    QrCode,
  },
})
export default class StatisticsDialog extends Mixins(mixins.DialogMixin, TranslationMixin) {
  readonly groupServices = [
    {
      key: 'fiat',
      title: 'Fiat services',
      services: [
        {
          name: 'Subquery Fiat Service',
          endpoint: 'wss://ww.mof.sora1.org',
          online: true,
        },
        {
          name: 'Ceres Fiat Service',
          endpoint: 'wss://ww.mof.sora2.org',
          online: true,
        },
        // {
        //   name: 'Subsquid Fiat Service',
        //   endpoint: 'coming soon...',
        //   online: false,
        // },
      ],
    },
    {
      key: 'charts',
      title: 'Charts services',
      services: [
        {
          name: 'Subquery Fiat Service',
          endpoint: 'wss://ww.mof.sora3.org',
          online: true,
        },
        // {
        //   name: 'Subsquid Fiat Service',
        //   endpoint: 'coming soon...',
        //   online: false,
        // },
      ],
    },
    {
      key: 'activity',
      title: 'Activity services',
      services: [
        {
          name: 'Subquery Fiat Service',
          endpoint: 'wss://ww.mof.sora4.org',
          online: true,
        },
        // {
        //   name: 'Subsquid Fiat Service',
        //   endpoint: 'coming soon...',
        //   online: false,
        // },
      ],
    },
  ];

  model = {
    fiat: 'wss://ww.mof.sora1.org',
    charts: 'wss://ww.mof.sora3.org',
    activity: 'wss://ww.mof.sora4.org',
  };
}
</script>

<style lang="scss">
.statistics-dialog {
  &__group {
    &-title {
      font-weight: 600;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-small);
      font-size: var(--s-font-size-small);
    }
  }

  &__block {
    flex-direction: column;
    margin-top: 12px;
  }

  &__item {
    margin-right: 0;
    align-items: center;
    padding: 12px 24px;
    white-space: normal;

    &.el-radio {
      &.s-medium {
        height: initial;
      }

      .el-radio__label {
        flex: 1;
      }
    }
  }
}
.service-item {
  align-items: center;
  justify-content: space-between;
  letter-spacing: var(--s-letter-spacing-small);
  line-height: var(--s-line-height-medium);

  &__label {
    flex-direction: column;
  }

  &__name {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-medium);
    font-weight: 600;
  }

  &__endpoint {
    background: var(--s-color-base-background);
    padding: 6px;
    margin-top: 6px;
    border-radius: 8px;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    font-weight: 300;
  }

  &__status {
    padding: 2px 6px;
    border-radius: 8px;
    background: #b9ebdb;
    color: #34ad87;
    font-weight: 400;
    font-size: 12px;
    letter-spacing: -0.02em;
  }
}
</style>

<style lang="scss" scoped>
.statistics-dialog {
}
</style>
