import { Vue, Component } from 'vue-property-decorator';

const OrdinalRules = {
  en: (v) => {
    const n = +v;

    if (!Number.isFinite(n) || n === 0) return v;

    const remainder = n % 10;

    if (remainder === 1) return `${n}st`;
    if (remainder === 2) return `${n}nd`;
    if (remainder === 3) return `${n}rd`;

    return `${n}th`;
  },
};

@Component
export default class TranslationMixin extends Vue {
  t(key: string, values?: any): string {
    return this.$root.$t(key, values) as string;
  }

  tc(key: string, choice?: number, values?: any): string {
    return this.$root.$tc(key, choice, values);
  }

  te(key: string): boolean {
    return this.$root.$te(key);
  }

  tOrdinal(n) {
    return OrdinalRules[this.$i18n.locale]?.(n) ?? n;
  }
}
