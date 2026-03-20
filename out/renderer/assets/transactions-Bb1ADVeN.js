import { t as i, q as i$1, x } from "./walletconnect-BVoLvI4P.js";
import { c as customElement } from "./index-5878y4Sm.js";
import "./index-DD4AQ_vp.js";
import "./index-73GArslZ.js";
import "./relativeTime-8MZMp0Re.js";
import "./index-Cm7UDlkl.js";
import "./if-defined-DpCpmSxP.js";
import "./index-Bz3_ZVag.js";
import "./index-SiM7Ib3-.js";
import "./index-xvpTmtDJ.js";
const styles = i`
  :host > wui-flex:first-child {
    height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let W3mTransactionsView = class W3mTransactionsView2 extends i$1 {
  render() {
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "3", "3", "3"]} gap="3">
        <w3m-activity-list page="activity"></w3m-activity-list>
      </wui-flex>
    `;
  }
};
W3mTransactionsView.styles = styles;
W3mTransactionsView = __decorate([
  customElement("w3m-transactions-view")
], W3mTransactionsView);
export {
  W3mTransactionsView
};
