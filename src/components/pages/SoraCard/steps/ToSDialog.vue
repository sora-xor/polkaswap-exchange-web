<template>
  <dialog-base v-model:visible="isVisible" class="terms-of-service-dialog" :title="title">
    <i-frame-widget v-if="srcLink" class="tos__section" with-border :src="srcLink"></i-frame-widget>
    <template v-else>
      <div class="sora-card__excuse">
        {{ t('card.blacklistedCountriesExcuse') }}
      </div>
      <div class="tos__section">
        <ul class="sora-card__unsupported-countries">
          <li v-for="[key, value] in unsupportedCountries" :key="key">
            <span class="flags flag-emodji">{{ countryCodeEmoji(key) }}</span> {{ formatCountryName(key, value) }}
          </li>
        </ul>
      </div>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { countryCodeEmoji } from 'country-code-emoji';
import { computed, onMounted, ref, toRefs } from 'vue';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';

const BLACKLIST_URL = 'https://whitelist.polkaswap2.io/card/blacklist.json';

defineOptions({
  inheritAttrs: false,
  components: {
    DialogBase: components.DialogBase,
    IFrameWidget: lazyComponent(Components.IFrameWidget),
  },
});

const props = withDefaults(
  defineProps<{
    srcLink?: string;
    title?: string;
    visible?: boolean;
  }>(),
  {
    srcLink: '',
    title: '',
    visible: false,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
}>();

const { srcLink, title, visible } = toRefs(props);

const isVisible = computed({
  get: () => visible.value,
  set: (value: boolean) => emit('update:visible', value),
});

const displayRegions = computed(() => store.state.settings.displayRegions as Nullable<Intl.DisplayNames>);

const blacklistedCountries = ref<Record<string, string>>({});

const unsupportedCountries = computed(() => Object.entries(blacklistedCountries.value));

const formatCountryName = (key: string, defaultValue: string): string => {
  try {
    const isoCode = key.toUpperCase();
    const regions = displayRegions.value;
    if (!regions) return defaultValue;
    return regions.of(isoCode) ?? defaultValue;
  } catch (error) {
    console.warn('Unsupported format of SORA Card Blacklisted Country', error);
    return defaultValue;
  }
};

const getBlacklistedCountries = async () => {
  try {
    const response = await fetch(BLACKLIST_URL, { cache: 'no-cache' });
    const data = await response.json();
    blacklistedCountries.value = data;
  } catch (error) {
    blacklistedCountries.value = {};
  }
};

onMounted(async () => {
  if (!srcLink.value) {
    await getBlacklistedCountries();
  }
});
</script>

<style lang="scss">
.dialog-wrapper.terms-of-service-dialog .el-dialog:not(.is-fullscreen) {
  max-width: 1000px;
}
</style>

<style lang="scss" scoped>
.tos__section {
  width: 100%;
  background-color: transparent;
  overflow: hidden;
  margin-bottom: calc(var(--s-basic-spacing) * 2);
}

.sora-card {
  &__unsupported-countries {
    padding-left: 0;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;

    li {
      list-style: none;
      margin: $basic-spacing-small;
      font-weight: 600;
      font-size: var(--s-font-size-medium);

      .flags {
        margin-right: $inner-spacing-tiny;
      }
    }
  }

  &__excuse {
    margin-bottom: $basic-spacing;
    font-size: 18px;
  }
}
</style>
