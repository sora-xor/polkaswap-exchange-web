import { aX as process$1 } from "./index-73GArslZ.js";
var define_process_env_default = {};
const ConstantsUtil = {
  ACCOUNT_TABS: [{ label: "Tokens" }, { label: "Activity" }],
  SECURE_SITE_ORIGIN: (typeof process$1 !== "undefined" && typeof define_process_env_default !== "undefined" ? define_process_env_default["NEXT_PUBLIC_SECURE_SITE_ORIGIN"] : void 0) || "https://secure.walletconnect.org",
  VIEW_DIRECTION: {
    Next: "next",
    Prev: "prev"
  },
  ANIMATION_DURATIONS: {
    HeaderText: 120
  },
  VIEWS_WITH_LEGAL_FOOTER: [
    "Connect",
    "ConnectWallets",
    "OnRampTokenSelect",
    "OnRampFiatSelect",
    "OnRampProviders"
  ],
  VIEWS_WITH_DEFAULT_FOOTER: ["Networks"]
};
export {
  ConstantsUtil as C
};
