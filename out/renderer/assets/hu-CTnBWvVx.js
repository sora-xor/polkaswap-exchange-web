import { d as dayjs } from "./index-73GArslZ.js";
var locale = {
  name: "hu",
  weekdays: "vasárnap_hétfő_kedd_szerda_csütörtök_péntek_szombat".split("_"),
  weekdaysShort: "vas_hét_kedd_sze_csüt_pén_szo".split("_"),
  weekdaysMin: "v_h_k_sze_cs_p_szo".split("_"),
  months: "január_február_március_április_május_június_július_augusztus_szeptember_október_november_december".split("_"),
  monthsShort: "jan_feb_márc_ápr_máj_jún_júl_aug_szept_okt_nov_dec".split("_"),
  ordinal: function ordinal(n) {
    return n + ".";
  },
  weekStart: 1,
  relativeTime: {
    future: "%s múlva",
    past: "%s",
    s: function s(_, _s, ___, isFuture) {
      return "néhány másodperc" + (isFuture || _s ? "" : "e");
    },
    m: function m(_, s2, ___, isFuture) {
      return "egy perc" + (isFuture || s2 ? "" : "e");
    },
    mm: function mm(n, s2, ___, isFuture) {
      return n + " perc" + (isFuture || s2 ? "" : "e");
    },
    h: function h(_, s2, ___, isFuture) {
      return "egy " + (isFuture || s2 ? "óra" : "órája");
    },
    hh: function hh(n, s2, ___, isFuture) {
      return n + " " + (isFuture || s2 ? "óra" : "órája");
    },
    d: function d(_, s2, ___, isFuture) {
      return "egy " + (isFuture || s2 ? "nap" : "napja");
    },
    dd: function dd(n, s2, ___, isFuture) {
      return n + " " + (isFuture || s2 ? "nap" : "napja");
    },
    M: function M(_, s2, ___, isFuture) {
      return "egy " + (isFuture || s2 ? "hónap" : "hónapja");
    },
    MM: function MM(n, s2, ___, isFuture) {
      return n + " " + (isFuture || s2 ? "hónap" : "hónapja");
    },
    y: function y(_, s2, ___, isFuture) {
      return "egy " + (isFuture || s2 ? "év" : "éve");
    },
    yy: function yy(n, s2, ___, isFuture) {
      return n + " " + (isFuture || s2 ? "év" : "éve");
    }
  },
  formats: {
    LT: "H:mm",
    LTS: "H:mm:ss",
    L: "YYYY.MM.DD.",
    LL: "YYYY. MMMM D.",
    LLL: "YYYY. MMMM D. H:mm",
    LLLL: "YYYY. MMMM D., dddd H:mm"
  }
};
dayjs.locale(locale, null, true);
export {
  locale as default
};
