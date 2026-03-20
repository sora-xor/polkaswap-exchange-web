import { d as dayjs } from "./index-73GArslZ.js";
function plural(n) {
  return n > 1 && n < 5 && ~~(n / 10) !== 1;
}
function translate(number, withoutSuffix, key, isFuture) {
  var result = number + " ";
  switch (key) {
    case "s":
      return withoutSuffix || isFuture ? "pár sekund" : "pár sekundami";
    case "m":
      return withoutSuffix ? "minuta" : isFuture ? "minutu" : "minutou";
    case "mm":
      if (withoutSuffix || isFuture) {
        return result + (plural(number) ? "minuty" : "minut");
      }
      return result + "minutami";
    case "h":
      return withoutSuffix ? "hodina" : isFuture ? "hodinu" : "hodinou";
    case "hh":
      if (withoutSuffix || isFuture) {
        return result + (plural(number) ? "hodiny" : "hodin");
      }
      return result + "hodinami";
    case "d":
      return withoutSuffix || isFuture ? "den" : "dnem";
    case "dd":
      if (withoutSuffix || isFuture) {
        return result + (plural(number) ? "dny" : "dní");
      }
      return result + "dny";
    case "M":
      return withoutSuffix || isFuture ? "měsíc" : "měsícem";
    case "MM":
      if (withoutSuffix || isFuture) {
        return result + (plural(number) ? "měsíce" : "měsíců");
      }
      return result + "měsíci";
    case "y":
      return withoutSuffix || isFuture ? "rok" : "rokem";
    case "yy":
      if (withoutSuffix || isFuture) {
        return result + (plural(number) ? "roky" : "let");
      }
      return result + "lety";
  }
}
var locale = {
  name: "cs",
  weekdays: "neděle_pondělí_úterý_středa_čtvrtek_pátek_sobota".split("_"),
  weekdaysShort: "ne_po_út_st_čt_pá_so".split("_"),
  weekdaysMin: "ne_po_út_st_čt_pá_so".split("_"),
  months: "leden_únor_březen_duben_květen_červen_červenec_srpen_září_říjen_listopad_prosinec".split("_"),
  monthsShort: "led_úno_bře_dub_kvě_čvn_čvc_srp_zář_říj_lis_pro".split("_"),
  weekStart: 1,
  yearStart: 4,
  ordinal: function ordinal(n) {
    return n + ".";
  },
  formats: {
    LT: "H:mm",
    LTS: "H:mm:ss",
    L: "DD.MM.YYYY",
    LL: "D. MMMM YYYY",
    LLL: "D. MMMM YYYY H:mm",
    LLLL: "dddd D. MMMM YYYY H:mm",
    l: "D. M. YYYY"
  },
  relativeTime: {
    future: "za %s",
    past: "před %s",
    s: translate,
    m: translate,
    mm: translate,
    h: translate,
    hh: translate,
    d: translate,
    dd: translate,
    M: translate,
    MM: translate,
    y: translate,
    yy: translate
  }
};
dayjs.locale(locale, null, true);
export {
  locale as default
};
