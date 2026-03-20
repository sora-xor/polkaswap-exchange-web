import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    autofocus: {
      type: Boolean,
      default: false,
    },
  },
  mounted(): void {
    this.focusCheck();
  },
  activated(): void {
    this.focusCheck();
  },
  methods: {
    async focusCheck(this: any): Promise<void> {
      if (this.autofocus) {
        await this.$nextTick();
        this.focus();
      }
    },
    focus(this: any): void {
      const input = (this.$refs as Record<string, any>).input;
      if (input && typeof input.focus === 'function') {
        input.focus();
      }
    },
  },
});
