import {
  a9 as K,
  k as O,
  m as R,
  x as l,
  r as re,
  C as M,
  aa as m,
  a as P,
  R as oe,
  O as se,
  E as ae,
  t as ce,
  W as ue,
} from './index-CgrbEUSl.mjs';
import { U as X, n as p, c as C, r as N } from './index-D1vJKCDW.mjs';
import A from 'dayjs';
import './index-v0YluuaR.mjs';
import './index-CAs464gf.mjs';
import { o as le } from './if-defined-DgIoGpc1.mjs';
import './index-DIEZAM9s.mjs';
import './index-C3dyjDT6.mjs';
var z = { exports: {} },
  de = z.exports,
  Z;
function pe() {
  return (
    Z ||
      ((Z = 1),
      (function (e, t) {
        (function (r, n) {
          e.exports = n();
        })(de, function () {
          return {
            name: 'en',
            weekdays: 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
            months: 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
            ordinal: function (r) {
              var n = ['th', 'st', 'nd', 'rd'],
                o = r % 100;
              return '[' + r + (n[(o - 20) % 10] || n[o] || n[0]) + ']';
            },
          };
        });
      })(z)),
    z.exports
  );
}
var me = pe();
const fe = /* @__PURE__ */ K(me);
var j = { exports: {} },
  he = j.exports,
  ee;
function ge() {
  return (
    ee ||
      ((ee = 1),
      (function (e, t) {
        (function (r, n) {
          e.exports = n();
        })(he, function () {
          return function (r, n, o) {
            r = r || {};
            var i = n.prototype,
              s = {
                future: 'in %s',
                past: '%s ago',
                s: 'a few seconds',
                m: 'a minute',
                mm: '%d minutes',
                h: 'an hour',
                hh: '%d hours',
                d: 'a day',
                dd: '%d days',
                M: 'a month',
                MM: '%d months',
                y: 'a year',
                yy: '%d years',
              };
            function a(c, d, h, x) {
              return i.fromToBase(c, d, h, x);
            }
            ((o.en.relativeTime = s),
              (i.fromToBase = function (c, d, h, x, Q) {
                for (
                  var k,
                    F,
                    U,
                    B = h.$locale().relativeTime || s,
                    q = r.thresholds || [
                      { l: 's', r: 44, d: 'second' },
                      { l: 'm', r: 89 },
                      { l: 'mm', r: 44, d: 'minute' },
                      { l: 'h', r: 89 },
                      { l: 'hh', r: 21, d: 'hour' },
                      { l: 'd', r: 35 },
                      { l: 'dd', r: 25, d: 'day' },
                      { l: 'M', r: 45 },
                      { l: 'MM', r: 10, d: 'month' },
                      { l: 'y', r: 17 },
                      { l: 'yy', d: 'year' },
                    ],
                    ne = q.length,
                    D = 0;
                  D < ne;
                  D += 1
                ) {
                  var y = q[D];
                  y.d && (k = x ? o(c).diff(h, y.d, !0) : h.diff(c, y.d, !0));
                  var I = (r.rounding || Math.round)(Math.abs(k));
                  if (((U = k > 0), I <= y.r || !y.r)) {
                    I <= 1 && D > 0 && (y = q[D - 1]);
                    var Y = B[y.l];
                    (Q && (I = Q('' + I)), (F = typeof Y == 'string' ? Y.replace('%d', I) : Y(I, d, y.l, U)));
                    break;
                  }
                }
                if (d) return F;
                var G = U ? B.future : B.past;
                return typeof G == 'function' ? G(F) : G.replace('%s', F);
              }),
              (i.to = function (c, d) {
                return a(c, d, this, !0);
              }),
              (i.from = function (c, d) {
                return a(c, d, this);
              }));
            var u = function (c) {
              return c.$u ? o.utc() : o();
            };
            ((i.toNow = function (c) {
              return this.to(u(this), c);
            }),
              (i.fromNow = function (c) {
                return this.from(u(this), c);
              }));
          };
        });
      })(j)),
    j.exports
  );
}
var we = ge();
const xe = /* @__PURE__ */ K(we);
var E = { exports: {} },
  ye = E.exports,
  te;
function be() {
  return (
    te ||
      ((te = 1),
      (function (e, t) {
        (function (r, n) {
          e.exports = n();
        })(ye, function () {
          return function (r, n, o) {
            o.updateLocale = function (i, s) {
              var a = o.Ls[i];
              if (a)
                return (
                  (s ? Object.keys(s) : []).forEach(function (u) {
                    a[u] = s[u];
                  }),
                  a
                );
            };
          };
        });
      })(E)),
    E.exports
  );
}
var ve = be();
const $e = /* @__PURE__ */ K(ve);
A.extend(xe);
A.extend($e);
const Te = {
    ...fe,
    name: 'en-web3-modal',
    relativeTime: {
      future: 'in %s',
      past: '%s ago',
      s: '%d sec',
      m: '1 min',
      mm: '%d min',
      h: '1 hr',
      hh: '%d hrs',
      d: '1 d',
      dd: '%d d',
      M: '1 mo',
      MM: '%d mo',
      y: '1 yr',
      yy: '%d yr',
    },
  },
  Ie = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
A.locale('en-web3-modal', Te);
const V = {
    getMonthNameByIndex(e) {
      return Ie[e];
    },
    getYear(e = /* @__PURE__ */ new Date().toISOString()) {
      return A(e).year();
    },
    getRelativeDateFromNow(e) {
      return A(e).locale('en-web3-modal').fromNow(!0);
    },
    formatDate(e, t = 'DD MMM') {
      return A(e).format(t);
    },
  },
  _e = 3,
  L = 0.1,
  Ae = ['receive', 'deposit', 'borrow', 'claim'],
  De = ['withdraw', 'repay', 'burn'],
  _ = {
    getTransactionGroupTitle(e, t) {
      const r = V.getYear(),
        n = V.getMonthNameByIndex(t);
      return e === r ? n : `${n} ${e}`;
    },
    getTransactionImages(e) {
      const [t] = e;
      return e?.length > 1 ? e.map((n) => this.getTransactionImage(n)) : [this.getTransactionImage(t)];
    },
    getTransactionImage(e) {
      return {
        type: _.getTransactionTransferTokenType(e),
        url: _.getTransactionImageURL(e),
      };
    },
    getTransactionImageURL(e) {
      let t;
      const r = !!e?.nft_info,
        n = !!e?.fungible_info;
      return (e && r ? (t = e?.nft_info?.content?.preview?.url) : e && n && (t = e?.fungible_info?.icon?.url), t);
    },
    getTransactionTransferTokenType(e) {
      if (e?.fungible_info) return 'FUNGIBLE';
      if (e?.nft_info) return 'NFT';
    },
    getTransactionDescriptions(e, t) {
      const r = e?.metadata?.operationType,
        n = t || e?.transfers,
        o = n?.length > 0,
        i = n?.length > 1,
        s = o && n?.every((x) => !!x?.fungible_info),
        [a, u] = n;
      let c = this.getTransferDescription(a),
        d = this.getTransferDescription(u);
      if (!o)
        return (r === 'send' || r === 'receive') && s
          ? ((c = X.getTruncateString({
              string: e?.metadata.sentFrom,
              charsStart: 4,
              charsEnd: 6,
              truncate: 'middle',
            })),
            (d = X.getTruncateString({
              string: e?.metadata.sentTo,
              charsStart: 4,
              charsEnd: 6,
              truncate: 'middle',
            })),
            [c, d])
          : [e.metadata.status];
      if (i) return n.map((x) => this.getTransferDescription(x));
      let h = '';
      return (Ae.includes(r) ? (h = '+') : De.includes(r) && (h = '-'), (c = h.concat(c)), [c]);
    },
    getTransferDescription(e) {
      let t = '';
      return (
        e &&
          (e?.nft_info
            ? (t = e?.nft_info?.name || '-')
            : e?.fungible_info && (t = this.getFungibleTransferDescription(e) || '-')),
        t
      );
    },
    getFungibleTransferDescription(e) {
      return e ? [this.getQuantityFixedValue(e?.quantity.numeric), e?.fungible_info?.symbol].join(' ').trim() : null;
    },
    mergeTransfers(e) {
      if (e?.length <= 1) return e;
      const r = this.filterGasFeeTransfers(e).reduce((o, i) => {
        const s = i?.fungible_info?.name,
          a = o.find(({ fungible_info: u, direction: c }) => s && s === u?.name && c === i.direction);
        if (a) {
          const u = Number(a.quantity.numeric) + Number(i.quantity.numeric);
          ((a.quantity.numeric = u.toString()), (a.value = (a.value || 0) + (i.value || 0)));
        } else o.push(i);
        return o;
      }, []);
      let n = r;
      return (
        r.length > 2 && (n = r.sort((o, i) => (i.value || 0) - (o.value || 0)).slice(0, 2)),
        (n = n.sort((o, i) =>
          o.direction === 'out' && i.direction === 'in' ? -1 : o.direction === 'in' && i.direction === 'out' ? 1 : 0
        )),
        n
      );
    },
    filterGasFeeTransfers(e) {
      const t = e.reduce((n, o) => {
          const i = o?.fungible_info?.name;
          return (i && (n[i] || (n[i] = []), n[i].push(o)), n);
        }, {}),
        r = [];
      return (
        Object.values(t).forEach((n) => {
          if (n.length === 1) {
            const o = n[0];
            o && r.push(o);
          } else {
            const o = n.filter((s) => s.direction === 'in'),
              i = n.filter((s) => s.direction === 'out');
            if (o.length === 1 && i.length === 1) {
              const s = o[0],
                a = i[0];
              let u = !1;
              if (s && a) {
                const c = Number(s.quantity.numeric),
                  d = Number(a.quantity.numeric);
                d < c * L ? (r.push(s), (u = !0)) : c < d * L && (r.push(a), (u = !0));
              }
              u || r.push(...n);
            } else {
              const s = this.filterGasFeesFromTokenGroup(n);
              r.push(...s);
            }
          }
        }),
        e.forEach((n) => {
          n?.fungible_info?.name || r.push(n);
        }),
        r
      );
    },
    filterGasFeesFromTokenGroup(e) {
      if (e.length <= 1) return e;
      const t = e.map((a) => Number(a.quantity.numeric)),
        r = Math.max(...t),
        n = Math.min(...t),
        o = 0.01;
      if (n < r * o) return e.filter((u) => Number(u.quantity.numeric) >= r * o);
      const i = e.filter((a) => a.direction === 'in'),
        s = e.filter((a) => a.direction === 'out');
      if (i.length === 1 && s.length === 1) {
        const a = i[0],
          u = s[0];
        if (a && u) {
          const c = Number(a.quantity.numeric),
            d = Number(u.quantity.numeric);
          if (d < c * L) return [a];
          if (c < d * L) return [u];
        }
      }
      return e;
    },
    getQuantityFixedValue(e) {
      return e ? parseFloat(e).toFixed(_e) : null;
    },
  };
var H;
(function (e) {
  ((e.approve = 'approved'),
    (e.bought = 'bought'),
    (e.borrow = 'borrowed'),
    (e.burn = 'burnt'),
    (e.cancel = 'canceled'),
    (e.claim = 'claimed'),
    (e.deploy = 'deployed'),
    (e.deposit = 'deposited'),
    (e.execute = 'executed'),
    (e.mint = 'minted'),
    (e.receive = 'received'),
    (e.repay = 'repaid'),
    (e.send = 'sent'),
    (e.sell = 'sold'),
    (e.stake = 'staked'),
    (e.trade = 'swapped'),
    (e.unstake = 'unstaked'),
    (e.withdraw = 'withdrawn'));
})(H || (H = {}));
const Oe = O`
  :host > wui-flex {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 40px;
    height: 40px;
    box-shadow: inset 0 0 0 1px ${({ tokens: e }) => e.core.glass010};
    background-color: ${({ tokens: e }) => e.core.glass010};
  }

  :host([data-no-images='true']) > wui-flex {
    background-color: ${({ tokens: e }) => e.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: e }) => e[3]} !important;
  }

  :host > wui-flex wui-image {
    display: block;
  }

  :host > wui-flex,
  :host > wui-flex wui-image,
  .swap-images-container,
  .swap-images-container.nft,
  wui-image.nft {
    border-top-left-radius: var(--local-left-border-radius);
    border-top-right-radius: var(--local-right-border-radius);
    border-bottom-left-radius: var(--local-left-border-radius);
    border-bottom-right-radius: var(--local-right-border-radius);
  }

  wui-icon {
    width: 20px;
    height: 20px;
  }

  .swap-images-container {
    position: relative;
    width: 40px;
    height: 40px;
    overflow: hidden;
  }

  .swap-images-container wui-image:first-child {
    position: absolute;
    width: 40px;
    height: 40px;
    top: 0;
    left: 0%;
    clip-path: inset(0px calc(50% + 2px) 0px 0%);
  }

  .swap-images-container wui-image:last-child {
    clip-path: inset(0px 0px 0px calc(50% + 2px));
  }

  wui-flex.status-box {
    position: absolute;
    right: 0;
    bottom: 0;
    transform: translate(20%, 20%);
    border-radius: ${({ borderRadius: e }) => e[4]};
    background-color: ${({ tokens: e }) => e.theme.backgroundPrimary};
    box-shadow: 0 0 0 2px ${({ tokens: e }) => e.theme.backgroundPrimary};
    overflow: hidden;
    width: 16px;
    height: 16px;
  }
`;
var $ = function (e, t, r, n) {
  var o = arguments.length,
    i = o < 3 ? t : n === null ? (n = Object.getOwnPropertyDescriptor(t, r)) : n,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') i = Reflect.decorate(e, t, r, n);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (i = (o < 3 ? s(i) : o > 3 ? s(t, r, i) : s(t, r)) || i);
  return (o > 3 && i && Object.defineProperty(t, r, i), i);
};
let g = class extends R {
  constructor() {
    (super(...arguments),
      (this.images = []),
      (this.secondImage = {
        type: void 0,
        url: '',
      }));
  }
  render() {
    const [t, r] = this.images;
    this.images.length || (this.dataset.noImages = 'true');
    const n = t?.type === 'NFT',
      o = r?.url ? r.type === 'NFT' : n,
      i = n ? 'var(--apkt-borderRadius-3)' : 'var(--apkt-borderRadius-5)',
      s = o ? 'var(--apkt-borderRadius-3)' : 'var(--apkt-borderRadius-5)';
    return (
      (this.style.cssText = `
    --local-left-border-radius: ${i};
    --local-right-border-radius: ${s};
    `),
      l`<wui-flex> ${this.templateVisual()} ${this.templateIcon()} </wui-flex>`
    );
  }
  templateVisual() {
    const [t, r] = this.images,
      n = t?.type;
    return this.images.length === 2 && (t?.url || r?.url)
      ? l`<div class="swap-images-container">
        ${t?.url ? l`<wui-image src=${t.url} alt="Transaction image"></wui-image>` : null}
        ${r?.url ? l`<wui-image src=${r.url} alt="Transaction image"></wui-image>` : null}
      </div>`
      : t?.url
        ? l`<wui-image src=${t.url} alt="Transaction image"></wui-image>`
        : n === 'NFT'
          ? l`<wui-icon size="inherit" color="default" name="nftPlaceholder"></wui-icon>`
          : l`<wui-icon size="inherit" color="default" name="coinPlaceholder"></wui-icon>`;
  }
  templateIcon() {
    let t = 'accent-primary',
      r;
    return (
      (r = this.getIcon()),
      this.status && (t = this.getStatusColor()),
      r
        ? l`
      <wui-flex alignItems="center" justifyContent="center" class="status-box">
        <wui-icon-box size="sm" color=${t} icon=${r}></wui-icon-box>
      </wui-flex>
    `
        : null
    );
  }
  getDirectionIcon() {
    switch (this.direction) {
      case 'in':
        return 'arrowBottom';
      case 'out':
        return 'arrowTop';
      default:
        return;
    }
  }
  getIcon() {
    return this.onlyDirectionIcon
      ? this.getDirectionIcon()
      : this.type === 'trade'
        ? 'swapHorizontal'
        : this.type === 'approve'
          ? 'checkmark'
          : this.type === 'cancel'
            ? 'close'
            : this.getDirectionIcon();
  }
  getStatusColor() {
    switch (this.status) {
      case 'confirmed':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'inverse';
      default:
        return 'accent-primary';
    }
  }
};
g.styles = [Oe];
$([p()], g.prototype, 'type', void 0);
$([p()], g.prototype, 'status', void 0);
$([p()], g.prototype, 'direction', void 0);
$([p({ type: Boolean })], g.prototype, 'onlyDirectionIcon', void 0);
$([p({ type: Array })], g.prototype, 'images', void 0);
$([p({ type: Object })], g.prototype, 'secondImage', void 0);
g = $([C('wui-transaction-visual')], g);
const Re = O`
  :host {
    width: 100%;
  }

  :host > wui-flex:first-child {
    align-items: center;
    column-gap: ${({ spacing: e }) => e[2]};
    padding: ${({ spacing: e }) => e[1]} ${({ spacing: e }) => e[2]};
    width: 100%;
  }

  :host > wui-flex:first-child wui-text:nth-child(1) {
    text-transform: capitalize;
  }

  wui-transaction-visual {
    width: 40px;
    height: 40px;
  }

  wui-flex {
    flex: 1;
  }

  :host wui-flex wui-flex {
    overflow: hidden;
  }

  :host .description-container wui-text span {
    word-break: break-all;
  }

  :host .description-container wui-text {
    overflow: hidden;
  }

  :host .description-separator-icon {
    margin: 0px 6px;
  }

  :host wui-text > span {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
`;
var b = function (e, t, r, n) {
  var o = arguments.length,
    i = o < 3 ? t : n === null ? (n = Object.getOwnPropertyDescriptor(t, r)) : n,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') i = Reflect.decorate(e, t, r, n);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (i = (o < 3 ? s(i) : o > 3 ? s(t, r, i) : s(t, r)) || i);
  return (o > 3 && i && Object.defineProperty(t, r, i), i);
};
let f = class extends R {
  constructor() {
    (super(...arguments), (this.type = 'approve'), (this.onlyDirectionIcon = !1), (this.images = []));
  }
  render() {
    return l`
      <wui-flex>
        <wui-transaction-visual
          .status=${this.status}
          direction=${le(this.direction)}
          type=${this.type}
          .onlyDirectionIcon=${this.onlyDirectionIcon}
          .images=${this.images}
        ></wui-transaction-visual>
        <wui-flex flexDirection="column" gap="1">
          <wui-text variant="lg-medium" color="primary">
            ${H[this.type] || this.type}
          </wui-text>
          <wui-flex class="description-container">
            ${this.templateDescription()} ${this.templateSecondDescription()}
          </wui-flex>
        </wui-flex>
        <wui-text variant="sm-medium" color="secondary"><span>${this.date}</span></wui-text>
      </wui-flex>
    `;
  }
  templateDescription() {
    const t = this.descriptions?.[0];
    return t
      ? l`
          <wui-text variant="md-regular" color="secondary">
            <span>${t}</span>
          </wui-text>
        `
      : null;
  }
  templateSecondDescription() {
    const t = this.descriptions?.[1];
    return t
      ? l`
          <wui-icon class="description-separator-icon" size="sm" name="arrowRight"></wui-icon>
          <wui-text variant="md-regular" color="secondary">
            <span>${t}</span>
          </wui-text>
        `
      : null;
  }
};
f.styles = [re, Re];
b([p()], f.prototype, 'type', void 0);
b([p({ type: Array })], f.prototype, 'descriptions', void 0);
b([p()], f.prototype, 'date', void 0);
b([p({ type: Boolean })], f.prototype, 'onlyDirectionIcon', void 0);
b([p()], f.prototype, 'status', void 0);
b([p()], f.prototype, 'direction', void 0);
b([p({ type: Array })], f.prototype, 'images', void 0);
f = b([C('wui-transaction-list-item')], f);
const Ce = O`
  wui-flex {
    position: relative;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  wui-image {
    border-radius: ${({ borderRadius: e }) => e[128]};
  }

  .fallback-icon {
    color: ${({ tokens: e }) => e.theme.iconInverse};
    border-radius: ${({ borderRadius: e }) => e[3]};
    background-color: ${({ tokens: e }) => e.theme.foregroundPrimary};
  }

  .direction-icon,
  .status-image {
    position: absolute;
    right: 0;
    bottom: 0;
    border-radius: ${({ borderRadius: e }) => e[128]};
    border: 2px solid ${({ tokens: e }) => e.theme.backgroundPrimary};
  }

  .direction-icon {
    padding: ${({ spacing: e }) => e['01']};
    color: ${({ tokens: e }) => e.core.iconSuccess};

    background-color: color-mix(
      in srgb,
      ${({ tokens: e }) => e.core.textSuccess} 30%,
      ${({ tokens: e }) => e.theme.backgroundPrimary} 70%
    );
  }

  /* -- Sizes --------------------------------------------------- */
  :host([data-size='sm']) > wui-image:not(.status-image),
  :host([data-size='sm']) > wui-flex {
    width: 24px;
    height: 24px;
  }

  :host([data-size='lg']) > wui-image:not(.status-image),
  :host([data-size='lg']) > wui-flex {
    width: 40px;
    height: 40px;
  }

  :host([data-size='sm']) .fallback-icon {
    height: 16px;
    width: 16px;
    padding: ${({ spacing: e }) => e[1]};
  }

  :host([data-size='lg']) .fallback-icon {
    height: 32px;
    width: 32px;
    padding: ${({ spacing: e }) => e[1]};
  }

  :host([data-size='sm']) .direction-icon,
  :host([data-size='sm']) .status-image {
    transform: translate(40%, 30%);
  }

  :host([data-size='lg']) .direction-icon,
  :host([data-size='lg']) .status-image {
    transform: translate(40%, 10%);
  }

  :host([data-size='sm']) .status-image {
    height: 14px;
    width: 14px;
  }

  :host([data-size='lg']) .status-image {
    height: 20px;
    width: 20px;
  }

  /* -- Crop effects --------------------------------------------------- */
  .swap-crop-left-image,
  .swap-crop-right-image {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  .swap-crop-left-image {
    left: 0;
    clip-path: inset(0px calc(50% + 1.5px) 0px 0%);
  }

  .swap-crop-right-image {
    right: 0;
    clip-path: inset(0px 0px 0px calc(50% + 1.5px));
  }
`;
var S = function (e, t, r, n) {
  var o = arguments.length,
    i = o < 3 ? t : n === null ? (n = Object.getOwnPropertyDescriptor(t, r)) : n,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') i = Reflect.decorate(e, t, r, n);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (i = (o < 3 ? s(i) : o > 3 ? s(t, r, i) : s(t, r)) || i);
  return (o > 3 && i && Object.defineProperty(t, r, i), i);
};
const W = {
  sm: 'xxs',
  lg: 'md',
};
let v = class extends R {
  constructor() {
    (super(...arguments), (this.type = 'approve'), (this.size = 'lg'), (this.statusImageUrl = ''), (this.images = []));
  }
  render() {
    return l`<wui-flex>${this.templateVisual()} ${this.templateIcon()}</wui-flex>`;
  }
  templateVisual() {
    switch (((this.dataset.size = this.size), this.type)) {
      case 'trade':
        return this.swapTemplate();
      case 'fiat':
        return this.fiatTemplate();
      case 'unknown':
        return this.unknownTemplate();
      default:
        return this.tokenTemplate();
    }
  }
  swapTemplate() {
    const [t, r] = this.images;
    return this.images.length === 2 && (t || r)
      ? l`
        <wui-image class="swap-crop-left-image" src=${t} alt="Swap image"></wui-image>
        <wui-image class="swap-crop-right-image" src=${r} alt="Swap image"></wui-image>
      `
      : t
        ? l`<wui-image src=${t} alt="Swap image"></wui-image>`
        : null;
  }
  fiatTemplate() {
    return l`<wui-icon
      class="fallback-icon"
      size=${W[this.size]}
      name="dollar"
    ></wui-icon>`;
  }
  unknownTemplate() {
    return l`<wui-icon
      class="fallback-icon"
      size=${W[this.size]}
      name="questionMark"
    ></wui-icon>`;
  }
  tokenTemplate() {
    const [t] = this.images;
    return t
      ? l`<wui-image src=${t} alt="Token image"></wui-image> `
      : l`<wui-icon
      class="fallback-icon"
      name=${this.type === 'nft' ? 'image' : 'coinPlaceholder'}
    ></wui-icon>`;
  }
  templateIcon() {
    return this.statusImageUrl
      ? l`<wui-image
        class="status-image"
        src=${this.statusImageUrl}
        alt="Status image"
      ></wui-image>`
      : l`<wui-icon
      class="direction-icon"
      size=${W[this.size]}
      name=${this.getTemplateIcon()}
    ></wui-icon>`;
  }
  getTemplateIcon() {
    return this.type === 'trade' ? 'arrowClockWise' : 'arrowBottom';
  }
};
v.styles = [Ce];
S([p()], v.prototype, 'type', void 0);
S([p()], v.prototype, 'size', void 0);
S([p()], v.prototype, 'statusImageUrl', void 0);
S([p({ type: Array })], v.prototype, 'images', void 0);
v = S([C('wui-transaction-thumbnail')], v);
const Ne = O`
  :host > wui-flex:first-child {
    gap: ${({ spacing: e }) => e[2]};
    padding: ${({ spacing: e }) => e[3]};
    width: 100%;
  }

  wui-flex {
    display: flex;
    flex: 1;
  }
`;
var Se = function (e, t, r, n) {
  var o = arguments.length,
    i = o < 3 ? t : n === null ? (n = Object.getOwnPropertyDescriptor(t, r)) : n,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') i = Reflect.decorate(e, t, r, n);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (i = (o < 3 ? s(i) : o > 3 ? s(t, r, i) : s(t, r)) || i);
  return (o > 3 && i && Object.defineProperty(t, r, i), i);
};
let J = class extends R {
  render() {
    return l`
      <wui-flex alignItems="center">
        <wui-shimmer width="40px" height="40px" rounded></wui-shimmer>
        <wui-flex flexDirection="column" gap="1">
          <wui-shimmer width="124px" height="16px" rounded></wui-shimmer>
          <wui-shimmer width="60px" height="14px" rounded></wui-shimmer>
        </wui-flex>
        <wui-shimmer width="24px" height="12px" rounded></wui-shimmer>
      </wui-flex>
    `;
  }
};
J.styles = [re, Ne];
J = Se([C('wui-transaction-list-item-loader')], J);
const Fe = O`
  :host {
    min-height: 100%;
  }

  .group-container[last-group='true'] {
    padding-bottom: ${({ spacing: e }) => e[3]};
  }

  .contentContainer {
    height: 280px;
  }

  .contentContainer > wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({ borderRadius: e }) => e[3]};
  }

  .contentContainer > .textContent {
    width: 65%;
  }

  .emptyContainer {
    height: 100%;
  }
`;
var T = function (e, t, r, n) {
  var o = arguments.length,
    i = o < 3 ? t : n === null ? (n = Object.getOwnPropertyDescriptor(t, r)) : n,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') i = Reflect.decorate(e, t, r, n);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (i = (o < 3 ? s(i) : o > 3 ? s(t, r, i) : s(t, r)) || i);
  return (o > 3 && i && Object.defineProperty(t, r, i), i);
};
const ie = 'last-transaction',
  Me = 7;
let w = class extends R {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.paginationObserver = void 0),
      (this.page = 'activity'),
      (this.caipAddress = M.state.activeCaipAddress),
      (this.transactionsByYear = m.state.transactionsByYear),
      (this.loading = m.state.loading),
      (this.empty = m.state.empty),
      (this.next = m.state.next),
      m.clearCursor(),
      this.unsubscribe.push(
        M.subscribeKey('activeCaipAddress', (t) => {
          (t && this.caipAddress !== t && (m.resetTransactions(), m.fetchTransactions(t)), (this.caipAddress = t));
        }),
        M.subscribeKey('activeCaipNetwork', () => {
          this.updateTransactionView();
        }),
        m.subscribe((t) => {
          ((this.transactionsByYear = t.transactionsByYear),
            (this.loading = t.loading),
            (this.empty = t.empty),
            (this.next = t.next));
        })
      ));
  }
  firstUpdated() {
    (this.updateTransactionView(), this.createPaginationObserver());
  }
  updated() {
    this.setPaginationObserver();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((t) => t());
  }
  render() {
    return l` ${this.empty ? null : this.templateTransactionsByYear()}
    ${this.loading ? this.templateLoading() : null}
    ${!this.loading && this.empty ? this.templateEmpty() : null}`;
  }
  updateTransactionView() {
    (m.resetTransactions(), this.caipAddress && m.fetchTransactions(P.getPlainAddress(this.caipAddress)));
  }
  templateTransactionsByYear() {
    return Object.keys(this.transactionsByYear)
      .sort()
      .reverse()
      .map((r) => {
        const n = parseInt(r, 10),
          o = new Array(12)
            .fill(null)
            .map((i, s) => {
              const a = _.getTransactionGroupTitle(n, s),
                u = this.transactionsByYear[n]?.[s];
              return {
                groupTitle: a,
                transactions: u,
              };
            })
            .filter(({ transactions: i }) => i)
            .reverse();
        return o.map(({ groupTitle: i, transactions: s }, a) => {
          const u = a === o.length - 1;
          return s
            ? l`
          <wui-flex
            flexDirection="column"
            class="group-container"
            last-group="${u ? 'true' : 'false'}"
            data-testid="month-indexes"
          >
            <wui-flex
              alignItems="center"
              flexDirection="row"
              .padding=${['2', '3', '3', '3']}
            >
              <wui-text variant="md-medium" color="secondary" data-testid="group-title">
                ${i}
              </wui-text>
            </wui-flex>
            <wui-flex flexDirection="column" gap="2">
              ${this.templateTransactions(s, u)}
            </wui-flex>
          </wui-flex>
        `
            : null;
        });
      });
  }
  templateRenderTransaction(t, r) {
    const {
      date: n,
      descriptions: o,
      direction: i,
      images: s,
      status: a,
      type: u,
      transfers: c,
      isAllNFT: d,
    } = this.getTransactionListItemProps(t);
    return l`
      <wui-transaction-list-item
        date=${n}
        .direction=${i}
        id=${r && this.next ? ie : ''}
        status=${a}
        type=${u}
        .images=${s}
        .onlyDirectionIcon=${d || c.length === 1}
        .descriptions=${o}
      ></wui-transaction-list-item>
    `;
  }
  templateTransactions(t, r) {
    return t.map((n, o) => {
      const i = r && o === t.length - 1;
      return l`${this.templateRenderTransaction(n, i)}`;
    });
  }
  emptyStateActivity() {
    return l`<wui-flex
      class="emptyContainer"
      flexGrow="1"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      .padding=${['10', '5', '10', '5']}
      gap="5"
      data-testid="empty-activity-state"
    >
      <wui-icon-box color="default" icon="wallet" size="xl"></wui-icon-box>
      <wui-flex flexDirection="column" alignItems="center" gap="2">
        <wui-text align="center" variant="lg-medium" color="primary">No Transactions yet</wui-text>
        <wui-text align="center" variant="lg-regular" color="secondary"
          >Start trading on dApps <br />
          to grow your wallet!</wui-text
        >
      </wui-flex>
    </wui-flex>`;
  }
  emptyStateAccount() {
    return l`<wui-flex
      class="contentContainer"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap="4"
      data-testid="empty-account-state"
    >
      <wui-icon-box icon="swapHorizontal" size="lg" color="default"></wui-icon-box>
      <wui-flex
        class="textContent"
        gap="2"
        flexDirection="column"
        justifyContent="center"
        flexDirection="column"
      >
        <wui-text variant="md-regular" align="center" color="primary">No activity yet</wui-text>
        <wui-text variant="sm-regular" align="center" color="secondary"
          >Your next transactions will appear here</wui-text
        >
      </wui-flex>
      <wui-link @click=${this.onReceiveClick.bind(this)}>Trade</wui-link>
    </wui-flex>`;
  }
  templateEmpty() {
    return this.page === 'account' ? l`${this.emptyStateAccount()}` : l`${this.emptyStateActivity()}`;
  }
  templateLoading() {
    return this.page === 'activity'
      ? Array(Me)
          .fill(l` <wui-transaction-list-item-loader></wui-transaction-list-item-loader> `)
          .map((t) => t)
      : null;
  }
  onReceiveClick() {
    oe.push('WalletReceive');
  }
  createPaginationObserver() {
    const { projectId: t } = se.state;
    ((this.paginationObserver = new IntersectionObserver(([r]) => {
      r?.isIntersecting &&
        !this.loading &&
        (m.fetchTransactions(P.getPlainAddress(this.caipAddress)),
        ae.sendEvent({
          type: 'track',
          event: 'LOAD_MORE_TRANSACTIONS',
          properties: {
            address: P.getPlainAddress(this.caipAddress),
            projectId: t,
            cursor: this.next,
            isSmartAccount: ce(M.state.activeChain) === ue.ACCOUNT_TYPES.SMART_ACCOUNT,
          },
        }));
    }, {})),
      this.setPaginationObserver());
  }
  setPaginationObserver() {
    this.paginationObserver?.disconnect();
    const t = this.shadowRoot?.querySelector(`#${ie}`);
    t && this.paginationObserver?.observe(t);
  }
  getTransactionListItemProps(t) {
    const r = V.formatDate(t?.metadata?.minedAt),
      n = _.mergeTransfers(t?.transfers),
      o = _.getTransactionDescriptions(t, n),
      i = n?.[0],
      s = !!i && n?.every((u) => !!u.nft_info),
      a = _.getTransactionImages(n);
    return {
      date: r,
      direction: i?.direction,
      descriptions: o,
      isAllNFT: s,
      images: a,
      status: t.metadata?.status,
      transfers: n,
      type: t.metadata?.operationType,
    };
  }
};
w.styles = Fe;
T([p()], w.prototype, 'page', void 0);
T([N()], w.prototype, 'caipAddress', void 0);
T([N()], w.prototype, 'transactionsByYear', void 0);
T([N()], w.prototype, 'loading', void 0);
T([N()], w.prototype, 'empty', void 0);
T([N()], w.prototype, 'next', void 0);
w = T([C('w3m-activity-list')], w);
//# sourceMappingURL=index-ayDJ1GZG.mjs.map
