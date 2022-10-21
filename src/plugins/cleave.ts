import Vue from 'vue';
import Cleave from 'cleave.js';

Vue.directive('cleave', {
  inserted: (el, binding) => {
    // @ts-expect-error value doesn't exist
    el.cleave = new Cleave(el, binding.value || {});
  },
  update: (el) => {
    const event = new Event('input', { bubbles: true });
    setTimeout(function () {
      // @ts-expect-error value doesn't exist
      el.value = el.cleave.properties.result;
      el.dispatchEvent(event);
    }, 100);
  },
});
