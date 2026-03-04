<template>
  <dialog-base v-model:visible="isVisible" :title="t('selectLanguageDialog.title')" class="select-language-dialog">
    <s-scrollbar class="select-language-scrollbar">
      <s-radio-group v-model="selectedLang" class="select-language-list s-flex">
        <s-radio
          v-for="lang in entries"
          :key="lang.key"
          :label="lang.key"
          :value="lang.key"
          size="medium"
          class="select-language-list__item s-flex"
        >
          <div :ref="(el) => setSelectedEl(el, lang.key === selectedLang)" class="select-language-item s-flex">
            <div class="select-language-item__value">
              {{ lang.value }}
            </div>
            <div class="select-language-item__name">
              {{ lang.name }}
            </div>
          </div>
        </s-radio>
      </s-radio-group>
    </s-scrollbar>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@wallet';
import { computed, nextTick, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Language, Languages } from '@/consts';
import { useSettingsStore } from '@/stores/settings';

defineOptions({
  name: 'SelectLanguageDialog',
  components: {
    DialogBase: components.DialogBase,
  },
});

const { t } = useTranslation();
const settingsStore = useSettingsStore();

const selectedEl = ref<HTMLDivElement | null>(null);

const isVisible = computed({
  get: () => settingsStore.selectLanguageDialogVisibility,
  set: (flag: boolean) => {
    settingsStore.setSelectLanguageDialogVisibility(flag);
    if (flag) {
      nextTick(() => selectedEl.value?.scrollIntoView({ behavior: 'smooth' }));
    }
  },
});

const selectedLang = computed<Language>({
  get: () => settingsStore.language as Language,
  set: (value) => {
    void settingsStore.setLanguage(value);
  },
});

const entries = Languages.map((language) => {
  const translationKey = `languages.${language.key}`;
  const translatedName = t(translationKey);

  return {
    key: language.key as Language,
    value: language.value,
    name: translatedName !== translationKey ? translatedName : language.name,
  };
});

function setSelectedEl(element: HTMLDivElement | null, isSelected: boolean): void {
  if (isSelected) {
    selectedEl.value = element;
  } else if (selectedEl.value === element) {
    selectedEl.value = null;
  }
}
</script>
