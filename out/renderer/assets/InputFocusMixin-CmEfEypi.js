import { z as defineComponent } from "./index-73GArslZ.js";
const InputFocusMixin = defineComponent({
  props: {
    autofocus: {
      type: Boolean,
      default: false
    }
  },
  mounted() {
    this.focusCheck();
  },
  activated() {
    this.focusCheck();
  },
  methods: {
    async focusCheck() {
      if (this.autofocus) {
        await this.$nextTick();
        this.focus();
      }
    },
    focus() {
      const input = this.$refs.input;
      if (input && typeof input.focus === "function") {
        input.focus();
      }
    }
  }
});
export {
  InputFocusMixin as I
};
