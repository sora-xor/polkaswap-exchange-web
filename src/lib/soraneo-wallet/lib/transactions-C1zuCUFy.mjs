import { n as f, m as a, x as d } from './index-CgrbEUSl.mjs';
import { c as m } from './index-D1vJKCDW.mjs';
import './index-ayDJ1GZG.mjs';
const u = f`
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
var w = function (n, t, i, o) {
  var r = arguments.length,
    e = r < 3 ? t : o === null ? (o = Object.getOwnPropertyDescriptor(t, i)) : o,
    l;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') e = Reflect.decorate(n, t, i, o);
  else for (var c = n.length - 1; c >= 0; c--) (l = n[c]) && (e = (r < 3 ? l(e) : r > 3 ? l(t, i, e) : l(t, i)) || e);
  return (r > 3 && e && Object.defineProperty(t, i, e), e);
};
let s = class extends a {
  render() {
    return d`
      <wui-flex flexDirection="column" .padding=${['0', '3', '3', '3']} gap="3">
        <w3m-activity-list page="activity"></w3m-activity-list>
      </wui-flex>
    `;
  }
};
s.styles = u;
s = w([m('w3m-transactions-view')], s);
export { s as W3mTransactionsView };
//# sourceMappingURL=transactions-C1zuCUFy.mjs.map
