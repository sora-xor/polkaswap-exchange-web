import { VueConstructor } from 'vue'

export const TranslationMock = (vue: VueConstructor) =>
  vue.mixin({ name: 'TranslationMixin', methods: { t: jest.fn(), tc: jest.fn() } })
