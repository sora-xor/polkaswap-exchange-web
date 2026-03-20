const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./basic-BdHQPBTW.js","./walletconnect-BVoLvI4P.js","./index-73GArslZ.js","./index-CsTIO-Ll.css","./index-5878y4Sm.js","./if-defined-DpCpmSxP.js","./index-lAjfmR0R.js","./index-Cm7UDlkl.js","./index-Cztg-IpD.js","./index-SiM7Ib3-.js","./index-CBcUV-KC.js","./index-Bag94m_F.js","./index-DAKl5XGv.js","./index-Bz3_ZVag.js","./index-DgvHPQm2.js","./index-Bga-Wh90.js","./browser-3QHqHj2W.js","./index-xvpTmtDJ.js","./index-BH8iPnnC.js","./ref-j6LTZZuR.js","./index-Oesj6-8K.js","./index-B80WMNJI.js","./w3m-modal-CHqpe017.js","./index-CNGtVqwE.js","./index-W8RzVVH7.js","./index-FTJ7N_Mw.js","./index-B9aMMm-V.js","./MathUtil-BspOY7Kj.js","./ConstantsUtil-BrK1znIM.js","./index-B6Sdk_ow.js","./HelpersUtil-DHNzaUb2.js","./index-4b6jC2di.js","./index-D7Al7wfJ.js","./SwapController-BZ4iHZ-m.js"])))=>i.map(i=>d[i]);
import { bM as __vitePreload } from "./index-73GArslZ.js";
import { A as AppKitBaseClient, l as ConnectorController, a as ChainController, m as ConnectionController, c as CoreHelperUtil, O as OptionsController, P as PACKAGE_VERSION } from "./walletconnect-BVoLvI4P.js";
let isInitialized = false;
class AppKit extends AppKitBaseClient {
  // -- Overrides --------------------------------------------------------------
  async open(options) {
    const isConnected = ConnectorController.isConnected();
    if (!isConnected) {
      await super.open(options);
    }
  }
  async close() {
    await super.close();
    if (this.options.manualWCControl) {
      const address = ChainController.getAccountData(this.activeChainNamespace)?.address;
      ConnectionController.finalizeWcConnection(address);
    }
  }
  async syncIdentity(_request) {
    return Promise.resolve();
  }
  async syncBalance(_params) {
    return Promise.resolve();
  }
  async injectModalUi() {
    if (!isInitialized && CoreHelperUtil.isClient()) {
      await __vitePreload(() => import("./basic-BdHQPBTW.js").then((n) => n.e), true ? __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]) : void 0, import.meta.url);
      await __vitePreload(() => import("./w3m-modal-CHqpe017.js"), true ? __vite__mapDeps([22,1,2,3,4,5,23,11,12,24,9,21,25,8,7,26,17,27,10,28,29,30,31,32,13,18,33,6]) : void 0, import.meta.url);
      const isElementCreated = document.querySelector("w3m-modal");
      if (!isElementCreated) {
        const modal = document.createElement("w3m-modal");
        if (!OptionsController.state.disableAppend && !OptionsController.state.enableEmbedded) {
          document.body.insertAdjacentElement("beforeend", modal);
        }
      }
      isInitialized = true;
    }
  }
}
function createAppKit(options) {
  return new AppKit({
    ...options,
    basic: true,
    sdkVersion: `html-core-${PACKAGE_VERSION}`
  });
}
export {
  AppKit,
  createAppKit
};
