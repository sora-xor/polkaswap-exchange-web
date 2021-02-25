import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class ConfirmDialogMixin extends Mixins(TranslationMixin) {
  showConfirmDialog = false

  openConfirmDialog (): void {
    this.showConfirmDialog = true
  }

  async handleConfirmDialog (func: () => Promise<void>): Promise<void> {
    try {
      await func()
      this.showConfirmDialog = false
    } catch (error) {
      console.error(error)
      this.$alert(this.t(error.message), { title: this.t('errorText') })
    }
  }
}
