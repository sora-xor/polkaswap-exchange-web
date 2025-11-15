import {
  ak as I,
  al as G,
  am as Ke,
  an as dr,
  ao as ge,
  ap as z,
  aq as Fe,
  ar as eo,
  as as to,
  at as De,
  au as Pa,
  av as Aa,
  aw as Un,
  ax as V,
  ay as Ie,
  az as Xt,
  aA as Ba,
  aB as Se,
  aC as se,
  aD as $a,
  aE as Ia,
  aF as Ge,
  aG as Sa,
  aH as ka,
  aI as Ta,
  aJ as Dt,
  aK as Mn,
  aL as Yr,
  aM as Kr,
  aN as Xr,
  aO as Jr,
  aP as Qr,
  aQ as es,
  aR as ts,
  aS as ns,
  aT as jn,
  aU as Jt,
  aV as rs,
  aW as Na,
  aX as Vt,
  aY as ss,
  aZ as no,
  a_ as Ca,
  a$ as Dn,
  b0 as os,
  b1 as ro,
  b2 as is,
  b3 as Ra,
  b4 as so,
  b5 as as,
  b6 as Oa,
  b7 as oo,
  b8 as cs,
  b9 as Fa,
  ba as us,
} from './index-CgrbEUSl.mjs';
import {
  bm as U1,
  bl as M1,
  bn as j1,
  bo as D1,
  bp as G1,
  bi as H1,
  bq as q1,
  br as V1,
  bs as Z1,
  bt as W1,
  bu as Y1,
  bv as K1,
  bw as X1,
  bx as J1,
  by as Q1,
  bz as eb,
  bA as tb,
  bB as nb,
  bh as rb,
  bj as sb,
  bC as ob,
  bk as ib,
  bD as ab,
  bE as cb,
  bF as ub,
  bG as fb,
  bH as db,
  bI as lb,
  bJ as bb,
  bL as hb,
  bK as pb,
  bb as yb,
  bf as mb,
  bc as gb,
  bg as wb,
  be as xb,
  bM as vb,
  bd as Eb,
  bN as Pb,
} from './index-CgrbEUSl.mjs';
const za = '1.1.0';
let Q = class Gn extends Error {
  constructor(t, n = {}) {
    const r = n.cause instanceof Gn ? n.cause.details : n.cause?.message ? n.cause.message : n.details,
      s = (n.cause instanceof Gn && n.cause.docsPath) || n.docsPath,
      o = [
        t || 'An error occurred.',
        '',
        ...(n.metaMessages ? [...n.metaMessages, ''] : []),
        ...(s ? [`Docs: https://abitype.dev${s}`] : []),
        ...(r ? [`Details: ${r}`] : []),
        `Version: abitype@${za}`,
      ].join(`
`);
    (super(o),
      Object.defineProperty(this, 'details', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'docsPath', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'metaMessages', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'shortMessage', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiTypeError',
      }),
      n.cause && (this.cause = n.cause),
      (this.details = r),
      (this.docsPath = s),
      (this.metaMessages = n.metaMessages),
      (this.shortMessage = t));
  }
};
function Ne(e, t) {
  return e.exec(t)?.groups;
}
const io = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/,
  ao =
    /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/,
  co = /^\(.+?\).*?$/,
  fs = /^tuple(?<array>(\[(\d*)\])*)$/;
function Hn(e) {
  let t = e.type;
  if (fs.test(e.type) && 'components' in e) {
    t = '(';
    const n = e.components.length;
    for (let s = 0; s < n; s++) {
      const o = e.components[s];
      ((t += Hn(o)), s < n - 1 && (t += ', '));
    }
    const r = Ne(fs, e.type);
    return (
      (t += `)${r?.array ?? ''}`),
      Hn({
        ...e,
        type: t,
      })
    );
  }
  return ('indexed' in e && e.indexed && (t = `${t} indexed`), e.name ? `${t} ${e.name}` : t);
}
function st(e) {
  let t = '';
  const n = e.length;
  for (let r = 0; r < n; r++) {
    const s = e[r];
    ((t += Hn(s)), r !== n - 1 && (t += ', '));
  }
  return t;
}
function Zt(e) {
  return e.type === 'function'
    ? `function ${e.name}(${st(e.inputs)})${e.stateMutability && e.stateMutability !== 'nonpayable' ? ` ${e.stateMutability}` : ''}${e.outputs?.length ? ` returns (${st(e.outputs)})` : ''}`
    : e.type === 'event'
      ? `event ${e.name}(${st(e.inputs)})`
      : e.type === 'error'
        ? `error ${e.name}(${st(e.inputs)})`
        : e.type === 'constructor'
          ? `constructor(${st(e.inputs)})${e.stateMutability === 'payable' ? ' payable' : ''}`
          : e.type === 'fallback'
            ? `fallback() external${e.stateMutability === 'payable' ? ' payable' : ''}`
            : 'receive() external payable';
}
const uo = /^error (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
function La(e) {
  return uo.test(e);
}
function _a(e) {
  return Ne(uo, e);
}
const fo = /^event (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
function Ua(e) {
  return fo.test(e);
}
function Ma(e) {
  return Ne(fo, e);
}
const lo =
  /^function (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)(?: (?<scope>external|public{1}))?(?: (?<stateMutability>pure|view|nonpayable|payable{1}))?(?: returns\s?\((?<returns>.*?)\))?$/;
function ja(e) {
  return lo.test(e);
}
function Da(e) {
  return Ne(lo, e);
}
const bo = /^struct (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*) \{(?<properties>.*?)\}$/;
function Qt(e) {
  return bo.test(e);
}
function Ga(e) {
  return Ne(bo, e);
}
const ho = /^constructor\((?<parameters>.*?)\)(?:\s(?<stateMutability>payable{1}))?$/;
function Ha(e) {
  return ho.test(e);
}
function qa(e) {
  return Ne(ho, e);
}
const po = /^fallback\(\) external(?:\s(?<stateMutability>payable{1}))?$/;
function Va(e) {
  return po.test(e);
}
function Za(e) {
  return Ne(po, e);
}
const Wa = /^receive\(\) external payable$/;
function Ya(e) {
  return Wa.test(e);
}
const ds = /* @__PURE__ */ new Set(['memory', 'indexed', 'storage', 'calldata']),
  Ka = /* @__PURE__ */ new Set(['indexed']),
  qn = /* @__PURE__ */ new Set(['calldata', 'memory', 'storage']);
class Xa extends Q {
  constructor({ signature: t }) {
    (super('Failed to parse ABI item.', {
      details: `parseAbiItem(${JSON.stringify(t, null, 2)})`,
      docsPath: '/api/human#parseabiitem-1',
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidAbiItemError',
      }));
  }
}
class Ja extends Q {
  constructor({ type: t }) {
    (super('Unknown type.', {
      metaMessages: [`Type "${t}" is not a valid ABI type. Perhaps you forgot to include a struct signature?`],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'UnknownTypeError',
      }));
  }
}
class Qa extends Q {
  constructor({ type: t }) {
    (super('Unknown type.', {
      metaMessages: [`Type "${t}" is not a valid ABI type.`],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'UnknownSolidityTypeError',
      }));
  }
}
class ec extends Q {
  constructor({ params: t }) {
    (super('Failed to parse ABI parameters.', {
      details: `parseAbiParameters(${JSON.stringify(t, null, 2)})`,
      docsPath: '/api/human#parseabiparameters-1',
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidAbiParametersError',
      }));
  }
}
class tc extends Q {
  constructor({ param: t }) {
    (super('Invalid ABI parameter.', {
      details: t,
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidParameterError',
      }));
  }
}
class nc extends Q {
  constructor({ param: t, name: n }) {
    (super('Invalid ABI parameter.', {
      details: t,
      metaMessages: [
        `"${n}" is a protected Solidity keyword. More info: https://docs.soliditylang.org/en/latest/cheatsheet.html`,
      ],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'SolidityProtectedKeywordError',
      }));
  }
}
class rc extends Q {
  constructor({ param: t, type: n, modifier: r }) {
    (super('Invalid ABI parameter.', {
      details: t,
      metaMessages: [`Modifier "${r}" not allowed${n ? ` in "${n}" type` : ''}.`],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidModifierError',
      }));
  }
}
class sc extends Q {
  constructor({ param: t, type: n, modifier: r }) {
    (super('Invalid ABI parameter.', {
      details: t,
      metaMessages: [
        `Modifier "${r}" not allowed${n ? ` in "${n}" type` : ''}.`,
        `Data location can only be specified for array, struct, or mapping types, but "${r}" was given.`,
      ],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidFunctionModifierError',
      }));
  }
}
class oc extends Q {
  constructor({ abiParameter: t }) {
    (super('Invalid ABI parameter.', {
      details: JSON.stringify(t, null, 2),
      metaMessages: ['ABI parameter type is invalid.'],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidAbiTypeParameterError',
      }));
  }
}
class pt extends Q {
  constructor({ signature: t, type: n }) {
    (super(`Invalid ${n} signature.`, {
      details: t,
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidSignatureError',
      }));
  }
}
class ic extends Q {
  constructor({ signature: t }) {
    (super('Unknown signature.', {
      details: t,
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'UnknownSignatureError',
      }));
  }
}
class ac extends Q {
  constructor({ signature: t }) {
    (super('Invalid struct signature.', {
      details: t,
      metaMessages: ['No properties exist.'],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidStructSignatureError',
      }));
  }
}
class cc extends Q {
  constructor({ type: t }) {
    (super('Circular reference detected.', {
      metaMessages: [`Struct "${t}" is a circular reference.`],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'CircularReferenceError',
      }));
  }
}
class uc extends Q {
  constructor({ current: t, depth: n }) {
    (super('Unbalanced parentheses.', {
      metaMessages: [`"${t.trim()}" has too many ${n > 0 ? 'opening' : 'closing'} parentheses.`],
      details: `Depth "${n}"`,
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'InvalidParenthesisError',
      }));
  }
}
function fc(e, t, n) {
  let r = '';
  if (n)
    for (const s of Object.entries(n)) {
      if (!s) continue;
      let o = '';
      for (const i of s[1]) o += `[${i.type}${i.name ? `:${i.name}` : ''}]`;
      r += `(${s[0]}{${o}})`;
    }
  return t ? `${t}:${e}${r}` : e;
}
const xn = /* @__PURE__ */ new Map([
  // Unnamed
  ['address', { type: 'address' }],
  ['bool', { type: 'bool' }],
  ['bytes', { type: 'bytes' }],
  ['bytes32', { type: 'bytes32' }],
  ['int', { type: 'int256' }],
  ['int256', { type: 'int256' }],
  ['string', { type: 'string' }],
  ['uint', { type: 'uint256' }],
  ['uint8', { type: 'uint8' }],
  ['uint16', { type: 'uint16' }],
  ['uint24', { type: 'uint24' }],
  ['uint32', { type: 'uint32' }],
  ['uint64', { type: 'uint64' }],
  ['uint96', { type: 'uint96' }],
  ['uint112', { type: 'uint112' }],
  ['uint160', { type: 'uint160' }],
  ['uint192', { type: 'uint192' }],
  ['uint256', { type: 'uint256' }],
  // Named
  ['address owner', { type: 'address', name: 'owner' }],
  ['address to', { type: 'address', name: 'to' }],
  ['bool approved', { type: 'bool', name: 'approved' }],
  ['bytes _data', { type: 'bytes', name: '_data' }],
  ['bytes data', { type: 'bytes', name: 'data' }],
  ['bytes signature', { type: 'bytes', name: 'signature' }],
  ['bytes32 hash', { type: 'bytes32', name: 'hash' }],
  ['bytes32 r', { type: 'bytes32', name: 'r' }],
  ['bytes32 root', { type: 'bytes32', name: 'root' }],
  ['bytes32 s', { type: 'bytes32', name: 's' }],
  ['string name', { type: 'string', name: 'name' }],
  ['string symbol', { type: 'string', name: 'symbol' }],
  ['string tokenURI', { type: 'string', name: 'tokenURI' }],
  ['uint tokenId', { type: 'uint256', name: 'tokenId' }],
  ['uint8 v', { type: 'uint8', name: 'v' }],
  ['uint256 balance', { type: 'uint256', name: 'balance' }],
  ['uint256 tokenId', { type: 'uint256', name: 'tokenId' }],
  ['uint256 value', { type: 'uint256', name: 'value' }],
  // Indexed
  ['event:address indexed from', { type: 'address', name: 'from', indexed: !0 }],
  ['event:address indexed to', { type: 'address', name: 'to', indexed: !0 }],
  ['event:uint indexed tokenId', { type: 'uint256', name: 'tokenId', indexed: !0 }],
  ['event:uint256 indexed tokenId', { type: 'uint256', name: 'tokenId', indexed: !0 }],
]);
function Vn(e, t = {}) {
  if (ja(e)) return dc(e, t);
  if (Ua(e)) return lc(e, t);
  if (La(e)) return bc(e, t);
  if (Ha(e)) return hc(e, t);
  if (Va(e)) return pc(e);
  if (Ya(e))
    return {
      type: 'receive',
      stateMutability: 'payable',
    };
  throw new ic({ signature: e });
}
function dc(e, t = {}) {
  const n = Da(e);
  if (!n) throw new pt({ signature: e, type: 'function' });
  const r = ee(n.parameters),
    s = [],
    o = r.length;
  for (let a = 0; a < o; a++)
    s.push(
      ke(r[a], {
        modifiers: qn,
        structs: t,
        type: 'function',
      })
    );
  const i = [];
  if (n.returns) {
    const a = ee(n.returns),
      c = a.length;
    for (let u = 0; u < c; u++)
      i.push(
        ke(a[u], {
          modifiers: qn,
          structs: t,
          type: 'function',
        })
      );
  }
  return {
    name: n.name,
    type: 'function',
    stateMutability: n.stateMutability ?? 'nonpayable',
    inputs: s,
    outputs: i,
  };
}
function lc(e, t = {}) {
  const n = Ma(e);
  if (!n) throw new pt({ signature: e, type: 'event' });
  const r = ee(n.parameters),
    s = [],
    o = r.length;
  for (let i = 0; i < o; i++)
    s.push(
      ke(r[i], {
        modifiers: Ka,
        structs: t,
        type: 'event',
      })
    );
  return { name: n.name, type: 'event', inputs: s };
}
function bc(e, t = {}) {
  const n = _a(e);
  if (!n) throw new pt({ signature: e, type: 'error' });
  const r = ee(n.parameters),
    s = [],
    o = r.length;
  for (let i = 0; i < o; i++) s.push(ke(r[i], { structs: t, type: 'error' }));
  return { name: n.name, type: 'error', inputs: s };
}
function hc(e, t = {}) {
  const n = qa(e);
  if (!n) throw new pt({ signature: e, type: 'constructor' });
  const r = ee(n.parameters),
    s = [],
    o = r.length;
  for (let i = 0; i < o; i++) s.push(ke(r[i], { structs: t, type: 'constructor' }));
  return {
    type: 'constructor',
    stateMutability: n.stateMutability ?? 'nonpayable',
    inputs: s,
  };
}
function pc(e) {
  const t = Za(e);
  if (!t) throw new pt({ signature: e, type: 'fallback' });
  return {
    type: 'fallback',
    stateMutability: t.stateMutability ?? 'nonpayable',
  };
}
const yc =
    /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*(?:\spayable)?)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/,
  mc =
    /^\((?<type>.+?)\)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/,
  gc = /^u?int$/;
function ke(e, t) {
  const n = fc(e, t?.type, t?.structs);
  if (xn.has(n)) return xn.get(n);
  const r = co.test(e),
    s = Ne(r ? mc : yc, e);
  if (!s) throw new tc({ param: e });
  if (s.name && xc(s.name)) throw new nc({ param: e, name: s.name });
  const o = s.name ? { name: s.name } : {},
    i = s.modifier === 'indexed' ? { indexed: !0 } : {},
    a = t?.structs ?? {};
  let c,
    u = {};
  if (r) {
    c = 'tuple';
    const d = ee(s.type),
      l = [],
      b = d.length;
    for (let y = 0; y < b; y++) l.push(ke(d[y], { structs: a }));
    u = { components: l };
  } else if (s.type in a) ((c = 'tuple'), (u = { components: a[s.type] }));
  else if (gc.test(s.type)) c = `${s.type}256`;
  else if (s.type === 'address payable') c = 'address';
  else if (((c = s.type), t?.type !== 'struct' && !yo(c))) throw new Qa({ type: c });
  if (s.modifier) {
    if (!t?.modifiers?.has?.(s.modifier))
      throw new rc({
        param: e,
        type: t?.type,
        modifier: s.modifier,
      });
    if (qn.has(s.modifier) && !vc(c, !!s.array))
      throw new sc({
        param: e,
        type: t?.type,
        modifier: s.modifier,
      });
  }
  const f = {
    type: `${c}${s.array ?? ''}`,
    ...o,
    ...i,
    ...u,
  };
  return (xn.set(n, f), f);
}
function ee(e, t = [], n = '', r = 0) {
  const s = e.trim().length;
  for (let o = 0; o < s; o++) {
    const i = e[o],
      a = e.slice(o + 1);
    switch (i) {
      case ',':
        return r === 0 ? ee(a, [...t, n.trim()]) : ee(a, t, `${n}${i}`, r);
      case '(':
        return ee(a, t, `${n}${i}`, r + 1);
      case ')':
        return ee(a, t, `${n}${i}`, r - 1);
      default:
        return ee(a, t, `${n}${i}`, r);
    }
  }
  if (n === '') return t;
  if (r !== 0) throw new uc({ current: n, depth: r });
  return (t.push(n.trim()), t);
}
function yo(e) {
  return e === 'address' || e === 'bool' || e === 'function' || e === 'string' || io.test(e) || ao.test(e);
}
const wc =
  /^(?:after|alias|anonymous|apply|auto|byte|calldata|case|catch|constant|copyof|default|defined|error|event|external|false|final|function|immutable|implements|in|indexed|inline|internal|let|mapping|match|memory|mutable|null|of|override|partial|private|promise|public|pure|reference|relocatable|return|returns|sizeof|static|storage|struct|super|supports|switch|this|true|try|typedef|typeof|var|view|virtual)$/;
function xc(e) {
  return (
    e === 'address' ||
    e === 'bool' ||
    e === 'function' ||
    e === 'string' ||
    e === 'tuple' ||
    io.test(e) ||
    ao.test(e) ||
    wc.test(e)
  );
}
function vc(e, t) {
  return t || e === 'bytes' || e === 'string' || e === 'tuple';
}
function lr(e) {
  const t = {},
    n = e.length;
  for (let i = 0; i < n; i++) {
    const a = e[i];
    if (!Qt(a)) continue;
    const c = Ga(a);
    if (!c) throw new pt({ signature: a, type: 'struct' });
    const u = c.properties.split(';'),
      f = [],
      d = u.length;
    for (let l = 0; l < d; l++) {
      const y = u[l].trim();
      if (!y) continue;
      const h = ke(y, {
        type: 'struct',
      });
      f.push(h);
    }
    if (!f.length) throw new ac({ signature: a });
    t[c.name] = f;
  }
  const r = {},
    s = Object.entries(t),
    o = s.length;
  for (let i = 0; i < o; i++) {
    const [a, c] = s[i];
    r[a] = mo(c, t);
  }
  return r;
}
const Ec = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*)(?<array>(?:\[\d*?\])+?)?$/;
function mo(e, t, n = /* @__PURE__ */ new Set()) {
  const r = [],
    s = e.length;
  for (let o = 0; o < s; o++) {
    const i = e[o];
    if (co.test(i.type)) r.push(i);
    else {
      const c = Ne(Ec, i.type);
      if (!c?.type) throw new oc({ abiParameter: i });
      const { array: u, type: f } = c;
      if (f in t) {
        if (n.has(f)) throw new cc({ type: f });
        r.push({
          ...i,
          type: `tuple${u ?? ''}`,
          components: mo(t[f] ?? [], t, /* @__PURE__ */ new Set([...n, f])),
        });
      } else if (yo(f)) r.push(i);
      else throw new Ja({ type: f });
    }
  }
  return r;
}
function go(e) {
  const t = lr(e),
    n = [],
    r = e.length;
  for (let s = 0; s < r; s++) {
    const o = e[s];
    Qt(o) || n.push(Vn(o, t));
  }
  return n;
}
function ls(e) {
  let t;
  if (typeof e == 'string') t = Vn(e);
  else {
    const n = lr(e),
      r = e.length;
    for (let s = 0; s < r; s++) {
      const o = e[s];
      if (!Qt(o)) {
        t = Vn(o, n);
        break;
      }
    }
  }
  if (!t) throw new Xa({ signature: e });
  return t;
}
function bs(e) {
  const t = [];
  if (typeof e == 'string') {
    const n = ee(e),
      r = n.length;
    for (let s = 0; s < r; s++) t.push(ke(n[s], { modifiers: ds }));
  } else {
    const n = lr(e),
      r = e.length;
    for (let s = 0; s < r; s++) {
      const o = e[s];
      if (Qt(o)) continue;
      const i = ee(o),
        a = i.length;
      for (let c = 0; c < a; c++) t.push(ke(i[c], { modifiers: ds, structs: n }));
    }
  }
  if (t.length === 0) throw new ec({ params: e });
  return t;
}
function L(e, t, n) {
  const r = e[t.name];
  if (typeof r == 'function') return r;
  const s = e[n];
  return typeof s == 'function' ? s : (o) => t(e, o);
}
function ae(e, { includeName: t = !1 } = {}) {
  if (e.type !== 'function' && e.type !== 'event' && e.type !== 'error') throw new Fc(e.type);
  return `${e.name}(${en(e.inputs, { includeName: t })})`;
}
function en(e, { includeName: t = !1 } = {}) {
  return e ? e.map((n) => Pc(n, { includeName: t })).join(t ? ', ' : ',') : '';
}
function Pc(e, { includeName: t }) {
  return e.type.startsWith('tuple')
    ? `(${en(e.components, { includeName: t })})${e.type.slice(5)}`
    : e.type + (t && e.name ? ` ${e.name}` : '');
}
class Ac extends I {
  constructor({ docsPath: t }) {
    super(
      [
        'A constructor was not found on the ABI.',
        'Make sure you are using the correct ABI and that the constructor exists on it.',
      ].join(`
`),
      {
        docsPath: t,
        name: 'AbiConstructorNotFoundError',
      }
    );
  }
}
class hs extends I {
  constructor({ docsPath: t }) {
    super(
      [
        'Constructor arguments were provided (`args`), but a constructor parameters (`inputs`) were not found on the ABI.',
        'Make sure you are using the correct ABI, and that the `inputs` attribute on the constructor exists.',
      ].join(`
`),
      {
        docsPath: t,
        name: 'AbiConstructorParamsNotFoundError',
      }
    );
  }
}
class wo extends I {
  constructor({ data: t, params: n, size: r }) {
    (super(
      [`Data size of ${r} bytes is too small for given parameters.`].join(`
`),
      {
        metaMessages: [`Params: (${en(n, { includeName: !0 })})`, `Data:   ${t} (${r} bytes)`],
        name: 'AbiDecodingDataSizeTooSmallError',
      }
    ),
      Object.defineProperty(this, 'data', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'params', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'size', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.data = t),
      (this.params = n),
      (this.size = r));
  }
}
class kt extends I {
  constructor() {
    super('Cannot decode zero data ("0x") with ABI parameters.', {
      name: 'AbiDecodingZeroDataError',
    });
  }
}
class Bc extends I {
  constructor({ expectedLength: t, givenLength: n, type: r }) {
    super(
      [`ABI encoding array length mismatch for type ${r}.`, `Expected length: ${t}`, `Given length: ${n}`].join(`
`),
      { name: 'AbiEncodingArrayLengthMismatchError' }
    );
  }
}
class $c extends I {
  constructor({ expectedSize: t, value: n }) {
    super(`Size of bytes "${n}" (bytes${G(n)}) does not match expected size (bytes${t}).`, {
      name: 'AbiEncodingBytesSizeMismatchError',
    });
  }
}
class Ic extends I {
  constructor({ expectedLength: t, givenLength: n }) {
    super(
      ['ABI encoding params/values length mismatch.', `Expected length (params): ${t}`, `Given length (values): ${n}`]
        .join(`
`),
      { name: 'AbiEncodingLengthMismatchError' }
    );
  }
}
class Sc extends I {
  constructor(t, { docsPath: n }) {
    super(
      [
        `Arguments (\`args\`) were provided to "${t}", but "${t}" on the ABI does not contain any parameters (\`inputs\`).`,
        'Cannot encode error result without knowing what the parameter types are.',
        'Make sure you are using the correct ABI and that the inputs exist on it.',
      ].join(`
`),
      {
        docsPath: n,
        name: 'AbiErrorInputsNotFoundError',
      }
    );
  }
}
class ps extends I {
  constructor(t, { docsPath: n } = {}) {
    super(
      [
        `Error ${t ? `"${t}" ` : ''}not found on ABI.`,
        'Make sure you are using the correct ABI and that the error exists on it.',
      ].join(`
`),
      {
        docsPath: n,
        name: 'AbiErrorNotFoundError',
      }
    );
  }
}
class xo extends I {
  constructor(t, { docsPath: n }) {
    (super(
      [
        `Encoded error signature "${t}" not found on ABI.`,
        'Make sure you are using the correct ABI and that the error exists on it.',
        `You can look up the decoded signature here: https://openchain.xyz/signatures?query=${t}.`,
      ].join(`
`),
      {
        docsPath: n,
        name: 'AbiErrorSignatureNotFoundError',
      }
    ),
      Object.defineProperty(this, 'signature', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.signature = t));
  }
}
class kc extends I {
  constructor({ docsPath: t }) {
    super('Cannot extract event signature from empty topics.', {
      docsPath: t,
      name: 'AbiEventSignatureEmptyTopicsError',
    });
  }
}
class vo extends I {
  constructor(t, { docsPath: n }) {
    super(
      [
        `Encoded event signature "${t}" not found on ABI.`,
        'Make sure you are using the correct ABI and that the event exists on it.',
        `You can look up the signature here: https://openchain.xyz/signatures?query=${t}.`,
      ].join(`
`),
      {
        docsPath: n,
        name: 'AbiEventSignatureNotFoundError',
      }
    );
  }
}
class ys extends I {
  constructor(t, { docsPath: n } = {}) {
    super(
      [
        `Event ${t ? `"${t}" ` : ''}not found on ABI.`,
        'Make sure you are using the correct ABI and that the event exists on it.',
      ].join(`
`),
      {
        docsPath: n,
        name: 'AbiEventNotFoundError',
      }
    );
  }
}
class ft extends I {
  constructor(t, { docsPath: n } = {}) {
    super(
      [
        `Function ${t ? `"${t}" ` : ''}not found on ABI.`,
        'Make sure you are using the correct ABI and that the function exists on it.',
      ].join(`
`),
      {
        docsPath: n,
        name: 'AbiFunctionNotFoundError',
      }
    );
  }
}
class Eo extends I {
  constructor(t, { docsPath: n }) {
    super(
      [
        `Function "${t}" does not contain any \`outputs\` on ABI.`,
        'Cannot decode function result without knowing what the parameter types are.',
        'Make sure you are using the correct ABI and that the function exists on it.',
      ].join(`
`),
      {
        docsPath: n,
        name: 'AbiFunctionOutputsNotFoundError',
      }
    );
  }
}
class Tc extends I {
  constructor(t, { docsPath: n }) {
    super(
      [
        `Encoded function signature "${t}" not found on ABI.`,
        'Make sure you are using the correct ABI and that the function exists on it.',
        `You can look up the signature here: https://openchain.xyz/signatures?query=${t}.`,
      ].join(`
`),
      {
        docsPath: n,
        name: 'AbiFunctionSignatureNotFoundError',
      }
    );
  }
}
class Nc extends I {
  constructor(t, n) {
    super('Found ambiguous types in overloaded ABI items.', {
      metaMessages: [
        `\`${t.type}\` in \`${ae(t.abiItem)}\`, and`,
        `\`${n.type}\` in \`${ae(n.abiItem)}\``,
        '',
        'These types encode differently and cannot be distinguished at runtime.',
        'Remove one of the ambiguous items in the ABI.',
      ],
      name: 'AbiItemAmbiguityError',
    });
  }
}
let Cc = class extends I {
  constructor({ expectedSize: t, givenSize: n }) {
    super(`Expected bytes${t}, got bytes${n}.`, {
      name: 'BytesSizeMismatchError',
    });
  }
};
class Pt extends I {
  constructor({ abiItem: t, data: n, params: r, size: s }) {
    (super(
      [`Data size of ${s} bytes is too small for non-indexed event parameters.`].join(`
`),
      {
        metaMessages: [`Params: (${en(r, { includeName: !0 })})`, `Data:   ${n} (${s} bytes)`],
        name: 'DecodeLogDataMismatch',
      }
    ),
      Object.defineProperty(this, 'abiItem', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'data', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'params', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'size', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.abiItem = t),
      (this.data = n),
      (this.params = r),
      (this.size = s));
  }
}
class tn extends I {
  constructor({ abiItem: t, param: n }) {
    (super(
      [
        `Expected a topic for indexed event parameter${n.name ? ` "${n.name}"` : ''} on event "${ae(t, { includeName: !0 })}".`,
      ].join(`
`),
      { name: 'DecodeLogTopicsMismatch' }
    ),
      Object.defineProperty(this, 'abiItem', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.abiItem = t));
  }
}
class Rc extends I {
  constructor(t, { docsPath: n }) {
    super(
      [`Type "${t}" is not a valid encoding type.`, 'Please provide a valid ABI type.'].join(`
`),
      { docsPath: n, name: 'InvalidAbiEncodingType' }
    );
  }
}
class Oc extends I {
  constructor(t, { docsPath: n }) {
    super(
      [`Type "${t}" is not a valid decoding type.`, 'Please provide a valid ABI type.'].join(`
`),
      { docsPath: n, name: 'InvalidAbiDecodingType' }
    );
  }
}
let Po = class extends I {
  constructor(t) {
    super(
      [`Value "${t}" is not a valid array.`].join(`
`),
      {
        name: 'InvalidArrayError',
      }
    );
  }
};
class Fc extends I {
  constructor(t) {
    super(
      [`"${t}" is not a valid definition type.`, 'Valid types: "function", "event", "error"'].join(`
`),
      { name: 'InvalidDefinitionTypeError' }
    );
  }
}
class zc extends I {
  constructor(t) {
    super(`Filter type "${t}" is not supported.`, {
      name: 'FilterTypeNotSupportedError',
    });
  }
}
const Lc = /* @__PURE__ */ new TextEncoder();
function yt(e, t = {}) {
  return typeof e == 'number' || typeof e == 'bigint'
    ? Uc(e, t)
    : typeof e == 'boolean'
      ? _c(e, t)
      : ge(e)
        ? we(e, t)
        : He(e, t);
}
function _c(e, t = {}) {
  const n = new Uint8Array(1);
  return ((n[0] = Number(e)), typeof t.size == 'number' ? (Ke(n, { size: t.size }), dr(n, { size: t.size })) : n);
}
const xe = {
  zero: 48,
  nine: 57,
  A: 65,
  F: 70,
  a: 97,
  f: 102,
};
function ms(e) {
  if (e >= xe.zero && e <= xe.nine) return e - xe.zero;
  if (e >= xe.A && e <= xe.F) return e - (xe.A - 10);
  if (e >= xe.a && e <= xe.f) return e - (xe.a - 10);
}
function we(e, t = {}) {
  let n = e;
  t.size && (Ke(n, { size: t.size }), (n = dr(n, { dir: 'right', size: t.size })));
  let r = n.slice(2);
  r.length % 2 && (r = `0${r}`);
  const s = r.length / 2,
    o = new Uint8Array(s);
  for (let i = 0, a = 0; i < s; i++) {
    const c = ms(r.charCodeAt(a++)),
      u = ms(r.charCodeAt(a++));
    if (c === void 0 || u === void 0) throw new I(`Invalid byte sequence ("${r[a - 2]}${r[a - 1]}" in "${r}").`);
    o[i] = c * 16 + u;
  }
  return o;
}
function Uc(e, t) {
  const n = z(e, t);
  return we(n);
}
function He(e, t = {}) {
  const n = Lc.encode(e);
  return typeof t.size == 'number' ? (Ke(n, { size: t.size }), dr(n, { dir: 'right', size: t.size })) : n;
}
const Gt = /* @__PURE__ */ BigInt(2 ** 32 - 1),
  gs = /* @__PURE__ */ BigInt(32);
function Mc(e, t = !1) {
  return t
    ? { h: Number(e & Gt), l: Number((e >> gs) & Gt) }
    : { h: Number((e >> gs) & Gt) | 0, l: Number(e & Gt) | 0 };
}
function jc(e, t = !1) {
  const n = e.length;
  let r = new Uint32Array(n),
    s = new Uint32Array(n);
  for (let o = 0; o < n; o++) {
    const { h: i, l: a } = Mc(e[o], t);
    [r[o], s[o]] = [i, a];
  }
  return [r, s];
}
const Dc = (e, t, n) => (e << n) | (t >>> (32 - n)),
  Gc = (e, t, n) => (t << n) | (e >>> (32 - n)),
  Hc = (e, t, n) => (t << (n - 32)) | (e >>> (64 - n)),
  qc = (e, t, n) => (e << (n - 32)) | (t >>> (64 - n)),
  nt = typeof globalThis == 'object' && 'crypto' in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Vc(e) {
  return e instanceof Uint8Array || (ArrayBuffer.isView(e) && e.constructor.name === 'Uint8Array');
}
function At(e) {
  if (!Number.isSafeInteger(e) || e < 0) throw new Error('positive integer expected, got ' + e);
}
function Ve(e, ...t) {
  if (!Vc(e)) throw new Error('Uint8Array expected');
  if (t.length > 0 && !t.includes(e.length))
    throw new Error('Uint8Array expected of length ' + t + ', got length=' + e.length);
}
function Zc(e) {
  if (typeof e != 'function' || typeof e.create != 'function')
    throw new Error('Hash should be wrapped by utils.createHasher');
  (At(e.outputLen), At(e.blockLen));
}
function dt(e, t = !0) {
  if (e.destroyed) throw new Error('Hash instance has been destroyed');
  if (t && e.finished) throw new Error('Hash#digest() has already been called');
}
function Ao(e, t) {
  Ve(e);
  const n = t.outputLen;
  if (e.length < n) throw new Error('digestInto() expects output buffer of length at least ' + n);
}
function Wc(e) {
  return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function lt(...e) {
  for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function vn(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function he(e, t) {
  return (e << (32 - t)) | (e >>> t);
}
const Yc = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function Kc(e) {
  return ((e << 24) & 4278190080) | ((e << 8) & 16711680) | ((e >>> 8) & 65280) | ((e >>> 24) & 255);
}
function Xc(e) {
  for (let t = 0; t < e.length; t++) e[t] = Kc(e[t]);
  return e;
}
const ws = Yc ? (e) => e : Xc;
function Jc(e) {
  if (typeof e != 'string') throw new Error('string expected');
  return new Uint8Array(new TextEncoder().encode(e));
}
function nn(e) {
  return (typeof e == 'string' && (e = Jc(e)), Ve(e), e);
}
function Qc(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    (Ve(s), (t += s.length));
  }
  const n = new Uint8Array(t);
  for (let r = 0, s = 0; r < e.length; r++) {
    const o = e[r];
    (n.set(o, s), (s += o.length));
  }
  return n;
}
class br {}
function Bo(e) {
  const t = (r) => e().update(nn(r)).digest(),
    n = e();
  return ((t.outputLen = n.outputLen), (t.blockLen = n.blockLen), (t.create = () => e()), t);
}
function e0(e = 32) {
  if (nt && typeof nt.getRandomValues == 'function') return nt.getRandomValues(new Uint8Array(e));
  if (nt && typeof nt.randomBytes == 'function') return Uint8Array.from(nt.randomBytes(e));
  throw new Error('crypto.getRandomValues must be defined');
}
const t0 = BigInt(0),
  vt = BigInt(1),
  n0 = BigInt(2),
  r0 = BigInt(7),
  s0 = BigInt(256),
  o0 = BigInt(113),
  $o = [],
  Io = [],
  So = [];
for (let e = 0, t = vt, n = 1, r = 0; e < 24; e++) {
  (([n, r] = [r, (2 * n + 3 * r) % 5]), $o.push(2 * (5 * r + n)), Io.push((((e + 1) * (e + 2)) / 2) % 64));
  let s = t0;
  for (let o = 0; o < 7; o++)
    ((t = ((t << vt) ^ ((t >> r0) * o0)) % s0), t & n0 && (s ^= vt << ((vt << /* @__PURE__ */ BigInt(o)) - vt)));
  So.push(s);
}
const ko = jc(So, !0),
  i0 = ko[0],
  a0 = ko[1],
  xs = (e, t, n) => (n > 32 ? Hc(e, t, n) : Dc(e, t, n)),
  vs = (e, t, n) => (n > 32 ? qc(e, t, n) : Gc(e, t, n));
function c0(e, t = 24) {
  const n = new Uint32Array(10);
  for (let r = 24 - t; r < 24; r++) {
    for (let i = 0; i < 10; i++) n[i] = e[i] ^ e[i + 10] ^ e[i + 20] ^ e[i + 30] ^ e[i + 40];
    for (let i = 0; i < 10; i += 2) {
      const a = (i + 8) % 10,
        c = (i + 2) % 10,
        u = n[c],
        f = n[c + 1],
        d = xs(u, f, 1) ^ n[a],
        l = vs(u, f, 1) ^ n[a + 1];
      for (let b = 0; b < 50; b += 10) ((e[i + b] ^= d), (e[i + b + 1] ^= l));
    }
    let s = e[2],
      o = e[3];
    for (let i = 0; i < 24; i++) {
      const a = Io[i],
        c = xs(s, o, a),
        u = vs(s, o, a),
        f = $o[i];
      ((s = e[f]), (o = e[f + 1]), (e[f] = c), (e[f + 1] = u));
    }
    for (let i = 0; i < 50; i += 10) {
      for (let a = 0; a < 10; a++) n[a] = e[i + a];
      for (let a = 0; a < 10; a++) e[i + a] ^= ~n[(a + 2) % 10] & n[(a + 4) % 10];
    }
    ((e[0] ^= i0[r]), (e[1] ^= a0[r]));
  }
  lt(n);
}
class hr extends br {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(t, n, r, s = !1, o = 24) {
    if (
      (super(),
      (this.pos = 0),
      (this.posOut = 0),
      (this.finished = !1),
      (this.destroyed = !1),
      (this.enableXOF = !1),
      (this.blockLen = t),
      (this.suffix = n),
      (this.outputLen = r),
      (this.enableXOF = s),
      (this.rounds = o),
      At(r),
      !(0 < t && t < 200))
    )
      throw new Error('only keccak-f1600 function is supported');
    ((this.state = new Uint8Array(200)), (this.state32 = Wc(this.state)));
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    (ws(this.state32), c0(this.state32, this.rounds), ws(this.state32), (this.posOut = 0), (this.pos = 0));
  }
  update(t) {
    (dt(this), (t = nn(t)), Ve(t));
    const { blockLen: n, state: r } = this,
      s = t.length;
    for (let o = 0; o < s; ) {
      const i = Math.min(n - this.pos, s - o);
      for (let a = 0; a < i; a++) r[this.pos++] ^= t[o++];
      this.pos === n && this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished) return;
    this.finished = !0;
    const { state: t, suffix: n, pos: r, blockLen: s } = this;
    ((t[r] ^= n), (n & 128) !== 0 && r === s - 1 && this.keccak(), (t[s - 1] ^= 128), this.keccak());
  }
  writeInto(t) {
    (dt(this, !1), Ve(t), this.finish());
    const n = this.state,
      { blockLen: r } = this;
    for (let s = 0, o = t.length; s < o; ) {
      this.posOut >= r && this.keccak();
      const i = Math.min(r - this.posOut, o - s);
      (t.set(n.subarray(this.posOut, this.posOut + i), s), (this.posOut += i), (s += i));
    }
    return t;
  }
  xofInto(t) {
    if (!this.enableXOF) throw new Error('XOF is not possible for this instance');
    return this.writeInto(t);
  }
  xof(t) {
    return (At(t), this.xofInto(new Uint8Array(t)));
  }
  digestInto(t) {
    if ((Ao(t, this), this.finished)) throw new Error('digest() was already called');
    return (this.writeInto(t), this.destroy(), t);
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    ((this.destroyed = !0), lt(this.state));
  }
  _cloneInto(t) {
    const { blockLen: n, suffix: r, outputLen: s, rounds: o, enableXOF: i } = this;
    return (
      t || (t = new hr(n, r, s, i, o)),
      t.state32.set(this.state32),
      (t.pos = this.pos),
      (t.posOut = this.posOut),
      (t.finished = this.finished),
      (t.rounds = o),
      (t.suffix = r),
      (t.outputLen = s),
      (t.enableXOF = i),
      (t.destroyed = this.destroyed),
      t
    );
  }
}
const u0 = (e, t, n) => Bo(() => new hr(t, e, n)),
  To = u0(1, 136, 256 / 8);
function q(e, t) {
  const n = t || 'hex',
    r = To(ge(e, { strict: !1 }) ? yt(e) : e);
  return n === 'bytes' ? r : Fe(r);
}
const f0 = (e) => q(yt(e));
function d0(e) {
  return f0(e);
}
function l0(e) {
  let t = !0,
    n = '',
    r = 0,
    s = '',
    o = !1;
  for (let i = 0; i < e.length; i++) {
    const a = e[i];
    if ((['(', ')', ','].includes(a) && (t = !0), a === '(' && r++, a === ')' && r--, !!t)) {
      if (r === 0) {
        if (a === ' ' && ['event', 'function', ''].includes(s)) s = '';
        else if (((s += a), a === ')')) {
          o = !0;
          break;
        }
        continue;
      }
      if (a === ' ') {
        e[i - 1] !== ',' && n !== ',' && n !== ',(' && ((n = ''), (t = !1));
        continue;
      }
      ((s += a), (n += a));
    }
  }
  if (!o) throw new I('Unable to normalize signature.');
  return s;
}
const b0 = (e) => {
  const t = typeof e == 'string' ? e : Zt(e);
  return l0(t);
};
function No(e) {
  return d0(b0(e));
}
const rn = No;
let ze = class extends I {
  constructor({ address: t }) {
    super(`Address "${t}" is invalid.`, {
      metaMessages: [
        '- Address must be a hex value of 20 bytes (40 hex characters).',
        '- Address must match its checksum counterpart.',
      ],
      name: 'InvalidAddressError',
    });
  }
};
const En = /* @__PURE__ */ new eo(8192);
function sn(e, t) {
  if (En.has(`${e}.${t}`)) return En.get(`${e}.${t}`);
  const n = e.substring(2).toLowerCase(),
    r = q(He(n), 'bytes'),
    s = n.split('');
  for (let i = 0; i < 40; i += 2)
    (r[i >> 1] >> 4 >= 8 && s[i] && (s[i] = s[i].toUpperCase()),
      (r[i >> 1] & 15) >= 8 && s[i + 1] && (s[i + 1] = s[i + 1].toUpperCase()));
  const o = `0x${s.join('')}`;
  return (En.set(`${e}.${t}`, o), o);
}
function Co(e, t) {
  if (!oe(e, { strict: !1 })) throw new ze({ address: e });
  return sn(e, t);
}
const h0 = /^0x[a-fA-F0-9]{40}$/,
  Pn = /* @__PURE__ */ new eo(8192);
function oe(e, t) {
  const { strict: n = !0 } = t ?? {},
    r = `${e}.${n}`;
  if (Pn.has(r)) return Pn.get(r);
  const s = h0.test(e) ? (e.toLowerCase() === e ? !0 : n ? sn(e) === e : !0) : !1;
  return (Pn.set(r, s), s);
}
function ce(e) {
  return typeof e[0] == 'string' ? mt(e) : p0(e);
}
function p0(e) {
  let t = 0;
  for (const s of e) t += s.length;
  const n = new Uint8Array(t);
  let r = 0;
  for (const s of e) (n.set(s, r), (r += s.length));
  return n;
}
function mt(e) {
  return `0x${e.reduce((t, n) => t + n.replace('0x', ''), '')}`;
}
function bt(e, t, n, { strict: r } = {}) {
  return ge(e, { strict: !1 })
    ? y0(e, t, n, {
        strict: r,
      })
    : Fo(e, t, n, {
        strict: r,
      });
}
function Ro(e, t) {
  if (typeof t == 'number' && t > 0 && t > G(e) - 1)
    throw new to({
      offset: t,
      position: 'start',
      size: G(e),
    });
}
function Oo(e, t, n) {
  if (typeof t == 'number' && typeof n == 'number' && G(e) !== n - t)
    throw new to({
      offset: n,
      position: 'end',
      size: G(e),
    });
}
function Fo(e, t, n, { strict: r } = {}) {
  Ro(e, t);
  const s = e.slice(t, n);
  return (r && Oo(s, t, n), s);
}
function y0(e, t, n, { strict: r } = {}) {
  Ro(e, t);
  const s = `0x${e.replace('0x', '').slice((t ?? 0) * 2, (n ?? e.length) * 2)}`;
  return (r && Oo(s, t, n), s);
}
const m0 = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/,
  zo =
    /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;
function _e(e, t) {
  if (e.length !== t.length)
    throw new Ic({
      expectedLength: e.length,
      givenLength: t.length,
    });
  const n = g0({
      params: e,
      values: t,
    }),
    r = yr(n);
  return r.length === 0 ? '0x' : r;
}
function g0({ params: e, values: t }) {
  const n = [];
  for (let r = 0; r < e.length; r++) n.push(pr({ param: e[r], value: t[r] }));
  return n;
}
function pr({ param: e, value: t }) {
  const n = mr(e.type);
  if (n) {
    const [r, s] = n;
    return x0(t, { length: r, param: { ...e, type: s } });
  }
  if (e.type === 'tuple')
    return B0(t, {
      param: e,
    });
  if (e.type === 'address') return w0(t);
  if (e.type === 'bool') return E0(t);
  if (e.type.startsWith('uint') || e.type.startsWith('int')) {
    const r = e.type.startsWith('int'),
      [, , s = '256'] = zo.exec(e.type) ?? [];
    return P0(t, {
      signed: r,
      size: Number(s),
    });
  }
  if (e.type.startsWith('bytes')) return v0(t, { param: e });
  if (e.type === 'string') return A0(t);
  throw new Rc(e.type, {
    docsPath: '/docs/contract/encodeAbiParameters',
  });
}
function yr(e) {
  let t = 0;
  for (let o = 0; o < e.length; o++) {
    const { dynamic: i, encoded: a } = e[o];
    i ? (t += 32) : (t += G(a));
  }
  const n = [],
    r = [];
  let s = 0;
  for (let o = 0; o < e.length; o++) {
    const { dynamic: i, encoded: a } = e[o];
    i ? (n.push(z(t + s, { size: 32 })), r.push(a), (s += G(a))) : n.push(a);
  }
  return ce([...n, ...r]);
}
function w0(e) {
  if (!oe(e)) throw new ze({ address: e });
  return { dynamic: !1, encoded: De(e.toLowerCase()) };
}
function x0(e, { length: t, param: n }) {
  const r = t === null;
  if (!Array.isArray(e)) throw new Po(e);
  if (!r && e.length !== t)
    throw new Bc({
      expectedLength: t,
      givenLength: e.length,
      type: `${n.type}[${t}]`,
    });
  let s = !1;
  const o = [];
  for (let i = 0; i < e.length; i++) {
    const a = pr({ param: n, value: e[i] });
    (a.dynamic && (s = !0), o.push(a));
  }
  if (r || s) {
    const i = yr(o);
    if (r) {
      const a = z(o.length, { size: 32 });
      return {
        dynamic: !0,
        encoded: o.length > 0 ? ce([a, i]) : a,
      };
    }
    if (s) return { dynamic: !0, encoded: i };
  }
  return {
    dynamic: !1,
    encoded: ce(o.map(({ encoded: i }) => i)),
  };
}
function v0(e, { param: t }) {
  const [, n] = t.type.split('bytes'),
    r = G(e);
  if (!n) {
    let s = e;
    return (
      r % 32 !== 0 &&
        (s = De(s, {
          dir: 'right',
          size: Math.ceil((e.length - 2) / 2 / 32) * 32,
        })),
      {
        dynamic: !0,
        encoded: ce([De(z(r, { size: 32 })), s]),
      }
    );
  }
  if (r !== Number.parseInt(n, 10))
    throw new $c({
      expectedSize: Number.parseInt(n, 10),
      value: e,
    });
  return { dynamic: !1, encoded: De(e, { dir: 'right' }) };
}
function E0(e) {
  if (typeof e != 'boolean')
    throw new I(`Invalid boolean value: "${e}" (type: ${typeof e}). Expected: \`true\` or \`false\`.`);
  return { dynamic: !1, encoded: De(Pa(e)) };
}
function P0(e, { signed: t, size: n = 256 }) {
  if (typeof n == 'number') {
    const r = 2n ** (BigInt(n) - (t ? 1n : 0n)) - 1n,
      s = t ? -r - 1n : 0n;
    if (e > r || e < s)
      throw new Aa({
        max: r.toString(),
        min: s.toString(),
        signed: t,
        size: n / 8,
        value: e.toString(),
      });
  }
  return {
    dynamic: !1,
    encoded: z(e, {
      size: 32,
      signed: t,
    }),
  };
}
function A0(e) {
  const t = Un(e),
    n = Math.ceil(G(t) / 32),
    r = [];
  for (let s = 0; s < n; s++)
    r.push(
      De(bt(t, s * 32, (s + 1) * 32), {
        dir: 'right',
      })
    );
  return {
    dynamic: !0,
    encoded: ce([De(z(G(t), { size: 32 })), ...r]),
  };
}
function B0(e, { param: t }) {
  let n = !1;
  const r = [];
  for (let s = 0; s < t.components.length; s++) {
    const o = t.components[s],
      i = Array.isArray(e) ? s : o.name,
      a = pr({
        param: o,
        value: e[i],
      });
    (r.push(a), a.dynamic && (n = !0));
  }
  return {
    dynamic: n,
    encoded: n ? yr(r) : ce(r.map(({ encoded: s }) => s)),
  };
}
function mr(e) {
  const t = e.match(/^(.*)\[(\d+)?\]$/);
  return t
    ? // Return `null` if the array is dynamic.
      [t[2] ? Number(t[2]) : null, t[1]]
    : void 0;
}
const Tt = (e) => bt(No(e), 0, 4);
function Xe(e) {
  const { abi: t, args: n = [], name: r } = e,
    s = ge(r, { strict: !1 }),
    o = t.filter((a) =>
      s ? (a.type === 'function' ? Tt(a) === r : a.type === 'event' ? rn(a) === r : !1) : 'name' in a && a.name === r
    );
  if (o.length === 0) return;
  if (o.length === 1) return o[0];
  let i;
  for (const a of o) {
    if (!('inputs' in a)) continue;
    if (!n || n.length === 0) {
      if (!a.inputs || a.inputs.length === 0) return a;
      continue;
    }
    if (!a.inputs || a.inputs.length === 0 || a.inputs.length !== n.length) continue;
    if (
      n.every((u, f) => {
        const d = 'inputs' in a && a.inputs[f];
        return d ? Zn(u, d) : !1;
      })
    ) {
      if (i && 'inputs' in i && i.inputs) {
        const u = Lo(a.inputs, i.inputs, n);
        if (u)
          throw new Nc(
            {
              abiItem: a,
              type: u[0],
            },
            {
              abiItem: i,
              type: u[1],
            }
          );
      }
      i = a;
    }
  }
  return i || o[0];
}
function Zn(e, t) {
  const n = typeof e,
    r = t.type;
  switch (r) {
    case 'address':
      return oe(e, { strict: !1 });
    case 'bool':
      return n === 'boolean';
    case 'function':
      return n === 'string';
    case 'string':
      return n === 'string';
    default:
      return r === 'tuple' && 'components' in t
        ? Object.values(t.components).every((s, o) => Zn(Object.values(e)[o], s))
        : /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(
              r
            )
          ? n === 'number' || n === 'bigint'
          : /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/.test(r)
            ? n === 'string' || e instanceof Uint8Array
            : /[a-z]+[1-9]{0,3}(\[[0-9]{0,}\])+$/.test(r)
              ? Array.isArray(e) &&
                e.every((s) =>
                  Zn(s, {
                    ...t,
                    // Pop off `[]` or `[M]` from end of type
                    type: r.replace(/(\[[0-9]{0,}\])$/, ''),
                  })
                )
              : !1;
  }
}
function Lo(e, t, n) {
  for (const r in e) {
    const s = e[r],
      o = t[r];
    if (s.type === 'tuple' && o.type === 'tuple' && 'components' in s && 'components' in o)
      return Lo(s.components, o.components, n[r]);
    const i = [s.type, o.type];
    if (
      i.includes('address') && i.includes('bytes20')
        ? !0
        : i.includes('address') && i.includes('string')
          ? oe(n[r], { strict: !1 })
          : i.includes('address') && i.includes('bytes')
            ? oe(n[r], { strict: !1 })
            : !1
    )
      return i;
  }
}
const Es = '/docs/contract/encodeEventTopics';
function Nt(e) {
  const { abi: t, eventName: n, args: r } = e;
  let s = t[0];
  if (n) {
    const c = Xe({ abi: t, name: n });
    if (!c) throw new ys(n, { docsPath: Es });
    s = c;
  }
  if (s.type !== 'event') throw new ys(void 0, { docsPath: Es });
  const o = ae(s),
    i = rn(o);
  let a = [];
  if (r && 'inputs' in s) {
    const c = s.inputs?.filter((f) => 'indexed' in f && f.indexed),
      u = Array.isArray(r) ? r : Object.values(r).length > 0 ? (c?.map((f) => r[f.name]) ?? []) : [];
    u.length > 0 &&
      (a =
        c?.map((f, d) =>
          Array.isArray(u[d])
            ? u[d].map((l, b) => Ps({ param: f, value: u[d][b] }))
            : typeof u[d] < 'u' && u[d] !== null
              ? Ps({ param: f, value: u[d] })
              : null
        ) ?? []);
  }
  return [i, ...a];
}
function Ps({ param: e, value: t }) {
  if (e.type === 'string' || e.type === 'bytes') return q(yt(t));
  if (e.type === 'tuple' || e.type.match(/^(.*)\[(\d+)?\]$/)) throw new zc(e.type);
  return _e([e], [t]);
}
function on(e, { method: t }) {
  const n = {};
  return (
    e.transport.type === 'fallback' &&
      e.transport.onResponse?.(({ method: r, response: s, status: o, transport: i }) => {
        o === 'success' && t === r && (n[s] = i.request);
      }),
    (r) => n[r] || e.request
  );
}
async function _o(e, t) {
  const { address: n, abi: r, args: s, eventName: o, fromBlock: i, strict: a, toBlock: c } = t,
    u = on(e, {
      method: 'eth_newFilter',
    }),
    f = o
      ? Nt({
          abi: r,
          args: s,
          eventName: o,
        })
      : void 0,
    d = await e.request({
      method: 'eth_newFilter',
      params: [
        {
          address: n,
          fromBlock: typeof i == 'bigint' ? z(i) : i,
          toBlock: typeof c == 'bigint' ? z(c) : c,
          topics: f,
        },
      ],
    });
  return {
    abi: r,
    args: s,
    eventName: o,
    id: d,
    request: u(d),
    strict: !!a,
    type: 'event',
  };
}
function le(e) {
  return typeof e == 'string' ? { address: e, type: 'json-rpc' } : e;
}
const As = '/docs/contract/encodeFunctionData';
function $0(e) {
  const { abi: t, args: n, functionName: r } = e;
  let s = t[0];
  if (r) {
    const o = Xe({
      abi: t,
      args: n,
      name: r,
    });
    if (!o) throw new ft(r, { docsPath: As });
    s = o;
  }
  if (s.type !== 'function') throw new ft(void 0, { docsPath: As });
  return {
    abi: [s],
    functionName: Tt(ae(s)),
  };
}
function be(e) {
  const { args: t } = e,
    { abi: n, functionName: r } = e.abi.length === 1 && e.functionName?.startsWith('0x') ? e : $0(e),
    s = n[0],
    o = r,
    i = 'inputs' in s && s.inputs ? _e(s.inputs, t ?? []) : void 0;
  return mt([o, i ?? '0x']);
}
const I0 = {
    1: 'An `assert` condition failed.',
    17: 'Arithmetic operation resulted in underflow or overflow.',
    18: 'Division or modulo by zero (e.g. `5 / 0` or `23 % 0`).',
    33: 'Attempted to convert to an invalid type.',
    34: 'Attempted to access a storage byte array that is incorrectly encoded.',
    49: 'Performed `.pop()` on an empty array',
    50: 'Array index is out of bounds.',
    65: 'Allocated too much memory or created an array which is too large.',
    81: 'Attempted to call a zero-initialized variable of internal function type.',
  },
  Uo = {
    inputs: [
      {
        name: 'message',
        type: 'string',
      },
    ],
    name: 'Error',
    type: 'error',
  },
  S0 = {
    inputs: [
      {
        name: 'reason',
        type: 'uint256',
      },
    ],
    name: 'Panic',
    type: 'error',
  };
let Bs = class extends I {
    constructor({ offset: t }) {
      super(`Offset \`${t}\` cannot be negative.`, {
        name: 'NegativeOffsetError',
      });
    }
  },
  Mo = class extends I {
    constructor({ length: t, position: n }) {
      super(`Position \`${n}\` is out of bounds (\`0 < position < ${t}\`).`, { name: 'PositionOutOfBoundsError' });
    }
  },
  k0 = class extends I {
    constructor({ count: t, limit: n }) {
      super(`Recursive read limit of \`${n}\` exceeded (recursive read count: \`${t}\`).`, {
        name: 'RecursiveReadLimitExceededError',
      });
    }
  };
const T0 = {
  bytes: new Uint8Array(),
  dataView: new DataView(new ArrayBuffer(0)),
  position: 0,
  positionReadCount: /* @__PURE__ */ new Map(),
  recursiveReadCount: 0,
  recursiveReadLimit: Number.POSITIVE_INFINITY,
  assertReadLimit() {
    if (this.recursiveReadCount >= this.recursiveReadLimit)
      throw new k0({
        count: this.recursiveReadCount + 1,
        limit: this.recursiveReadLimit,
      });
  },
  assertPosition(e) {
    if (e < 0 || e > this.bytes.length - 1)
      throw new Mo({
        length: this.bytes.length,
        position: e,
      });
  },
  decrementPosition(e) {
    if (e < 0) throw new Bs({ offset: e });
    const t = this.position - e;
    (this.assertPosition(t), (this.position = t));
  },
  getReadCount(e) {
    return this.positionReadCount.get(e || this.position) || 0;
  },
  incrementPosition(e) {
    if (e < 0) throw new Bs({ offset: e });
    const t = this.position + e;
    (this.assertPosition(t), (this.position = t));
  },
  inspectByte(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t), this.bytes[t]);
  },
  inspectBytes(e, t) {
    const n = t ?? this.position;
    return (this.assertPosition(n + e - 1), this.bytes.subarray(n, n + e));
  },
  inspectUint8(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t), this.bytes[t]);
  },
  inspectUint16(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t + 1), this.dataView.getUint16(t));
  },
  inspectUint24(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t + 2), (this.dataView.getUint16(t) << 8) + this.dataView.getUint8(t + 2));
  },
  inspectUint32(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t + 3), this.dataView.getUint32(t));
  },
  pushByte(e) {
    (this.assertPosition(this.position), (this.bytes[this.position] = e), this.position++);
  },
  pushBytes(e) {
    (this.assertPosition(this.position + e.length - 1), this.bytes.set(e, this.position), (this.position += e.length));
  },
  pushUint8(e) {
    (this.assertPosition(this.position), (this.bytes[this.position] = e), this.position++);
  },
  pushUint16(e) {
    (this.assertPosition(this.position + 1), this.dataView.setUint16(this.position, e), (this.position += 2));
  },
  pushUint24(e) {
    (this.assertPosition(this.position + 2),
      this.dataView.setUint16(this.position, e >> 8),
      this.dataView.setUint8(this.position + 2, e & 255),
      (this.position += 3));
  },
  pushUint32(e) {
    (this.assertPosition(this.position + 3), this.dataView.setUint32(this.position, e), (this.position += 4));
  },
  readByte() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectByte();
    return (this.position++, e);
  },
  readBytes(e, t) {
    (this.assertReadLimit(), this._touch());
    const n = this.inspectBytes(e);
    return ((this.position += t ?? e), n);
  },
  readUint8() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectUint8();
    return ((this.position += 1), e);
  },
  readUint16() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectUint16();
    return ((this.position += 2), e);
  },
  readUint24() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectUint24();
    return ((this.position += 3), e);
  },
  readUint32() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectUint32();
    return ((this.position += 4), e);
  },
  get remaining() {
    return this.bytes.length - this.position;
  },
  setPosition(e) {
    const t = this.position;
    return (this.assertPosition(e), (this.position = e), () => (this.position = t));
  },
  _touch() {
    if (this.recursiveReadLimit === Number.POSITIVE_INFINITY) return;
    const e = this.getReadCount();
    (this.positionReadCount.set(this.position, e + 1), e > 0 && this.recursiveReadCount++);
  },
};
function gr(e, { recursiveReadLimit: t = 8192 } = {}) {
  const n = Object.create(T0);
  return (
    (n.bytes = e),
    (n.dataView = new DataView(e.buffer, e.byteOffset, e.byteLength)),
    (n.positionReadCount = /* @__PURE__ */ new Map()),
    (n.recursiveReadLimit = t),
    n
  );
}
function N0(e, t = {}) {
  typeof t.size < 'u' && Ke(e, { size: t.size });
  const n = V(e, t);
  return Se(n, t);
}
function C0(e, t = {}) {
  let n = e;
  if ((typeof t.size < 'u' && (Ke(n, { size: t.size }), (n = Xt(n))), n.length > 1 || n[0] > 1)) throw new Ba(n);
  return !!n[0];
}
function Be(e, t = {}) {
  typeof t.size < 'u' && Ke(e, { size: t.size });
  const n = V(e, t);
  return Ie(n, t);
}
function R0(e, t = {}) {
  let n = e;
  return (typeof t.size < 'u' && (Ke(n, { size: t.size }), (n = Xt(n, { dir: 'right' }))), new TextDecoder().decode(n));
}
function Ct(e, t) {
  const n = typeof t == 'string' ? we(t) : t,
    r = gr(n);
  if (G(n) === 0 && e.length > 0) throw new kt();
  if (G(t) && G(t) < 32)
    throw new wo({
      data: typeof t == 'string' ? t : V(t),
      params: e,
      size: G(t),
    });
  let s = 0;
  const o = [];
  for (let i = 0; i < e.length; ++i) {
    const a = e[i];
    r.setPosition(s);
    const [c, u] = at(r, a, {
      staticPosition: 0,
    });
    ((s += u), o.push(c));
  }
  return o;
}
function at(e, t, { staticPosition: n }) {
  const r = mr(t.type);
  if (r) {
    const [s, o] = r;
    return F0(e, { ...t, type: o }, { length: s, staticPosition: n });
  }
  if (t.type === 'tuple') return U0(e, t, { staticPosition: n });
  if (t.type === 'address') return O0(e);
  if (t.type === 'bool') return z0(e);
  if (t.type.startsWith('bytes')) return L0(e, t, { staticPosition: n });
  if (t.type.startsWith('uint') || t.type.startsWith('int')) return _0(e, t);
  if (t.type === 'string') return M0(e, { staticPosition: n });
  throw new Oc(t.type, {
    docsPath: '/docs/contract/decodeAbiParameters',
  });
}
const $s = 32,
  Wn = 32;
function O0(e) {
  const t = e.readBytes(32);
  return [sn(V(Fo(t, -20))), 32];
}
function F0(e, t, { length: n, staticPosition: r }) {
  if (!n) {
    const i = Be(e.readBytes(Wn)),
      a = r + i,
      c = a + $s;
    e.setPosition(a);
    const u = Be(e.readBytes($s)),
      f = Bt(t);
    let d = 0;
    const l = [];
    for (let b = 0; b < u; ++b) {
      e.setPosition(c + (f ? b * 32 : d));
      const [y, h] = at(e, t, {
        staticPosition: c,
      });
      ((d += h), l.push(y));
    }
    return (e.setPosition(r + 32), [l, 32]);
  }
  if (Bt(t)) {
    const i = Be(e.readBytes(Wn)),
      a = r + i,
      c = [];
    for (let u = 0; u < n; ++u) {
      e.setPosition(a + u * 32);
      const [f] = at(e, t, {
        staticPosition: a,
      });
      c.push(f);
    }
    return (e.setPosition(r + 32), [c, 32]);
  }
  let s = 0;
  const o = [];
  for (let i = 0; i < n; ++i) {
    const [a, c] = at(e, t, {
      staticPosition: r + s,
    });
    ((s += c), o.push(a));
  }
  return [o, s];
}
function z0(e) {
  return [C0(e.readBytes(32), { size: 32 }), 32];
}
function L0(e, t, { staticPosition: n }) {
  const [r, s] = t.type.split('bytes');
  if (!s) {
    const i = Be(e.readBytes(32));
    e.setPosition(n + i);
    const a = Be(e.readBytes(32));
    if (a === 0) return (e.setPosition(n + 32), ['0x', 32]);
    const c = e.readBytes(a);
    return (e.setPosition(n + 32), [V(c), 32]);
  }
  return [V(e.readBytes(Number.parseInt(s, 10), 32)), 32];
}
function _0(e, t) {
  const n = t.type.startsWith('int'),
    r = Number.parseInt(t.type.split('int')[1] || '256', 10),
    s = e.readBytes(32);
  return [r > 48 ? N0(s, { signed: n }) : Be(s, { signed: n }), 32];
}
function U0(e, t, { staticPosition: n }) {
  const r = t.components.length === 0 || t.components.some(({ name: i }) => !i),
    s = r ? [] : {};
  let o = 0;
  if (Bt(t)) {
    const i = Be(e.readBytes(Wn)),
      a = n + i;
    for (let c = 0; c < t.components.length; ++c) {
      const u = t.components[c];
      e.setPosition(a + o);
      const [f, d] = at(e, u, {
        staticPosition: a,
      });
      ((o += d), (s[r ? c : u?.name] = f));
    }
    return (e.setPosition(n + 32), [s, 32]);
  }
  for (let i = 0; i < t.components.length; ++i) {
    const a = t.components[i],
      [c, u] = at(e, a, {
        staticPosition: n,
      });
    ((s[r ? i : a?.name] = c), (o += u));
  }
  return [s, o];
}
function M0(e, { staticPosition: t }) {
  const n = Be(e.readBytes(32)),
    r = t + n;
  e.setPosition(r);
  const s = Be(e.readBytes(32));
  if (s === 0) return (e.setPosition(t + 32), ['', 32]);
  const o = e.readBytes(s, 32),
    i = R0(Xt(o));
  return (e.setPosition(t + 32), [i, 32]);
}
function Bt(e) {
  const { type: t } = e;
  if (t === 'string' || t === 'bytes' || t.endsWith('[]')) return !0;
  if (t === 'tuple') return e.components?.some(Bt);
  const n = mr(e.type);
  return !!(n && Bt({ ...e, type: n[1] }));
}
function jo(e) {
  const { abi: t, data: n } = e,
    r = bt(n, 0, 4);
  if (r === '0x') throw new kt();
  const o = [...(t || []), Uo, S0].find((i) => i.type === 'error' && r === Tt(ae(i)));
  if (!o)
    throw new xo(r, {
      docsPath: '/docs/contract/decodeErrorResult',
    });
  return {
    abiItem: o,
    args: 'inputs' in o && o.inputs && o.inputs.length > 0 ? Ct(o.inputs, bt(n, 4)) : void 0,
    errorName: o.name,
  };
}
function Do({ abiItem: e, args: t, includeFunctionName: n = !0, includeName: r = !1 }) {
  if ('name' in e && 'inputs' in e && e.inputs)
    return `${n ? e.name : ''}(${e.inputs.map((s, o) => `${r && s.name ? `${s.name}: ` : ''}${typeof t[o] == 'object' ? se(t[o]) : t[o]}`).join(', ')})`;
}
function Go(e, t = 'wei') {
  return $a(e, Ia[t]);
}
class j0 extends I {
  constructor({ address: t }) {
    super(`State for account "${t}" is set multiple times.`, {
      name: 'AccountStateConflictError',
    });
  }
}
class D0 extends I {
  constructor() {
    super('state and stateDiff are set on the same account.', {
      name: 'StateAssignmentConflictError',
    });
  }
}
function Is(e) {
  return e.reduce(
    (t, { slot: n, value: r }) => `${t}        ${n}: ${r}
`,
    ''
  );
}
function G0(e) {
  return e
    .reduce(
      (t, { address: n, ...r }) => {
        let s = `${t}    ${n}:
`;
        return (
          r.nonce &&
            (s += `      nonce: ${r.nonce}
`),
          r.balance &&
            (s += `      balance: ${r.balance}
`),
          r.code &&
            (s += `      code: ${r.code}
`),
          r.state &&
            ((s += `      state:
`),
            (s += Is(r.state))),
          r.stateDiff &&
            ((s += `      stateDiff:
`),
            (s += Is(r.stateDiff))),
          s
        );
      },
      `  State Override:
`
    )
    .slice(0, -1);
}
function an(e) {
  const t = Object.entries(e)
      .map(([r, s]) => (s === void 0 || s === !1 ? null : [r, s]))
      .filter(Boolean),
    n = t.reduce((r, [s]) => Math.max(r, s.length), 0);
  return t.map(([r, s]) => `  ${`${r}:`.padEnd(n + 1)}  ${s}`).join(`
`);
}
class H0 extends I {
  constructor() {
    super(
      [
        'Cannot specify both a `gasPrice` and a `maxFeePerGas`/`maxPriorityFeePerGas`.',
        'Use `maxFeePerGas`/`maxPriorityFeePerGas` for EIP-1559 compatible networks, and `gasPrice` for others.',
      ].join(`
`),
      { name: 'FeeConflictError' }
    );
  }
}
class q0 extends I {
  constructor({ transaction: t }) {
    super('Cannot infer a transaction type from provided transaction.', {
      metaMessages: [
        'Provided Transaction:',
        '{',
        an(t),
        '}',
        '',
        'To infer the type, either provide:',
        '- a `type` to the Transaction, or',
        '- an EIP-1559 Transaction with `maxFeePerGas`, or',
        '- an EIP-2930 Transaction with `gasPrice` & `accessList`, or',
        '- an EIP-4844 Transaction with `blobs`, `blobVersionedHashes`, `sidecars`, or',
        '- an EIP-7702 Transaction with `authorizationList`, or',
        '- a Legacy Transaction with `gasPrice`',
      ],
      name: 'InvalidSerializableTransactionError',
    });
  }
}
class Ho extends I {
  constructor({ blockHash: t, blockNumber: n, blockTag: r, hash: s, index: o }) {
    let i = 'Transaction';
    (r && o !== void 0 && (i = `Transaction at block time "${r}" at index "${o}"`),
      t && o !== void 0 && (i = `Transaction at block hash "${t}" at index "${o}"`),
      n && o !== void 0 && (i = `Transaction at block number "${n}" at index "${o}"`),
      s && (i = `Transaction with hash "${s}"`),
      super(`${i} could not be found.`, {
        name: 'TransactionNotFoundError',
      }));
  }
}
class qo extends I {
  constructor({ hash: t }) {
    super(
      `Transaction receipt with hash "${t}" could not be found. The Transaction may not be processed on a block yet.`,
      {
        name: 'TransactionReceiptNotFoundError',
      }
    );
  }
}
class V0 extends I {
  constructor({ hash: t }) {
    super(`Timed out while waiting for transaction with hash "${t}" to be confirmed.`, {
      name: 'WaitForTransactionReceiptTimeoutError',
    });
  }
}
class Vo extends I {
  constructor(
    t,
    {
      account: n,
      docsPath: r,
      chain: s,
      data: o,
      gas: i,
      gasPrice: a,
      maxFeePerGas: c,
      maxPriorityFeePerGas: u,
      nonce: f,
      to: d,
      value: l,
      stateOverride: b,
    }
  ) {
    const y = n ? le(n) : void 0;
    let h = an({
      from: y?.address,
      to: d,
      value: typeof l < 'u' && `${Go(l)} ${s?.nativeCurrency?.symbol || 'ETH'}`,
      data: o,
      gas: i,
      gasPrice: typeof a < 'u' && `${Ge(a)} gwei`,
      maxFeePerGas: typeof c < 'u' && `${Ge(c)} gwei`,
      maxPriorityFeePerGas: typeof u < 'u' && `${Ge(u)} gwei`,
      nonce: f,
    });
    (b &&
      (h += `
${G0(b)}`),
      super(t.shortMessage, {
        cause: t,
        docsPath: r,
        metaMessages: [...(t.metaMessages ? [...t.metaMessages, ' '] : []), 'Raw Call Arguments:', h].filter(Boolean),
        name: 'CallExecutionError',
      }),
      Object.defineProperty(this, 'cause', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.cause = t));
  }
}
class Zo extends I {
  constructor(t, { abi: n, args: r, contractAddress: s, docsPath: o, functionName: i, sender: a }) {
    const c = Xe({ abi: n, args: r, name: i }),
      u = c
        ? Do({
            abiItem: c,
            args: r,
            includeFunctionName: !1,
            includeName: !1,
          })
        : void 0,
      f = c ? ae(c, { includeName: !0 }) : void 0,
      d = an({
        address: s && Sa(s),
        function: f,
        args: u && u !== '()' && `${[...Array(i?.length ?? 0).keys()].map(() => ' ').join('')}${u}`,
        sender: a,
      });
    (super(t.shortMessage || `An unknown error occurred while executing the contract function "${i}".`, {
      cause: t,
      docsPath: o,
      metaMessages: [...(t.metaMessages ? [...t.metaMessages, ' '] : []), d && 'Contract Call:', d].filter(Boolean),
      name: 'ContractFunctionExecutionError',
    }),
      Object.defineProperty(this, 'abi', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'args', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'cause', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'contractAddress', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'formattedArgs', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'functionName', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'sender', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.abi = n),
      (this.args = r),
      (this.cause = t),
      (this.contractAddress = s),
      (this.functionName = i),
      (this.sender = a));
  }
}
class Yn extends I {
  constructor({ abi: t, data: n, functionName: r, message: s }) {
    let o, i, a, c;
    if (n && n !== '0x')
      try {
        i = jo({ abi: t, data: n });
        const { abiItem: f, errorName: d, args: l } = i;
        if (d === 'Error') c = l[0];
        else if (d === 'Panic') {
          const [b] = l;
          c = I0[b];
        } else {
          const b = f ? ae(f, { includeName: !0 }) : void 0,
            y =
              f && l
                ? Do({
                    abiItem: f,
                    args: l,
                    includeFunctionName: !1,
                    includeName: !1,
                  })
                : void 0;
          a = [
            b ? `Error: ${b}` : '',
            y && y !== '()' ? `       ${[...Array(d?.length ?? 0).keys()].map(() => ' ').join('')}${y}` : '',
          ];
        }
      } catch (f) {
        o = f;
      }
    else s && (c = s);
    let u;
    (o instanceof xo &&
      ((u = o.signature),
      (a = [
        `Unable to decode signature "${u}" as it was not found on the provided ABI.`,
        'Make sure you are using the correct ABI and that the error exists on it.',
        `You can look up the decoded signature here: https://openchain.xyz/signatures?query=${u}.`,
      ])),
      super(
        (c && c !== 'execution reverted') || u
          ? [`The contract function "${r}" reverted with the following ${u ? 'signature' : 'reason'}:`, c || u].join(`
`)
          : `The contract function "${r}" reverted.`,
        {
          cause: o,
          metaMessages: a,
          name: 'ContractFunctionRevertedError',
        }
      ),
      Object.defineProperty(this, 'data', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'raw', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'reason', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'signature', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.data = i),
      (this.raw = n),
      (this.reason = c),
      (this.signature = u));
  }
}
class Z0 extends I {
  constructor({ functionName: t }) {
    super(`The contract function "${t}" returned no data ("0x").`, {
      metaMessages: [
        'This could be due to any of the following:',
        `  - The contract does not have the function "${t}",`,
        '  - The parameters passed to the contract function may be invalid, or',
        '  - The address is not a contract.',
      ],
      name: 'ContractFunctionZeroDataError',
    });
  }
}
class W0 extends I {
  constructor({ factory: t }) {
    super(`Deployment for counterfactual contract call failed${t ? ` for factory "${t}".` : ''}`, {
      metaMessages: [
        'Please ensure:',
        '- The `factory` is a valid contract deployment factory (ie. Create2 Factory, ERC-4337 Factory, etc).',
        '- The `factoryData` is a valid encoded function call for contract deployment function on the factory.',
      ],
      name: 'CounterfactualDeploymentFailedError',
    });
  }
}
class cn extends I {
  constructor({ data: t, message: n }) {
    (super(n || '', { name: 'RawContractError' }),
      Object.defineProperty(this, 'code', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 3,
      }),
      Object.defineProperty(this, 'data', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.data = t));
  }
}
const Y0 = 3;
function ht(e, { abi: t, address: n, args: r, docsPath: s, functionName: o, sender: i }) {
  const a = e instanceof cn ? e : e instanceof I ? e.walk((y) => 'data' in y) || e.walk() : {},
    { code: c, data: u, details: f, message: d, shortMessage: l } = a,
    b =
      e instanceof kt
        ? new Z0({ functionName: o })
        : [Y0, ka.code].includes(c) && (u || f || d || l)
          ? new Yn({
              abi: t,
              data: typeof u == 'object' ? u.data : u,
              functionName: o,
              message: a instanceof Ta ? f : (l ?? d),
            })
          : e;
  return new Zo(b, {
    abi: t,
    args: r,
    contractAddress: n,
    docsPath: s,
    functionName: o,
    sender: i,
  });
}
function K0(e) {
  const t = q(`0x${e.substring(4)}`).substring(26);
  return sn(`0x${t}`);
}
async function X0({ hash: e, signature: t }) {
  const n = ge(e) ? e : Fe(e),
    { secp256k1: r } = await Promise.resolve().then(() => Bl);
  return `0x${(() => {
    if (typeof t == 'object' && 'r' in t && 's' in t) {
      const { r: u, s: f, v: d, yParity: l } = t,
        b = Number(l ?? d),
        y = Ss(b);
      return new r.Signature(Se(u), Se(f)).addRecoveryBit(y);
    }
    const i = ge(t) ? t : Fe(t);
    if (G(i) !== 65) throw new Error('invalid signature length');
    const a = Ie(`0x${i.slice(130)}`),
      c = Ss(a);
    return r.Signature.fromCompact(i.substring(2, 130)).addRecoveryBit(c);
  })()
    .recoverPublicKey(n.substring(2))
    .toHex(!1)}`;
}
function Ss(e) {
  if (e === 0 || e === 1) return e;
  if (e === 27) return 0;
  if (e === 28) return 1;
  throw new Error('Invalid yParityOrV value');
}
async function Wo({ hash: e, signature: t }) {
  return K0(await X0({ hash: e, signature: t }));
}
function J0(e, t = 'hex') {
  const n = Yo(e),
    r = gr(new Uint8Array(n.length));
  return (n.encode(r), t === 'hex' ? V(r.bytes) : r.bytes);
}
function Yo(e) {
  return Array.isArray(e) ? Q0(e.map((t) => Yo(t))) : eu(e);
}
function Q0(e) {
  const t = e.reduce((s, o) => s + o.length, 0),
    n = Ko(t);
  return {
    length: t <= 55 ? 1 + t : 1 + n + t,
    encode(s) {
      t <= 55
        ? s.pushByte(192 + t)
        : (s.pushByte(247 + n),
          n === 1 ? s.pushUint8(t) : n === 2 ? s.pushUint16(t) : n === 3 ? s.pushUint24(t) : s.pushUint32(t));
      for (const { encode: o } of e) o(s);
    },
  };
}
function eu(e) {
  const t = typeof e == 'string' ? we(e) : e,
    n = Ko(t.length);
  return {
    length: t.length === 1 && t[0] < 128 ? 1 : t.length <= 55 ? 1 + t.length : 1 + n + t.length,
    encode(s) {
      t.length === 1 && t[0] < 128
        ? s.pushBytes(t)
        : t.length <= 55
          ? (s.pushByte(128 + t.length), s.pushBytes(t))
          : (s.pushByte(183 + n),
            n === 1
              ? s.pushUint8(t.length)
              : n === 2
                ? s.pushUint16(t.length)
                : n === 3
                  ? s.pushUint24(t.length)
                  : s.pushUint32(t.length),
            s.pushBytes(t));
    },
  };
}
function Ko(e) {
  if (e < 2 ** 8) return 1;
  if (e < 2 ** 16) return 2;
  if (e < 2 ** 24) return 3;
  if (e < 2 ** 32) return 4;
  throw new I('Length is too large.');
}
function tu(e) {
  const { chainId: t, nonce: n, to: r } = e,
    s = e.contractAddress ?? e.address,
    o = q(mt(['0x05', J0([t ? z(t) : '0x', s, n ? z(n) : '0x'])]));
  return r === 'bytes' ? we(o) : o;
}
async function Xo(e) {
  const { authorization: t, signature: n } = e;
  return Wo({
    hash: tu(t),
    signature: n ?? t,
  });
}
class nu extends I {
  constructor(
    t,
    {
      account: n,
      docsPath: r,
      chain: s,
      data: o,
      gas: i,
      gasPrice: a,
      maxFeePerGas: c,
      maxPriorityFeePerGas: u,
      nonce: f,
      to: d,
      value: l,
    }
  ) {
    const b = an({
      from: n?.address,
      to: d,
      value: typeof l < 'u' && `${Go(l)} ${s?.nativeCurrency?.symbol || 'ETH'}`,
      data: o,
      gas: i,
      gasPrice: typeof a < 'u' && `${Ge(a)} gwei`,
      maxFeePerGas: typeof c < 'u' && `${Ge(c)} gwei`,
      maxPriorityFeePerGas: typeof u < 'u' && `${Ge(u)} gwei`,
      nonce: f,
    });
    (super(t.shortMessage, {
      cause: t,
      docsPath: r,
      metaMessages: [...(t.metaMessages ? [...t.metaMessages, ' '] : []), 'Estimate Gas Arguments:', b].filter(Boolean),
      name: 'EstimateGasExecutionError',
    }),
      Object.defineProperty(this, 'cause', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.cause = t));
  }
}
function wr(e, t) {
  const n = (e.details || '').toLowerCase(),
    r = e instanceof I ? e.walk((s) => s?.code === Dt.code) : e;
  return r instanceof I
    ? new Dt({
        cause: e,
        message: r.details,
      })
    : Dt.nodeMessage.test(n)
      ? new Dt({
          cause: e,
          message: e.details,
        })
      : Mn.nodeMessage.test(n)
        ? new Mn({
            cause: e,
            maxFeePerGas: t?.maxFeePerGas,
          })
        : Yr.nodeMessage.test(n)
          ? new Yr({
              cause: e,
              maxFeePerGas: t?.maxFeePerGas,
            })
          : Kr.nodeMessage.test(n)
            ? new Kr({ cause: e, nonce: t?.nonce })
            : Xr.nodeMessage.test(n)
              ? new Xr({ cause: e, nonce: t?.nonce })
              : Jr.nodeMessage.test(n)
                ? new Jr({ cause: e, nonce: t?.nonce })
                : Qr.nodeMessage.test(n)
                  ? new Qr({ cause: e })
                  : es.nodeMessage.test(n)
                    ? new es({ cause: e, gas: t?.gas })
                    : ts.nodeMessage.test(n)
                      ? new ts({ cause: e, gas: t?.gas })
                      : ns.nodeMessage.test(n)
                        ? new ns({ cause: e })
                        : jn.nodeMessage.test(n)
                          ? new jn({
                              cause: e,
                              maxFeePerGas: t?.maxFeePerGas,
                              maxPriorityFeePerGas: t?.maxPriorityFeePerGas,
                            })
                          : new Jt({
                              cause: e,
                            });
}
function ru(e, { docsPath: t, ...n }) {
  const r = (() => {
    const s = wr(e, n);
    return s instanceof Jt ? e : s;
  })();
  return new nu(r, {
    docsPath: t,
    ...n,
  });
}
function xr(e, { format: t }) {
  if (!t) return {};
  const n = {};
  function r(o) {
    const i = Object.keys(o);
    for (const a of i) (a in e && (n[a] = e[a]), o[a] && typeof o[a] == 'object' && !Array.isArray(o[a]) && r(o[a]));
  }
  const s = t(e || {});
  return (r(s), n);
}
const su = {
  legacy: '0x0',
  eip2930: '0x1',
  eip1559: '0x2',
  eip4844: '0x3',
  eip7702: '0x4',
};
function un(e, t) {
  const n = {};
  return (
    typeof e.authorizationList < 'u' && (n.authorizationList = ou(e.authorizationList)),
    typeof e.accessList < 'u' && (n.accessList = e.accessList),
    typeof e.blobVersionedHashes < 'u' && (n.blobVersionedHashes = e.blobVersionedHashes),
    typeof e.blobs < 'u' &&
      (typeof e.blobs[0] != 'string' ? (n.blobs = e.blobs.map((r) => V(r))) : (n.blobs = e.blobs)),
    typeof e.data < 'u' && (n.data = e.data),
    typeof e.from < 'u' && (n.from = e.from),
    typeof e.gas < 'u' && (n.gas = z(e.gas)),
    typeof e.gasPrice < 'u' && (n.gasPrice = z(e.gasPrice)),
    typeof e.maxFeePerBlobGas < 'u' && (n.maxFeePerBlobGas = z(e.maxFeePerBlobGas)),
    typeof e.maxFeePerGas < 'u' && (n.maxFeePerGas = z(e.maxFeePerGas)),
    typeof e.maxPriorityFeePerGas < 'u' && (n.maxPriorityFeePerGas = z(e.maxPriorityFeePerGas)),
    typeof e.nonce < 'u' && (n.nonce = z(e.nonce)),
    typeof e.to < 'u' && (n.to = e.to),
    typeof e.type < 'u' && (n.type = su[e.type]),
    typeof e.value < 'u' && (n.value = z(e.value)),
    n
  );
}
function ou(e) {
  return e.map((t) => ({
    address: t.address,
    r: t.r ? z(BigInt(t.r)) : t.r,
    s: t.s ? z(BigInt(t.s)) : t.s,
    chainId: z(t.chainId),
    nonce: z(t.nonce),
    ...(typeof t.yParity < 'u' ? { yParity: z(t.yParity) } : {}),
    ...(typeof t.v < 'u' && typeof t.yParity > 'u' ? { v: z(t.v) } : {}),
  }));
}
function ks(e) {
  if (!(!e || e.length === 0))
    return e.reduce((t, { slot: n, value: r }) => {
      if (n.length !== 66)
        throw new rs({
          size: n.length,
          targetSize: 66,
          type: 'hex',
        });
      if (r.length !== 66)
        throw new rs({
          size: r.length,
          targetSize: 66,
          type: 'hex',
        });
      return ((t[n] = r), t);
    }, {});
}
function iu(e) {
  const { balance: t, nonce: n, state: r, stateDiff: s, code: o } = e,
    i = {};
  if (
    (o !== void 0 && (i.code = o),
    t !== void 0 && (i.balance = z(t)),
    n !== void 0 && (i.nonce = z(n)),
    r !== void 0 && (i.state = ks(r)),
    s !== void 0)
  ) {
    if (i.state) throw new D0();
    i.stateDiff = ks(s);
  }
  return i;
}
function vr(e) {
  if (!e) return;
  const t = {};
  for (const { address: n, ...r } of e) {
    if (!oe(n, { strict: !1 })) throw new ze({ address: n });
    if (t[n]) throw new j0({ address: n });
    t[n] = iu(r);
  }
  return t;
}
const au = 2n ** 256n - 1n;
function Rt(e) {
  const { account: t, gasPrice: n, maxFeePerGas: r, maxPriorityFeePerGas: s, to: o } = e,
    i = t ? le(t) : void 0;
  if (i && !oe(i.address)) throw new ze({ address: i.address });
  if (o && !oe(o)) throw new ze({ address: o });
  if (typeof n < 'u' && (typeof r < 'u' || typeof s < 'u')) throw new H0();
  if (r && r > au) throw new Mn({ maxFeePerGas: r });
  if (s && r && s > r) throw new jn({ maxFeePerGas: r, maxPriorityFeePerGas: s });
}
class cu extends I {
  constructor() {
    super('`baseFeeMultiplier` must be greater than 1.', {
      name: 'BaseFeeScalarError',
    });
  }
}
class Er extends I {
  constructor() {
    super('Chain does not support EIP-1559 fees.', {
      name: 'Eip1559FeesNotSupportedError',
    });
  }
}
class uu extends I {
  constructor({ maxPriorityFeePerGas: t }) {
    super(`\`maxFeePerGas\` cannot be less than the \`maxPriorityFeePerGas\` (${Ge(t)} gwei).`, {
      name: 'MaxFeePerGasTooLowError',
    });
  }
}
class Jo extends I {
  constructor({ blockHash: t, blockNumber: n }) {
    let r = 'Block';
    (t && (r = `Block at hash "${t}"`),
      n && (r = `Block at number "${n}"`),
      super(`${r} could not be found.`, { name: 'BlockNotFoundError' }));
  }
}
const Qo = {
  '0x0': 'legacy',
  '0x1': 'eip2930',
  '0x2': 'eip1559',
  '0x3': 'eip4844',
  '0x4': 'eip7702',
};
function ei(e, t) {
  const n = {
    ...e,
    blockHash: e.blockHash ? e.blockHash : null,
    blockNumber: e.blockNumber ? BigInt(e.blockNumber) : null,
    chainId: e.chainId ? Ie(e.chainId) : void 0,
    gas: e.gas ? BigInt(e.gas) : void 0,
    gasPrice: e.gasPrice ? BigInt(e.gasPrice) : void 0,
    maxFeePerBlobGas: e.maxFeePerBlobGas ? BigInt(e.maxFeePerBlobGas) : void 0,
    maxFeePerGas: e.maxFeePerGas ? BigInt(e.maxFeePerGas) : void 0,
    maxPriorityFeePerGas: e.maxPriorityFeePerGas ? BigInt(e.maxPriorityFeePerGas) : void 0,
    nonce: e.nonce ? Ie(e.nonce) : void 0,
    to: e.to ? e.to : null,
    transactionIndex: e.transactionIndex ? Number(e.transactionIndex) : null,
    type: e.type ? Qo[e.type] : void 0,
    typeHex: e.type ? e.type : void 0,
    value: e.value ? BigInt(e.value) : void 0,
    v: e.v ? BigInt(e.v) : void 0,
  };
  return (
    e.authorizationList && (n.authorizationList = fu(e.authorizationList)),
    (n.yParity = (() => {
      if (e.yParity) return Number(e.yParity);
      if (typeof n.v == 'bigint') {
        if (n.v === 0n || n.v === 27n) return 0;
        if (n.v === 1n || n.v === 28n) return 1;
        if (n.v >= 35n) return n.v % 2n === 0n ? 1 : 0;
      }
    })()),
    n.type === 'legacy' &&
      (delete n.accessList,
      delete n.maxFeePerBlobGas,
      delete n.maxFeePerGas,
      delete n.maxPriorityFeePerGas,
      delete n.yParity),
    n.type === 'eip2930' && (delete n.maxFeePerBlobGas, delete n.maxFeePerGas, delete n.maxPriorityFeePerGas),
    n.type === 'eip1559' && delete n.maxFeePerBlobGas,
    n
  );
}
function fu(e) {
  return e.map((t) => ({
    address: t.address,
    chainId: Number(t.chainId),
    nonce: Number(t.nonce),
    r: t.r,
    s: t.s,
    yParity: Number(t.yParity),
  }));
}
function ti(e, t) {
  const n = (e.transactions ?? []).map((r) => (typeof r == 'string' ? r : ei(r)));
  return {
    ...e,
    baseFeePerGas: e.baseFeePerGas ? BigInt(e.baseFeePerGas) : null,
    blobGasUsed: e.blobGasUsed ? BigInt(e.blobGasUsed) : void 0,
    difficulty: e.difficulty ? BigInt(e.difficulty) : void 0,
    excessBlobGas: e.excessBlobGas ? BigInt(e.excessBlobGas) : void 0,
    gasLimit: e.gasLimit ? BigInt(e.gasLimit) : void 0,
    gasUsed: e.gasUsed ? BigInt(e.gasUsed) : void 0,
    hash: e.hash ? e.hash : null,
    logsBloom: e.logsBloom ? e.logsBloom : null,
    nonce: e.nonce ? e.nonce : null,
    number: e.number ? BigInt(e.number) : null,
    size: e.size ? BigInt(e.size) : void 0,
    timestamp: e.timestamp ? BigInt(e.timestamp) : void 0,
    transactions: n,
    totalDifficulty: e.totalDifficulty ? BigInt(e.totalDifficulty) : null,
  };
}
async function ye(
  e,
  { blockHash: t, blockNumber: n, blockTag: r = e.experimental_blockTag ?? 'latest', includeTransactions: s } = {}
) {
  const o = s ?? !1,
    i = n !== void 0 ? z(n) : void 0;
  let a = null;
  if (
    (t
      ? (a = await e.request(
          {
            method: 'eth_getBlockByHash',
            params: [t, o],
          },
          { dedupe: !0 }
        ))
      : (a = await e.request(
          {
            method: 'eth_getBlockByNumber',
            params: [i || r, o],
          },
          { dedupe: !!i }
        )),
    !a)
  )
    throw new Jo({ blockHash: t, blockNumber: n });
  return (e.chain?.formatters?.block?.format || ti)(a, 'getBlock');
}
async function Pr(e) {
  const t = await e.request({
    method: 'eth_gasPrice',
  });
  return BigInt(t);
}
async function du(e, t) {
  return ni(e, t);
}
async function ni(e, t) {
  const { block: n, chain: r = e.chain, request: s } = t || {};
  try {
    const o = r?.fees?.maxPriorityFeePerGas ?? r?.fees?.defaultPriorityFee;
    if (typeof o == 'function') {
      const a = n || (await L(e, ye, 'getBlock')({})),
        c = await o({
          block: a,
          client: e,
          request: s,
        });
      if (c === null) throw new Error();
      return c;
    }
    if (typeof o < 'u') return o;
    const i = await e.request({
      method: 'eth_maxPriorityFeePerGas',
    });
    return Se(i);
  } catch {
    const [o, i] = await Promise.all([n ? Promise.resolve(n) : L(e, ye, 'getBlock')({}), L(e, Pr, 'getGasPrice')({})]);
    if (typeof o.baseFeePerGas != 'bigint') throw new Er();
    const a = i - o.baseFeePerGas;
    return a < 0n ? 0n : a;
  }
}
async function lu(e, t) {
  return Kn(e, t);
}
async function Kn(e, t) {
  const { block: n, chain: r = e.chain, request: s, type: o = 'eip1559' } = t || {},
    i = await (async () =>
      typeof r?.fees?.baseFeeMultiplier == 'function'
        ? r.fees.baseFeeMultiplier({
            block: n,
            client: e,
            request: s,
          })
        : (r?.fees?.baseFeeMultiplier ?? 1.2))();
  if (i < 1) throw new cu();
  const c = 10 ** (i.toString().split('.')[1]?.length ?? 0),
    u = (l) => (l * BigInt(Math.ceil(i * c))) / BigInt(c),
    f = n || (await L(e, ye, 'getBlock')({}));
  if (typeof r?.fees?.estimateFeesPerGas == 'function') {
    const l = await r.fees.estimateFeesPerGas({
      block: n,
      client: e,
      multiply: u,
      request: s,
      type: o,
    });
    if (l !== null) return l;
  }
  if (o === 'eip1559') {
    if (typeof f.baseFeePerGas != 'bigint') throw new Er();
    const l =
        typeof s?.maxPriorityFeePerGas == 'bigint'
          ? s.maxPriorityFeePerGas
          : await ni(e, {
              block: f,
              chain: r,
              request: s,
            }),
      b = u(f.baseFeePerGas);
    return {
      maxFeePerGas: s?.maxFeePerGas ?? b + l,
      maxPriorityFeePerGas: l,
    };
  }
  return {
    gasPrice: s?.gasPrice ?? u(await L(e, Pr, 'getGasPrice')({})),
  };
}
async function ri(e, { address: t, blockTag: n = 'latest', blockNumber: r }) {
  const s = await e.request(
    {
      method: 'eth_getTransactionCount',
      params: [t, typeof r == 'bigint' ? z(r) : n],
    },
    {
      dedupe: !!r,
    }
  );
  return Ie(s);
}
function si(e) {
  const { kzg: t } = e,
    n = e.to ?? (typeof e.blobs[0] == 'string' ? 'hex' : 'bytes'),
    r = typeof e.blobs[0] == 'string' ? e.blobs.map((o) => we(o)) : e.blobs,
    s = [];
  for (const o of r) s.push(Uint8Array.from(t.blobToKzgCommitment(o)));
  return n === 'bytes' ? s : s.map((o) => V(o));
}
function oi(e) {
  const { kzg: t } = e,
    n = e.to ?? (typeof e.blobs[0] == 'string' ? 'hex' : 'bytes'),
    r = typeof e.blobs[0] == 'string' ? e.blobs.map((i) => we(i)) : e.blobs,
    s = typeof e.commitments[0] == 'string' ? e.commitments.map((i) => we(i)) : e.commitments,
    o = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i],
      c = s[i];
    o.push(Uint8Array.from(t.computeBlobKzgProof(a, c)));
  }
  return n === 'bytes' ? o : o.map((i) => V(i));
}
function bu(e, t, n, r) {
  if (typeof e.setBigUint64 == 'function') return e.setBigUint64(t, n, r);
  const s = BigInt(32),
    o = BigInt(4294967295),
    i = Number((n >> s) & o),
    a = Number(n & o),
    c = r ? 4 : 0,
    u = r ? 0 : 4;
  (e.setUint32(t + c, i, r), e.setUint32(t + u, a, r));
}
function hu(e, t, n) {
  return (e & t) ^ (~e & n);
}
function pu(e, t, n) {
  return (e & t) ^ (e & n) ^ (t & n);
}
class yu extends br {
  constructor(t, n, r, s) {
    (super(),
      (this.finished = !1),
      (this.length = 0),
      (this.pos = 0),
      (this.destroyed = !1),
      (this.blockLen = t),
      (this.outputLen = n),
      (this.padOffset = r),
      (this.isLE = s),
      (this.buffer = new Uint8Array(t)),
      (this.view = vn(this.buffer)));
  }
  update(t) {
    (dt(this), (t = nn(t)), Ve(t));
    const { view: n, buffer: r, blockLen: s } = this,
      o = t.length;
    for (let i = 0; i < o; ) {
      const a = Math.min(s - this.pos, o - i);
      if (a === s) {
        const c = vn(t);
        for (; s <= o - i; i += s) this.process(c, i);
        continue;
      }
      (r.set(t.subarray(i, i + a), this.pos),
        (this.pos += a),
        (i += a),
        this.pos === s && (this.process(n, 0), (this.pos = 0)));
    }
    return ((this.length += t.length), this.roundClean(), this);
  }
  digestInto(t) {
    (dt(this), Ao(t, this), (this.finished = !0));
    const { buffer: n, view: r, blockLen: s, isLE: o } = this;
    let { pos: i } = this;
    ((n[i++] = 128), lt(this.buffer.subarray(i)), this.padOffset > s - i && (this.process(r, 0), (i = 0)));
    for (let d = i; d < s; d++) n[d] = 0;
    (bu(r, s - 8, BigInt(this.length * 8), o), this.process(r, 0));
    const a = vn(t),
      c = this.outputLen;
    if (c % 4) throw new Error('_sha2: outputLen should be aligned to 32bit');
    const u = c / 4,
      f = this.get();
    if (u > f.length) throw new Error('_sha2: outputLen bigger than state');
    for (let d = 0; d < u; d++) a.setUint32(4 * d, f[d], o);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return (this.destroy(), r);
  }
  _cloneInto(t) {
    (t || (t = new this.constructor()), t.set(...this.get()));
    const { blockLen: n, buffer: r, length: s, finished: o, destroyed: i, pos: a } = this;
    return ((t.destroyed = i), (t.finished = o), (t.length = s), (t.pos = a), s % n && t.buffer.set(r), t);
  }
  clone() {
    return this._cloneInto();
  }
}
const Re = /* @__PURE__ */ Uint32Array.from([
    1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225,
  ]),
  mu = /* @__PURE__ */ Uint32Array.from([
    1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080,
    310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078,
    604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671,
    3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051,
    2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909,
    275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222,
    2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298,
  ]),
  Oe = /* @__PURE__ */ new Uint32Array(64);
class gu extends yu {
  constructor(t = 32) {
    (super(64, t, 8, !1),
      (this.A = Re[0] | 0),
      (this.B = Re[1] | 0),
      (this.C = Re[2] | 0),
      (this.D = Re[3] | 0),
      (this.E = Re[4] | 0),
      (this.F = Re[5] | 0),
      (this.G = Re[6] | 0),
      (this.H = Re[7] | 0));
  }
  get() {
    const { A: t, B: n, C: r, D: s, E: o, F: i, G: a, H: c } = this;
    return [t, n, r, s, o, i, a, c];
  }
  // prettier-ignore
  set(t, n, r, s, o, i, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = s | 0, this.E = o | 0, this.F = i | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let d = 0; d < 16; d++, n += 4) Oe[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const l = Oe[d - 15],
        b = Oe[d - 2],
        y = he(l, 7) ^ he(l, 18) ^ (l >>> 3),
        h = he(b, 17) ^ he(b, 19) ^ (b >>> 10);
      Oe[d] = (h + Oe[d - 7] + y + Oe[d - 16]) | 0;
    }
    let { A: r, B: s, C: o, D: i, E: a, F: c, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const l = he(a, 6) ^ he(a, 11) ^ he(a, 25),
        b = (f + l + hu(a, c, u) + mu[d] + Oe[d]) | 0,
        h = ((he(r, 2) ^ he(r, 13) ^ he(r, 22)) + pu(r, s, o)) | 0;
      ((f = u), (u = c), (c = a), (a = (i + b) | 0), (i = o), (o = s), (s = r), (r = (b + h) | 0));
    }
    ((r = (r + this.A) | 0),
      (s = (s + this.B) | 0),
      (o = (o + this.C) | 0),
      (i = (i + this.D) | 0),
      (a = (a + this.E) | 0),
      (c = (c + this.F) | 0),
      (u = (u + this.G) | 0),
      (f = (f + this.H) | 0),
      this.set(r, s, o, i, a, c, u, f));
  }
  roundClean() {
    lt(Oe);
  }
  destroy() {
    (this.set(0, 0, 0, 0, 0, 0, 0, 0), lt(this.buffer));
  }
}
const ii = /* @__PURE__ */ Bo(() => new gu()),
  wu = ii;
function xu(e, t) {
  return wu(ge(e, { strict: !1 }) ? yt(e) : e);
}
function vu(e) {
  const { commitment: t, version: n = 1 } = e,
    r = e.to ?? (typeof t == 'string' ? 'hex' : 'bytes'),
    s = xu(t);
  return (s.set([n], 0), r === 'bytes' ? s : V(s));
}
function Eu(e) {
  const { commitments: t, version: n } = e,
    r = e.to,
    s = [];
  for (const o of t)
    s.push(
      vu({
        commitment: o,
        to: r,
        version: n,
      })
    );
  return s;
}
const Ts = 6,
  ai = 32,
  Ar = 4096,
  ci = ai * Ar,
  Ns =
    ci * Ts - // terminator byte (0x80).
    1 - // zero byte (0x00) appended to each field element.
    1 * Ar * Ts;
class Pu extends I {
  constructor({ maxSize: t, size: n }) {
    super('Blob size is too large.', {
      metaMessages: [`Max: ${t} bytes`, `Given: ${n} bytes`],
      name: 'BlobSizeTooLargeError',
    });
  }
}
class Au extends I {
  constructor() {
    super('Blob data must not be empty.', { name: 'EmptyBlobError' });
  }
}
function Bu(e) {
  const t = typeof e.data == 'string' ? we(e.data) : e.data,
    n = G(t);
  if (!n) throw new Au();
  if (n > Ns)
    throw new Pu({
      maxSize: Ns,
      size: n,
    });
  const r = [];
  let s = !0,
    o = 0;
  for (; s; ) {
    const i = gr(new Uint8Array(ci));
    let a = 0;
    for (; a < Ar; ) {
      const c = t.slice(o, o + (ai - 1));
      if ((i.pushByte(0), i.pushBytes(c), c.length < 31)) {
        (i.pushByte(128), (s = !1));
        break;
      }
      (a++, (o += 31));
    }
    r.push(i);
  }
  return r.map((i) => V(i.bytes));
}
function $u(e) {
  const { data: t, kzg: n, to: r } = e,
    s = e.blobs ?? Bu({ data: t }),
    o = e.commitments ?? si({ blobs: s, kzg: n, to: r }),
    i = e.proofs ?? oi({ blobs: s, commitments: o, kzg: n, to: r }),
    a = [];
  for (let c = 0; c < s.length; c++)
    a.push({
      blob: s[c],
      commitment: o[c],
      proof: i[c],
    });
  return a;
}
function Iu(e) {
  if (e.type) return e.type;
  if (typeof e.authorizationList < 'u') return 'eip7702';
  if (
    typeof e.blobs < 'u' ||
    typeof e.blobVersionedHashes < 'u' ||
    typeof e.maxFeePerBlobGas < 'u' ||
    typeof e.sidecars < 'u'
  )
    return 'eip4844';
  if (typeof e.maxFeePerGas < 'u' || typeof e.maxPriorityFeePerGas < 'u') return 'eip1559';
  if (typeof e.gasPrice < 'u') return typeof e.accessList < 'u' ? 'eip2930' : 'legacy';
  throw new q0({ transaction: e });
}
async function ui(e) {
  const t = await e.request(
    {
      method: 'eth_chainId',
    },
    { dedupe: !0 }
  );
  return Ie(t);
}
const Su = ['blobVersionedHashes', 'chainId', 'fees', 'gas', 'nonce', 'type'],
  Cs = /* @__PURE__ */ new Map();
async function fi(e, t) {
  const {
      account: n = e.account,
      blobs: r,
      chain: s,
      gas: o,
      kzg: i,
      nonce: a,
      nonceManager: c,
      parameters: u = Su,
      type: f,
    } = t,
    d = n && le(n),
    l = { ...t, ...(d ? { from: d?.address } : {}) };
  let b;
  async function y() {
    return b || ((b = await L(e, ye, 'getBlock')({ blockTag: 'latest' })), b);
  }
  let h;
  async function w() {
    return h || (s ? s.id : typeof t.chainId < 'u' ? t.chainId : ((h = await L(e, ui, 'getChainId')({})), h));
  }
  if (u.includes('nonce') && typeof a > 'u' && d)
    if (c) {
      const m = await w();
      l.nonce = await c.consume({
        address: d.address,
        chainId: m,
        client: e,
      });
    } else
      l.nonce = await L(
        e,
        ri,
        'getTransactionCount'
      )({
        address: d.address,
        blockTag: 'pending',
      });
  if ((u.includes('blobVersionedHashes') || u.includes('sidecars')) && r && i) {
    const m = si({ blobs: r, kzg: i });
    if (u.includes('blobVersionedHashes')) {
      const A = Eu({
        commitments: m,
        to: 'hex',
      });
      l.blobVersionedHashes = A;
    }
    if (u.includes('sidecars')) {
      const A = oi({ blobs: r, commitments: m, kzg: i }),
        x = $u({
          blobs: r,
          commitments: m,
          proofs: A,
          to: 'hex',
        });
      l.sidecars = x;
    }
  }
  if ((u.includes('chainId') && (l.chainId = await w()), (u.includes('fees') || u.includes('type')) && typeof f > 'u'))
    try {
      l.type = Iu(l);
    } catch {
      let m = Cs.get(e.uid);
      (typeof m > 'u' && ((m = typeof (await y())?.baseFeePerGas == 'bigint'), Cs.set(e.uid, m)),
        (l.type = m ? 'eip1559' : 'legacy'));
    }
  if (u.includes('fees'))
    if (l.type !== 'legacy' && l.type !== 'eip2930') {
      if (typeof l.maxFeePerGas > 'u' || typeof l.maxPriorityFeePerGas > 'u') {
        const m = await y(),
          { maxFeePerGas: A, maxPriorityFeePerGas: x } = await Kn(e, {
            block: m,
            chain: s,
            request: l,
          });
        if (typeof t.maxPriorityFeePerGas > 'u' && t.maxFeePerGas && t.maxFeePerGas < x)
          throw new uu({
            maxPriorityFeePerGas: x,
          });
        ((l.maxPriorityFeePerGas = x), (l.maxFeePerGas = A));
      }
    } else {
      if (typeof t.maxFeePerGas < 'u' || typeof t.maxPriorityFeePerGas < 'u') throw new Er();
      if (typeof t.gasPrice > 'u') {
        const m = await y(),
          { gasPrice: A } = await Kn(e, {
            block: m,
            chain: s,
            request: l,
            type: 'legacy',
          });
        l.gasPrice = A;
      }
    }
  return (
    u.includes('gas') &&
      typeof o > 'u' &&
      (l.gas = await L(
        e,
        Br,
        'estimateGas'
      )({
        ...l,
        account: d && { address: d.address, type: 'json-rpc' },
      })),
    Rt(l),
    delete l.parameters,
    l
  );
}
async function Br(e, t) {
  const { account: n = e.account } = t,
    r = n ? le(n) : void 0;
  try {
    const {
        accessList: s,
        authorizationList: o,
        blobs: i,
        blobVersionedHashes: a,
        blockNumber: c,
        blockTag: u,
        data: f,
        gas: d,
        gasPrice: l,
        maxFeePerBlobGas: b,
        maxFeePerGas: y,
        maxPriorityFeePerGas: h,
        nonce: w,
        value: m,
        stateOverride: A,
        ...x
      } = await fi(e, {
        ...t,
        parameters:
          // Some RPC Providers do not compute versioned hashes from blobs. We will need
          // to compute them.
          r?.type === 'local' ? void 0 : ['blobVersionedHashes'],
      }),
      g = (typeof c == 'bigint' ? z(c) : void 0) || u,
      E = vr(A),
      v = await (async () => {
        if (x.to) return x.to;
        if (o && o.length > 0)
          return await Xo({
            authorization: o[0],
          }).catch(() => {
            throw new I('`to` is required. Could not infer from `authorizationList`');
          });
      })();
    Rt(t);
    const S = e.chain?.formatters?.transactionRequest?.format,
      T = (S || un)(
        {
          // Pick out extra data that might exist on the chain's transaction request type.
          ...xr(x, { format: S }),
          from: r?.address,
          accessList: s,
          authorizationList: o,
          blobs: i,
          blobVersionedHashes: a,
          data: f,
          gas: d,
          gasPrice: l,
          maxFeePerBlobGas: b,
          maxFeePerGas: y,
          maxPriorityFeePerGas: h,
          nonce: w,
          to: v,
          value: m,
        },
        'estimateGas'
      );
    return BigInt(
      await e.request({
        method: 'eth_estimateGas',
        params: E ? [T, g ?? e.experimental_blockTag ?? 'latest', E] : g ? [T, g] : [T],
      })
    );
  } catch (s) {
    throw ru(s, {
      ...t,
      account: r,
      chain: e.chain,
    });
  }
}
async function ku(e, t) {
  const { abi: n, address: r, args: s, functionName: o, dataSuffix: i, ...a } = t,
    c = be({
      abi: n,
      args: s,
      functionName: o,
    });
  try {
    return await L(
      e,
      Br,
      'estimateGas'
    )({
      data: `${c}${i ? i.replace('0x', '') : ''}`,
      to: r,
      ...a,
    });
  } catch (u) {
    const f = a.account ? le(a.account) : void 0;
    throw ht(u, {
      abi: n,
      address: r,
      args: s,
      docsPath: '/docs/contract/estimateContractGas',
      functionName: o,
      sender: f?.address,
    });
  }
}
function Ot(e, t) {
  if (!oe(e, { strict: !1 })) throw new ze({ address: e });
  if (!oe(t, { strict: !1 })) throw new ze({ address: t });
  return e.toLowerCase() === t.toLowerCase();
}
const Rs = '/docs/contract/decodeEventLog';
function $r(e) {
  const { abi: t, data: n, strict: r, topics: s } = e,
    o = r ?? !0,
    [i, ...a] = s;
  if (!i) throw new kc({ docsPath: Rs });
  const c = t.find((h) => h.type === 'event' && i === rn(ae(h)));
  if (!(c && 'name' in c) || c.type !== 'event') throw new vo(i, { docsPath: Rs });
  const { name: u, inputs: f } = c,
    d = f?.some((h) => !('name' in h && h.name)),
    l = d ? [] : {},
    b = f.map((h, w) => [h, w]).filter(([h]) => 'indexed' in h && h.indexed);
  for (let h = 0; h < b.length; h++) {
    const [w, m] = b[h],
      A = a[h];
    if (!A)
      throw new tn({
        abiItem: c,
        param: w,
      });
    l[d ? m : w.name || m] = Tu({
      param: w,
      value: A,
    });
  }
  const y = f.filter((h) => !('indexed' in h && h.indexed));
  if (y.length > 0) {
    if (n && n !== '0x')
      try {
        const h = Ct(y, n);
        if (h)
          if (d) for (let w = 0; w < f.length; w++) l[w] = l[w] ?? h.shift();
          else for (let w = 0; w < y.length; w++) l[y[w].name] = h[w];
      } catch (h) {
        if (o)
          throw h instanceof wo || h instanceof Mo
            ? new Pt({
                abiItem: c,
                data: n,
                params: y,
                size: G(n),
              })
            : h;
      }
    else if (o)
      throw new Pt({
        abiItem: c,
        data: '0x',
        params: y,
        size: 0,
      });
  }
  return {
    eventName: u,
    args: Object.values(l).length > 0 ? l : void 0,
  };
}
function Tu({ param: e, value: t }) {
  return e.type === 'string' || e.type === 'bytes' || e.type === 'tuple' || e.type.match(/^(.*)\[(\d+)?\]$/)
    ? t
    : (Ct([e], t) || [])[0];
}
function Ir(e) {
  const { abi: t, args: n, logs: r, strict: s = !0 } = e,
    o = (() => {
      if (e.eventName) return Array.isArray(e.eventName) ? e.eventName : [e.eventName];
    })();
  return r
    .map((i) => {
      try {
        const a = t.find((u) => u.type === 'event' && i.topics[0] === rn(u));
        if (!a) return null;
        const c = $r({
          ...i,
          abi: [a],
          strict: s,
        });
        return (o && !o.includes(c.eventName)) ||
          !Nu({
            args: c.args,
            inputs: a.inputs,
            matchArgs: n,
          })
          ? null
          : { ...c, ...i };
      } catch (a) {
        let c, u;
        if (a instanceof vo) return null;
        if (a instanceof Pt || a instanceof tn) {
          if (s) return null;
          ((c = a.abiItem.name), (u = a.abiItem.inputs?.some((f) => !('name' in f && f.name))));
        }
        return { ...i, args: u ? [] : {}, eventName: c };
      }
    })
    .filter(Boolean);
}
function Nu(e) {
  const { args: t, inputs: n, matchArgs: r } = e;
  if (!r) return !0;
  if (!t) return !1;
  function s(o, i, a) {
    try {
      return o.type === 'address' ? Ot(i, a) : o.type === 'string' || o.type === 'bytes' ? q(yt(i)) === a : i === a;
    } catch {
      return !1;
    }
  }
  return Array.isArray(t) && Array.isArray(r)
    ? r.every((o, i) => {
        if (o == null) return !0;
        const a = n[i];
        return a ? (Array.isArray(o) ? o : [o]).some((u) => s(a, u, t[i])) : !1;
      })
    : typeof t == 'object' && !Array.isArray(t) && typeof r == 'object' && !Array.isArray(r)
      ? Object.entries(r).every(([o, i]) => {
          if (i == null) return !0;
          const a = n.find((u) => u.name === o);
          return a ? (Array.isArray(i) ? i : [i]).some((u) => s(a, u, t[o])) : !1;
        })
      : !1;
}
function Te(e, { args: t, eventName: n } = {}) {
  return {
    ...e,
    blockHash: e.blockHash ? e.blockHash : null,
    blockNumber: e.blockNumber ? BigInt(e.blockNumber) : null,
    logIndex: e.logIndex ? Number(e.logIndex) : null,
    transactionHash: e.transactionHash ? e.transactionHash : null,
    transactionIndex: e.transactionIndex ? Number(e.transactionIndex) : null,
    ...(n ? { args: t, eventName: n } : {}),
  };
}
async function Sr(
  e,
  { address: t, blockHash: n, fromBlock: r, toBlock: s, event: o, events: i, args: a, strict: c } = {}
) {
  const u = c ?? !1,
    f = i ?? (o ? [o] : void 0);
  let d = [];
  f &&
    ((d = [
      f.flatMap((h) =>
        Nt({
          abi: [h],
          eventName: h.name,
          args: i ? void 0 : a,
        })
      ),
    ]),
    o && (d = d[0]));
  let l;
  n
    ? (l = await e.request({
        method: 'eth_getLogs',
        params: [{ address: t, topics: d, blockHash: n }],
      }))
    : (l = await e.request({
        method: 'eth_getLogs',
        params: [
          {
            address: t,
            topics: d,
            fromBlock: typeof r == 'bigint' ? z(r) : r,
            toBlock: typeof s == 'bigint' ? z(s) : s,
          },
        ],
      }));
  const b = l.map((y) => Te(y));
  return f
    ? Ir({
        abi: f,
        args: a,
        logs: b,
        strict: u,
      })
    : b;
}
async function di(e, t) {
  const { abi: n, address: r, args: s, blockHash: o, eventName: i, fromBlock: a, toBlock: c, strict: u } = t,
    f = i ? Xe({ abi: n, name: i }) : void 0,
    d = f ? void 0 : n.filter((l) => l.type === 'event');
  return L(
    e,
    Sr,
    'getLogs'
  )({
    address: r,
    args: s,
    blockHash: o,
    event: f,
    events: d,
    fromBlock: a,
    toBlock: c,
    strict: u,
  });
}
const An = '/docs/contract/decodeFunctionResult';
function Je(e) {
  const { abi: t, args: n, functionName: r, data: s } = e;
  let o = t[0];
  if (r) {
    const a = Xe({ abi: t, args: n, name: r });
    if (!a) throw new ft(r, { docsPath: An });
    o = a;
  }
  if (o.type !== 'function') throw new ft(void 0, { docsPath: An });
  if (!o.outputs) throw new Eo(o.name, { docsPath: An });
  const i = Ct(o.outputs, s);
  if (i && i.length > 1) return i;
  if (i && i.length === 1) return i[0];
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const kr = /* @__PURE__ */ BigInt(0),
  Xn = /* @__PURE__ */ BigInt(1);
function Ft(e) {
  return e instanceof Uint8Array || (ArrayBuffer.isView(e) && e.constructor.name === 'Uint8Array');
}
function Tr(e) {
  if (!Ft(e)) throw new Error('Uint8Array expected');
}
function $t(e, t) {
  if (typeof t != 'boolean') throw new Error(e + ' boolean expected, got ' + t);
}
function Ht(e) {
  const t = e.toString(16);
  return t.length & 1 ? '0' + t : t;
}
function li(e) {
  if (typeof e != 'string') throw new Error('hex string expected, got ' + typeof e);
  return e === '' ? kr : BigInt('0x' + e);
}
const bi =
    // @ts-ignore
    typeof Uint8Array.from([]).toHex == 'function' && typeof Uint8Array.fromHex == 'function',
  Cu = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, '0'));
function It(e) {
  if ((Tr(e), bi)) return e.toHex();
  let t = '';
  for (let n = 0; n < e.length; n++) t += Cu[e[n]];
  return t;
}
const ve = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Os(e) {
  if (e >= ve._0 && e <= ve._9) return e - ve._0;
  if (e >= ve.A && e <= ve.F) return e - (ve.A - 10);
  if (e >= ve.a && e <= ve.f) return e - (ve.a - 10);
}
function Wt(e) {
  if (typeof e != 'string') throw new Error('hex string expected, got ' + typeof e);
  if (bi) return Uint8Array.fromHex(e);
  const t = e.length,
    n = t / 2;
  if (t % 2) throw new Error('hex string expected, got unpadded hex of length ' + t);
  const r = new Uint8Array(n);
  for (let s = 0, o = 0; s < n; s++, o += 2) {
    const i = Os(e.charCodeAt(o)),
      a = Os(e.charCodeAt(o + 1));
    if (i === void 0 || a === void 0) {
      const c = e[o] + e[o + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + o);
    }
    r[s] = i * 16 + a;
  }
  return r;
}
function qe(e) {
  return li(It(e));
}
function hi(e) {
  return (Tr(e), li(It(Uint8Array.from(e).reverse())));
}
function zt(e, t) {
  return Wt(e.toString(16).padStart(t * 2, '0'));
}
function pi(e, t) {
  return zt(e, t).reverse();
}
function re(e, t, n) {
  let r;
  if (typeof t == 'string')
    try {
      r = Wt(t);
    } catch (o) {
      throw new Error(e + ' must be hex string or Uint8Array, cause: ' + o);
    }
  else if (Ft(t)) r = Uint8Array.from(t);
  else throw new Error(e + ' must be hex string or Uint8Array');
  const s = r.length;
  if (typeof n == 'number' && s !== n) throw new Error(e + ' of length ' + n + ' expected, got ' + s);
  return r;
}
function Yt(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    (Tr(s), (t += s.length));
  }
  const n = new Uint8Array(t);
  for (let r = 0, s = 0; r < e.length; r++) {
    const o = e[r];
    (n.set(o, s), (s += o.length));
  }
  return n;
}
const Bn = (e) => typeof e == 'bigint' && kr <= e;
function Nr(e, t, n) {
  return Bn(e) && Bn(t) && Bn(n) && t <= e && e < n;
}
function ct(e, t, n, r) {
  if (!Nr(t, n, r)) throw new Error('expected valid ' + e + ': ' + n + ' <= n < ' + r + ', got ' + t);
}
function Ru(e) {
  let t;
  for (t = 0; e > kr; e >>= Xn, t += 1);
  return t;
}
const fn = (e) => (Xn << BigInt(e)) - Xn,
  $n = (e) => new Uint8Array(e),
  Fs = (e) => Uint8Array.from(e);
function Ou(e, t, n) {
  if (typeof e != 'number' || e < 2) throw new Error('hashLen must be a number');
  if (typeof t != 'number' || t < 2) throw new Error('qByteLen must be a number');
  if (typeof n != 'function') throw new Error('hmacFn must be a function');
  let r = $n(e),
    s = $n(e),
    o = 0;
  const i = () => {
      (r.fill(1), s.fill(0), (o = 0));
    },
    a = (...d) => n(s, r, ...d),
    c = (d = $n(0)) => {
      ((s = a(Fs([0]), d)), (r = a()), d.length !== 0 && ((s = a(Fs([1]), d)), (r = a())));
    },
    u = () => {
      if (o++ >= 1e3) throw new Error('drbg: tried 1000 values');
      let d = 0;
      const l = [];
      for (; d < t; ) {
        r = a();
        const b = r.slice();
        (l.push(b), (d += r.length));
      }
      return Yt(...l);
    };
  return (d, l) => {
    (i(), c(d));
    let b;
    for (; !(b = l(u())); ) c();
    return (i(), b);
  };
}
const Fu = {
  bigint: (e) => typeof e == 'bigint',
  function: (e) => typeof e == 'function',
  boolean: (e) => typeof e == 'boolean',
  string: (e) => typeof e == 'string',
  stringOrUint8Array: (e) => typeof e == 'string' || Ft(e),
  isSafeInteger: (e) => Number.isSafeInteger(e),
  array: (e) => Array.isArray(e),
  field: (e, t) => t.Fp.isValid(e),
  hash: (e) => typeof e == 'function' && Number.isSafeInteger(e.outputLen),
};
function dn(e, t, n = {}) {
  const r = (s, o, i) => {
    const a = Fu[o];
    if (typeof a != 'function') throw new Error('invalid validator function');
    const c = e[s];
    if (!(i && c === void 0) && !a(c, e))
      throw new Error('param ' + String(s) + ' is invalid. Expected ' + o + ', got ' + c);
  };
  for (const [s, o] of Object.entries(t)) r(s, o, !1);
  for (const [s, o] of Object.entries(n)) r(s, o, !0);
  return e;
}
function zs(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const s = t.get(n);
    if (s !== void 0) return s;
    const o = e(n, ...r);
    return (t.set(n, o), o);
  };
}
const zu = '0.1.1';
function Lu() {
  return zu;
}
class U extends Error {
  constructor(t, n = {}) {
    const r = (() => {
        if (n.cause instanceof U) {
          if (n.cause.details) return n.cause.details;
          if (n.cause.shortMessage) return n.cause.shortMessage;
        }
        return n.cause && 'details' in n.cause && typeof n.cause.details == 'string'
          ? n.cause.details
          : n.cause?.message
            ? n.cause.message
            : n.details;
      })(),
      s = (n.cause instanceof U && n.cause.docsPath) || n.docsPath,
      i = `https://oxlib.sh${s ?? ''}`,
      a = [
        t || 'An error occurred.',
        ...(n.metaMessages ? ['', ...n.metaMessages] : []),
        ...(r || s ? ['', r ? `Details: ${r}` : void 0, s ? `See: ${i}` : void 0] : []),
      ].filter((c) => typeof c == 'string').join(`
`);
    (super(a, n.cause ? { cause: n.cause } : void 0),
      Object.defineProperty(this, 'details', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'docs', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'docsPath', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'shortMessage', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'cause', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'BaseError',
      }),
      Object.defineProperty(this, 'version', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: `ox@${Lu()}`,
      }),
      (this.cause = n.cause),
      (this.details = r),
      (this.docs = i),
      (this.docsPath = s),
      (this.shortMessage = t));
  }
  walk(t) {
    return yi(this, t);
  }
}
function yi(e, t) {
  return t?.(e) ? e : e && typeof e == 'object' && 'cause' in e && e.cause ? yi(e.cause, t) : t ? null : e;
}
function Lt(e, t) {
  if (ot(e) > t)
    throw new ef({
      givenSize: ot(e),
      maxSize: t,
    });
}
const Ee = {
  zero: 48,
  nine: 57,
  A: 65,
  F: 70,
  a: 97,
  f: 102,
};
function Ls(e) {
  if (e >= Ee.zero && e <= Ee.nine) return e - Ee.zero;
  if (e >= Ee.A && e <= Ee.F) return e - (Ee.A - 10);
  if (e >= Ee.a && e <= Ee.f) return e - (Ee.a - 10);
}
function _u(e, t = {}) {
  const { dir: n, size: r = 32 } = t;
  if (r === 0) return e;
  if (e.length > r)
    throw new tf({
      size: e.length,
      targetSize: r,
      type: 'Bytes',
    });
  const s = new Uint8Array(r);
  for (let o = 0; o < r; o++) {
    const i = n === 'right';
    s[i ? o : r - o - 1] = e[i ? o : e.length - o - 1];
  }
  return s;
}
function mi(e, t = {}) {
  const { dir: n = 'left' } = t;
  let r = e,
    s = 0;
  for (let o = 0; o < r.length - 1 && r[n === 'left' ? o : r.length - o - 1].toString() === '0'; o++) s++;
  return ((r = n === 'left' ? r.slice(s) : r.slice(0, r.length - s)), r);
}
function ln(e, t) {
  if (te(e) > t)
    throw new cf({
      givenSize: te(e),
      maxSize: t,
    });
}
function Uu(e, t) {
  if (typeof t == 'number' && t > 0 && t > te(e) - 1)
    throw new $i({
      offset: t,
      position: 'start',
      size: te(e),
    });
}
function Mu(e, t, n) {
  if (typeof t == 'number' && typeof n == 'number' && te(e) !== n - t)
    throw new $i({
      offset: n,
      position: 'end',
      size: te(e),
    });
}
function gi(e, t = {}) {
  const { dir: n, size: r = 32 } = t;
  if (r === 0) return e;
  const s = e.replace('0x', '');
  if (s.length > r * 2)
    throw new uf({
      size: Math.ceil(s.length / 2),
      targetSize: r,
      type: 'Hex',
    });
  return `0x${s[n === 'right' ? 'padEnd' : 'padStart'](r * 2, '0')}`;
}
const ju = '#__bigint';
function wi(e, t, n) {
  return JSON.stringify(e, (r, s) => (typeof s == 'bigint' ? s.toString() + ju : s), n);
}
const Du = /* @__PURE__ */ new TextDecoder(),
  Gu = /* @__PURE__ */ new TextEncoder();
function Hu(e) {
  return e instanceof Uint8Array ? e : typeof e == 'string' ? xi(e) : qu(e);
}
function qu(e) {
  return e instanceof Uint8Array ? e : new Uint8Array(e);
}
function xi(e, t = {}) {
  const { size: n } = t;
  let r = e;
  n && (ln(e, n), (r = We(e, n)));
  let s = r.slice(2);
  s.length % 2 && (s = `0${s}`);
  const o = s.length / 2,
    i = new Uint8Array(o);
  for (let a = 0, c = 0; a < o; a++) {
    const u = Ls(s.charCodeAt(c++)),
      f = Ls(s.charCodeAt(c++));
    if (u === void 0 || f === void 0) throw new U(`Invalid byte sequence ("${s[c - 2]}${s[c - 1]}" in "${s}").`);
    i[a] = u * 16 + f;
  }
  return i;
}
function Vu(e, t = {}) {
  const { size: n } = t,
    r = Gu.encode(e);
  return typeof n == 'number' ? (Lt(r, n), Zu(r, n)) : r;
}
function Zu(e, t) {
  return _u(e, { dir: 'right', size: t });
}
function ot(e) {
  return e.length;
}
function Wu(e, t, n, r = {}) {
  const { strict: s } = r;
  return e.slice(t, n);
}
function Yu(e, t = {}) {
  const { size: n } = t;
  typeof n < 'u' && Lt(e, n);
  const r = fe(e, t);
  return Pi(r, t);
}
function Ku(e, t = {}) {
  const { size: n } = t;
  let r = e;
  if ((typeof n < 'u' && (Lt(r, n), (r = vi(r))), r.length > 1 || r[0] > 1)) throw new Qu(r);
  return !!r[0];
}
function $e(e, t = {}) {
  const { size: n } = t;
  typeof n < 'u' && Lt(e, n);
  const r = fe(e, t);
  return Ai(r, t);
}
function Xu(e, t = {}) {
  const { size: n } = t;
  let r = e;
  return (typeof n < 'u' && (Lt(r, n), (r = Ju(r))), Du.decode(r));
}
function vi(e) {
  return mi(e, { dir: 'left' });
}
function Ju(e) {
  return mi(e, { dir: 'right' });
}
class Qu extends U {
  constructor(t) {
    (super(`Bytes value \`${t}\` is not a valid boolean.`, {
      metaMessages: ['The bytes array must contain a single byte of either a `0` or `1` value.'],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Bytes.InvalidBytesBooleanError',
      }));
  }
}
let ef = class extends U {
    constructor({ givenSize: t, maxSize: n }) {
      (super(`Size cannot exceed \`${n}\` bytes. Given size: \`${t}\` bytes.`),
        Object.defineProperty(this, 'name', {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: 'Bytes.SizeOverflowError',
        }));
    }
  },
  tf = class extends U {
    constructor({ size: t, targetSize: n, type: r }) {
      (super(
        `${r.charAt(0).toUpperCase()}${r.slice(1).toLowerCase()} size (\`${t}\`) exceeds padding size (\`${n}\`).`
      ),
        Object.defineProperty(this, 'name', {
          enumerable: !0,
          configurable: !0,
          writable: !0,
          value: 'Bytes.SizeExceedsPaddingSizeError',
        }));
    }
  };
const nf = /* @__PURE__ */ new TextEncoder(),
  rf = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, '0'));
function sf(e, t = {}) {
  const { strict: n = !1 } = t;
  if (!e) throw new _s(e);
  if (typeof e != 'string') throw new _s(e);
  if (n && !/^0x[0-9a-fA-F]*$/.test(e)) throw new Us(e);
  if (!e.startsWith('0x')) throw new Us(e);
}
function ue(...e) {
  return `0x${e.reduce((t, n) => t + n.replace('0x', ''), '')}`;
}
function of(e) {
  return e instanceof Uint8Array ? fe(e) : Array.isArray(e) ? fe(new Uint8Array(e)) : e;
}
function Ei(e, t = {}) {
  const n = `0x${Number(e)}`;
  return typeof t.size == 'number' ? (ln(n, t.size), Ze(n, t.size)) : n;
}
function fe(e, t = {}) {
  let n = '';
  for (let s = 0; s < e.length; s++) n += rf[e[s]];
  const r = `0x${n}`;
  return typeof t.size == 'number' ? (ln(r, t.size), We(r, t.size)) : r;
}
function W(e, t = {}) {
  const { signed: n, size: r } = t,
    s = BigInt(e);
  let o;
  r
    ? n
      ? (o = (1n << (BigInt(r) * 8n - 1n)) - 1n)
      : (o = 2n ** (BigInt(r) * 8n) - 1n)
    : typeof e == 'number' && (o = BigInt(Number.MAX_SAFE_INTEGER));
  const i = typeof o == 'bigint' && n ? -o - 1n : 0;
  if ((o && s > o) || s < i) {
    const u = typeof e == 'bigint' ? 'n' : '';
    throw new Bi({
      max: o ? `${o}${u}` : void 0,
      min: `${i}${u}`,
      signed: n,
      size: r,
      value: `${e}${u}`,
    });
  }
  const c = `0x${(n && s < 0 ? (1n << BigInt(r * 8)) + BigInt(s) : s).toString(16)}`;
  return r ? Ze(c, r) : c;
}
function Cr(e, t = {}) {
  return fe(nf.encode(e), t);
}
function Ze(e, t) {
  return gi(e, { dir: 'left', size: t });
}
function We(e, t) {
  return gi(e, { dir: 'right', size: t });
}
function me(e, t, n, r = {}) {
  const { strict: s } = r;
  Uu(e, t);
  const o = `0x${e.replace('0x', '').slice((t ?? 0) * 2, (n ?? e.length) * 2)}`;
  return (s && Mu(o, t, n), o);
}
function te(e) {
  return Math.ceil((e.length - 2) / 2);
}
function Pi(e, t = {}) {
  const { signed: n } = t;
  t.size && ln(e, t.size);
  const r = BigInt(e);
  if (!n) return r;
  const s = (e.length - 2) / 2,
    o = (1n << (BigInt(s) * 8n)) - 1n,
    i = o >> 1n;
  return r <= i ? r : r - o - 1n;
}
function Ai(e, t = {}) {
  const { signed: n, size: r } = t;
  return Number(!n && !r ? e : Pi(e, t));
}
function af(e, t = {}) {
  const { strict: n = !1 } = t;
  try {
    return (sf(e, { strict: n }), !0);
  } catch {
    return !1;
  }
}
class Bi extends U {
  constructor({ max: t, min: n, signed: r, size: s, value: o }) {
    (super(
      `Number \`${o}\` is not in safe${s ? ` ${s * 8}-bit` : ''}${r ? ' signed' : ' unsigned'} integer range ${t ? `(\`${n}\` to \`${t}\`)` : `(above \`${n}\`)`}`
    ),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Hex.IntegerOutOfRangeError',
      }));
  }
}
class _s extends U {
  constructor(t) {
    (super(`Value \`${typeof t == 'object' ? wi(t) : t}\` of type \`${typeof t}\` is an invalid hex type.`, {
      metaMessages: ['Hex types must be represented as `"0x${string}"`.'],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Hex.InvalidHexTypeError',
      }));
  }
}
class Us extends U {
  constructor(t) {
    (super(`Value \`${t}\` is an invalid hex value.`, {
      metaMessages: ['Hex values must start with `"0x"` and contain only hexadecimal characters (0-9, a-f, A-F).'],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Hex.InvalidHexValueError',
      }));
  }
}
class cf extends U {
  constructor({ givenSize: t, maxSize: n }) {
    (super(`Size cannot exceed \`${n}\` bytes. Given size: \`${t}\` bytes.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Hex.SizeOverflowError',
      }));
  }
}
class $i extends U {
  constructor({ offset: t, position: n, size: r }) {
    (super(`Slice ${n === 'start' ? 'starting' : 'ending'} at offset \`${t}\` is out-of-bounds (size: \`${r}\`).`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Hex.SliceOffsetOutOfBoundsError',
      }));
  }
}
class uf extends U {
  constructor({ size: t, targetSize: n, type: r }) {
    (super(`${r.charAt(0).toUpperCase()}${r.slice(1).toLowerCase()} size (\`${t}\`) exceeds padding size (\`${n}\`).`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Hex.SizeExceedsPaddingSizeError',
      }));
  }
}
function ff(e) {
  return {
    address: e.address,
    amount: W(e.amount),
    index: W(e.index),
    validatorIndex: W(e.validatorIndex),
  };
}
function Ii(e) {
  return {
    ...(typeof e.baseFeePerGas == 'bigint' && {
      baseFeePerGas: W(e.baseFeePerGas),
    }),
    ...(typeof e.blobBaseFee == 'bigint' && {
      blobBaseFee: W(e.blobBaseFee),
    }),
    ...(typeof e.feeRecipient == 'string' && {
      feeRecipient: e.feeRecipient,
    }),
    ...(typeof e.gasLimit == 'bigint' && {
      gasLimit: W(e.gasLimit),
    }),
    ...(typeof e.number == 'bigint' && {
      number: W(e.number),
    }),
    ...(typeof e.prevRandao == 'bigint' && {
      prevRandao: W(e.prevRandao),
    }),
    ...(typeof e.time == 'bigint' && {
      time: W(e.time),
    }),
    ...(e.withdrawals && {
      withdrawals: e.withdrawals.map(ff),
    }),
  };
}
const df = '0x82ad56cb',
  Si =
    '0x608060405234801561001057600080fd5b5060405161018e38038061018e83398101604081905261002f91610124565b6000808351602085016000f59050803b61004857600080fd5b6000808351602085016000855af16040513d6000823e81610067573d81fd5b3d81f35b634e487b7160e01b600052604160045260246000fd5b600082601f83011261009257600080fd5b81516001600160401b038111156100ab576100ab61006b565b604051601f8201601f19908116603f011681016001600160401b03811182821017156100d9576100d961006b565b6040528181528382016020018510156100f157600080fd5b60005b82811015610110576020818601810151838301820152016100f4565b506000918101602001919091529392505050565b6000806040838503121561013757600080fd5b82516001600160401b0381111561014d57600080fd5b61015985828601610081565b602085015190935090506001600160401b0381111561017757600080fd5b61018385828601610081565b915050925092905056fe',
  lf =
    '0x608060405234801561001057600080fd5b506040516102c03803806102c083398101604081905261002f916101e6565b836001600160a01b03163b6000036100e457600080836001600160a01b03168360405161005c9190610270565b6000604051808303816000865af19150503d8060008114610099576040519150601f19603f3d011682016040523d82523d6000602084013e61009e565b606091505b50915091508115806100b857506001600160a01b0386163b155b156100e1578060405163101bb98d60e01b81526004016100d8919061028c565b60405180910390fd5b50505b6000808451602086016000885af16040513d6000823e81610103573d81fd5b3d81f35b80516001600160a01b038116811461011e57600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561015457818101518382015260200161013c565b50506000910152565b600082601f83011261016e57600080fd5b81516001600160401b0381111561018757610187610123565b604051601f8201601f19908116603f011681016001600160401b03811182821017156101b5576101b5610123565b6040528181528382016020018510156101cd57600080fd5b6101de826020830160208701610139565b949350505050565b600080600080608085870312156101fc57600080fd5b61020585610107565b60208601519094506001600160401b0381111561022157600080fd5b61022d8782880161015d565b93505061023c60408601610107565b60608601519092506001600160401b0381111561025857600080fd5b6102648782880161015d565b91505092959194509250565b60008251610282818460208701610139565b9190910192915050565b60208152600082518060208401526102ab816040850160208701610139565b601f01601f1916919091016040019291505056fe',
  bf =
    '0x608060405234801561001057600080fd5b5060405161069438038061069483398101604081905261002f9161051e565b600061003c848484610048565b9050806000526001601ff35b60007f64926492649264926492649264926492649264926492649264926492649264926100748361040c565b036101e7576000606080848060200190518101906100929190610577565b60405192955090935091506000906001600160a01b038516906100b69085906105dd565b6000604051808303816000865af19150503d80600081146100f3576040519150601f19603f3d011682016040523d82523d6000602084013e6100f8565b606091505b50509050876001600160a01b03163b60000361016057806101605760405162461bcd60e51b815260206004820152601e60248201527f5369676e617475726556616c696461746f723a206465706c6f796d656e74000060448201526064015b60405180910390fd5b604051630b135d3f60e11b808252906001600160a01b038a1690631626ba7e90610190908b9087906004016105f9565b602060405180830381865afa1580156101ad573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101d19190610633565b6001600160e01b03191614945050505050610405565b6001600160a01b0384163b1561027a57604051630b135d3f60e11b808252906001600160a01b03861690631626ba7e9061022790879087906004016105f9565b602060405180830381865afa158015610244573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102689190610633565b6001600160e01b031916149050610405565b81516041146102df5760405162461bcd60e51b815260206004820152603a602482015260008051602061067483398151915260448201527f3a20696e76616c6964207369676e6174757265206c656e6774680000000000006064820152608401610157565b6102e7610425565b5060208201516040808401518451859392600091859190811061030c5761030c61065d565b016020015160f81c9050601b811480159061032b57508060ff16601c14155b1561038c5760405162461bcd60e51b815260206004820152603b602482015260008051602061067483398151915260448201527f3a20696e76616c6964207369676e617475726520762076616c756500000000006064820152608401610157565b60408051600081526020810180835289905260ff83169181019190915260608101849052608081018390526001600160a01b0389169060019060a0016020604051602081039080840390855afa1580156103ea573d6000803e3d6000fd5b505050602060405103516001600160a01b0316149450505050505b9392505050565b600060208251101561041d57600080fd5b508051015190565b60405180606001604052806003906020820280368337509192915050565b6001600160a01b038116811461045857600080fd5b50565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561048c578181015183820152602001610474565b50506000910152565b600082601f8301126104a657600080fd5b81516001600160401b038111156104bf576104bf61045b565b604051601f8201601f19908116603f011681016001600160401b03811182821017156104ed576104ed61045b565b60405281815283820160200185101561050557600080fd5b610516826020830160208701610471565b949350505050565b60008060006060848603121561053357600080fd5b835161053e81610443565b6020850151604086015191945092506001600160401b0381111561056157600080fd5b61056d86828701610495565b9150509250925092565b60008060006060848603121561058c57600080fd5b835161059781610443565b60208501519093506001600160401b038111156105b357600080fd5b6105bf86828701610495565b604086015190935090506001600160401b0381111561056157600080fd5b600082516105ef818460208701610471565b9190910192915050565b828152604060208201526000825180604084015261061e816060850160208701610471565b601f01601f1916919091016060019392505050565b60006020828403121561064557600080fd5b81516001600160e01b03198116811461040557600080fd5b634e487b7160e01b600052603260045260246000fdfe5369676e617475726556616c696461746f72237265636f7665725369676e6572',
  Rr =
    '0x608060405234801561001057600080fd5b506115b9806100206000396000f3fe6080604052600436106100f35760003560e01c80634d2301cc1161008a578063a8b0574e11610059578063a8b0574e14610325578063bce38bd714610350578063c3077fa914610380578063ee82ac5e146103b2576100f3565b80634d2301cc1461026257806372425d9d1461029f57806382ad56cb146102ca57806386d516e8146102fa576100f3565b80633408e470116100c65780633408e470146101af578063399542e9146101da5780633e64a6961461020c57806342cbb15c14610237576100f3565b80630f28c97d146100f8578063174dea7114610123578063252dba421461015357806327e86d6e14610184575b600080fd5b34801561010457600080fd5b5061010d6103ef565b60405161011a9190610c0a565b60405180910390f35b61013d60048036038101906101389190610c94565b6103f7565b60405161014a9190610e94565b60405180910390f35b61016d60048036038101906101689190610f0c565b610615565b60405161017b92919061101b565b60405180910390f35b34801561019057600080fd5b506101996107ab565b6040516101a69190611064565b60405180910390f35b3480156101bb57600080fd5b506101c46107b7565b6040516101d19190610c0a565b60405180910390f35b6101f460048036038101906101ef91906110ab565b6107bf565b6040516102039392919061110b565b60405180910390f35b34801561021857600080fd5b506102216107e1565b60405161022e9190610c0a565b60405180910390f35b34801561024357600080fd5b5061024c6107e9565b6040516102599190610c0a565b60405180910390f35b34801561026e57600080fd5b50610289600480360381019061028491906111a7565b6107f1565b6040516102969190610c0a565b60405180910390f35b3480156102ab57600080fd5b506102b4610812565b6040516102c19190610c0a565b60405180910390f35b6102e460048036038101906102df919061122a565b61081a565b6040516102f19190610e94565b60405180910390f35b34801561030657600080fd5b5061030f6109e4565b60405161031c9190610c0a565b60405180910390f35b34801561033157600080fd5b5061033a6109ec565b6040516103479190611286565b60405180910390f35b61036a600480360381019061036591906110ab565b6109f4565b6040516103779190610e94565b60405180910390f35b61039a60048036038101906103959190610f0c565b610ba6565b6040516103a99392919061110b565b60405180910390f35b3480156103be57600080fd5b506103d960048036038101906103d491906112cd565b610bca565b6040516103e69190611064565b60405180910390f35b600042905090565b60606000808484905090508067ffffffffffffffff81111561041c5761041b6112fa565b5b60405190808252806020026020018201604052801561045557816020015b610442610bd5565b81526020019060019003908161043a5790505b5092503660005b828110156105c957600085828151811061047957610478611329565b5b6020026020010151905087878381811061049657610495611329565b5b90506020028101906104a89190611367565b925060008360400135905080860195508360000160208101906104cb91906111a7565b73ffffffffffffffffffffffffffffffffffffffff16818580606001906104f2919061138f565b604051610500929190611431565b60006040518083038185875af1925050503d806000811461053d576040519150601f19603f3d011682016040523d82523d6000602084013e610542565b606091505b5083600001846020018290528215151515815250505081516020850135176105bc577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260846000fd5b826001019250505061045c565b5082341461060c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610603906114a7565b60405180910390fd5b50505092915050565b6000606043915060008484905090508067ffffffffffffffff81111561063e5761063d6112fa565b5b60405190808252806020026020018201604052801561067157816020015b606081526020019060019003908161065c5790505b5091503660005b828110156107a157600087878381811061069557610694611329565b5b90506020028101906106a791906114c7565b92508260000160208101906106bc91906111a7565b73ffffffffffffffffffffffffffffffffffffffff168380602001906106e2919061138f565b6040516106f0929190611431565b6000604051808303816000865af19150503d806000811461072d576040519150601f19603f3d011682016040523d82523d6000602084013e610732565b606091505b5086848151811061074657610745611329565b5b60200260200101819052819250505080610795576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161078c9061153b565b60405180910390fd5b81600101915050610678565b5050509250929050565b60006001430340905090565b600046905090565b6000806060439250434091506107d68686866109f4565b905093509350939050565b600048905090565b600043905090565b60008173ffffffffffffffffffffffffffffffffffffffff16319050919050565b600044905090565b606060008383905090508067ffffffffffffffff81111561083e5761083d6112fa565b5b60405190808252806020026020018201604052801561087757816020015b610864610bd5565b81526020019060019003908161085c5790505b5091503660005b828110156109db57600084828151811061089b5761089a611329565b5b602002602001015190508686838181106108b8576108b7611329565b5b90506020028101906108ca919061155b565b92508260000160208101906108df91906111a7565b73ffffffffffffffffffffffffffffffffffffffff16838060400190610905919061138f565b604051610913929190611431565b6000604051808303816000865af19150503d8060008114610950576040519150601f19603f3d011682016040523d82523d6000602084013e610955565b606091505b5082600001836020018290528215151515815250505080516020840135176109cf577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260646000fd5b8160010191505061087e565b50505092915050565b600045905090565b600041905090565b606060008383905090508067ffffffffffffffff811115610a1857610a176112fa565b5b604051908082528060200260200182016040528015610a5157816020015b610a3e610bd5565b815260200190600190039081610a365790505b5091503660005b82811015610b9c576000848281518110610a7557610a74611329565b5b60200260200101519050868683818110610a9257610a91611329565b5b9050602002810190610aa491906114c7565b9250826000016020810190610ab991906111a7565b73ffffffffffffffffffffffffffffffffffffffff16838060200190610adf919061138f565b604051610aed929190611431565b6000604051808303816000865af19150503d8060008114610b2a576040519150601f19603f3d011682016040523d82523d6000602084013e610b2f565b606091505b508260000183602001829052821515151581525050508715610b90578060000151610b8f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b869061153b565b60405180910390fd5b5b81600101915050610a58565b5050509392505050565b6000806060610bb7600186866107bf565b8093508194508295505050509250925092565b600081409050919050565b6040518060400160405280600015158152602001606081525090565b6000819050919050565b610c0481610bf1565b82525050565b6000602082019050610c1f6000830184610bfb565b92915050565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b60008083601f840112610c5457610c53610c2f565b5b8235905067ffffffffffffffff811115610c7157610c70610c34565b5b602083019150836020820283011115610c8d57610c8c610c39565b5b9250929050565b60008060208385031215610cab57610caa610c25565b5b600083013567ffffffffffffffff811115610cc957610cc8610c2a565b5b610cd585828601610c3e565b92509250509250929050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b60008115159050919050565b610d2281610d0d565b82525050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610d62578082015181840152602081019050610d47565b83811115610d71576000848401525b50505050565b6000601f19601f8301169050919050565b6000610d9382610d28565b610d9d8185610d33565b9350610dad818560208601610d44565b610db681610d77565b840191505092915050565b6000604083016000830151610dd96000860182610d19565b5060208301518482036020860152610df18282610d88565b9150508091505092915050565b6000610e0a8383610dc1565b905092915050565b6000602082019050919050565b6000610e2a82610ce1565b610e348185610cec565b935083602082028501610e4685610cfd565b8060005b85811015610e825784840389528151610e638582610dfe565b9450610e6e83610e12565b925060208a01995050600181019050610e4a565b50829750879550505050505092915050565b60006020820190508181036000830152610eae8184610e1f565b905092915050565b60008083601f840112610ecc57610ecb610c2f565b5b8235905067ffffffffffffffff811115610ee957610ee8610c34565b5b602083019150836020820283011115610f0557610f04610c39565b5b9250929050565b60008060208385031215610f2357610f22610c25565b5b600083013567ffffffffffffffff811115610f4157610f40610c2a565b5b610f4d85828601610eb6565b92509250509250929050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b6000610f918383610d88565b905092915050565b6000602082019050919050565b6000610fb182610f59565b610fbb8185610f64565b935083602082028501610fcd85610f75565b8060005b858110156110095784840389528151610fea8582610f85565b9450610ff583610f99565b925060208a01995050600181019050610fd1565b50829750879550505050505092915050565b60006040820190506110306000830185610bfb565b81810360208301526110428184610fa6565b90509392505050565b6000819050919050565b61105e8161104b565b82525050565b60006020820190506110796000830184611055565b92915050565b61108881610d0d565b811461109357600080fd5b50565b6000813590506110a58161107f565b92915050565b6000806000604084860312156110c4576110c3610c25565b5b60006110d286828701611096565b935050602084013567ffffffffffffffff8111156110f3576110f2610c2a565b5b6110ff86828701610eb6565b92509250509250925092565b60006060820190506111206000830186610bfb565b61112d6020830185611055565b818103604083015261113f8184610e1f565b9050949350505050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061117482611149565b9050919050565b61118481611169565b811461118f57600080fd5b50565b6000813590506111a18161117b565b92915050565b6000602082840312156111bd576111bc610c25565b5b60006111cb84828501611192565b91505092915050565b60008083601f8401126111ea576111e9610c2f565b5b8235905067ffffffffffffffff81111561120757611206610c34565b5b60208301915083602082028301111561122357611222610c39565b5b9250929050565b6000806020838503121561124157611240610c25565b5b600083013567ffffffffffffffff81111561125f5761125e610c2a565b5b61126b858286016111d4565b92509250509250929050565b61128081611169565b82525050565b600060208201905061129b6000830184611277565b92915050565b6112aa81610bf1565b81146112b557600080fd5b50565b6000813590506112c7816112a1565b92915050565b6000602082840312156112e3576112e2610c25565b5b60006112f1848285016112b8565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b60008235600160800383360303811261138357611382611358565b5b80830191505092915050565b600080833560016020038436030381126113ac576113ab611358565b5b80840192508235915067ffffffffffffffff8211156113ce576113cd61135d565b5b6020830192506001820236038313156113ea576113e9611362565b5b509250929050565b600081905092915050565b82818337600083830152505050565b600061141883856113f2565b93506114258385846113fd565b82840190509392505050565b600061143e82848661140c565b91508190509392505050565b600082825260208201905092915050565b7f4d756c746963616c6c333a2076616c7565206d69736d61746368000000000000600082015250565b6000611491601a8361144a565b915061149c8261145b565b602082019050919050565b600060208201905081810360008301526114c081611484565b9050919050565b6000823560016040038336030381126114e3576114e2611358565b5b80830191505092915050565b7f4d756c746963616c6c333a2063616c6c206661696c6564000000000000000000600082015250565b600061152560178361144a565b9150611530826114ef565b602082019050919050565b6000602082019050818103600083015261155481611518565b9050919050565b60008235600160600383360303811261157757611576611358565b5b8083019150509291505056fea264697066735822122020c1bc9aacf8e4a6507193432a895a8e77094f45a1395583f07b24e860ef06cd64736f6c634300080c0033';
class Jn extends I {
  constructor({ blockNumber: t, chain: n, contract: r }) {
    super(`Chain "${n.name}" does not support contract "${r.name}".`, {
      metaMessages: [
        'This could be due to any of the following:',
        ...(t && r.blockCreated && r.blockCreated > t
          ? [`- The contract "${r.name}" was not deployed until block ${r.blockCreated} (current block ${t}).`]
          : [`- The chain does not have the contract "${r.name}" configured.`]),
      ],
      name: 'ChainDoesNotSupportContract',
    });
  }
}
class ki extends I {
  constructor() {
    super('No chain was provided to the Client.', {
      name: 'ClientChainNotConfiguredError',
    });
  }
}
const In = '/docs/contract/encodeDeployData';
function Or(e) {
  const { abi: t, args: n, bytecode: r } = e;
  if (!n || n.length === 0) return r;
  const s = t.find((i) => 'type' in i && i.type === 'constructor');
  if (!s) throw new Ac({ docsPath: In });
  if (!('inputs' in s)) throw new hs({ docsPath: In });
  if (!s.inputs || s.inputs.length === 0) throw new hs({ docsPath: In });
  const o = _e(s.inputs, n);
  return mt([r, o]);
}
function gt({ blockNumber: e, chain: t, contract: n }) {
  const r = t?.contracts?.[n];
  if (!r)
    throw new Jn({
      chain: t,
      contract: { name: n },
    });
  if (e && r.blockCreated && r.blockCreated > e)
    throw new Jn({
      blockNumber: e,
      chain: t,
      contract: {
        name: n,
        blockCreated: r.blockCreated,
      },
    });
  return r.address;
}
function Ti(e, { docsPath: t, ...n }) {
  const r = (() => {
    const s = wr(e, n);
    return s instanceof Jt ? e : s;
  })();
  return new Vo(r, {
    docsPath: t,
    ...n,
  });
}
async function _t(e, t) {
  const {
      account: n = e.account,
      authorizationList: r,
      batch: s = !!e.batch?.multicall,
      blockNumber: o,
      blockTag: i = e.experimental_blockTag ?? 'latest',
      accessList: a,
      blobs: c,
      blockOverrides: u,
      code: f,
      data: d,
      factory: l,
      factoryData: b,
      gas: y,
      gasPrice: h,
      maxFeePerBlobGas: w,
      maxFeePerGas: m,
      maxPriorityFeePerGas: A,
      nonce: x,
      to: p,
      value: g,
      stateOverride: E,
      ...v
    } = t,
    S = n ? le(n) : void 0;
  if (f && (l || b)) throw new I('Cannot provide both `code` & `factory`/`factoryData` as parameters.');
  if (f && p) throw new I('Cannot provide both `code` & `to` as parameters.');
  const O = f && d,
    T = l && b && p && d,
    k = O || T,
    F = O
      ? Ni({
          code: f,
          data: d,
        })
      : T
        ? yf({
            data: d,
            factory: l,
            factoryData: b,
            to: p,
          })
        : d;
  try {
    Rt(t);
    const j = (typeof o == 'bigint' ? z(o) : void 0) || i,
      B = u ? Ii(u) : void 0,
      P = vr(E),
      C = e.chain?.formatters?.transactionRequest?.format,
      N = (C || un)(
        {
          // Pick out extra data that might exist on the chain's transaction request type.
          ...xr(v, { format: C }),
          from: S?.address,
          accessList: a,
          authorizationList: r,
          blobs: c,
          data: F,
          gas: y,
          gasPrice: h,
          maxFeePerBlobGas: w,
          maxFeePerGas: m,
          maxPriorityFeePerGas: A,
          nonce: x,
          to: k ? void 0 : p,
          value: g,
        },
        'call'
      );
    if (s && hf({ request: N }) && !P && !B)
      try {
        return await pf(e, {
          ...N,
          blockNumber: o,
          blockTag: i,
        });
      } catch (D) {
        if (!(D instanceof ki) && !(D instanceof Jn)) throw D;
      }
    const _ = (() => {
        const D = [N, j];
        return P && B ? [...D, P, B] : P ? [...D, P] : B ? [...D, {}, B] : D;
      })(),
      M = await e.request({
        method: 'eth_call',
        params: _,
      });
    return M === '0x' ? { data: void 0 } : { data: M };
  } catch (R) {
    const j = mf(R),
      { offchainLookup: B, offchainLookupSignature: P } = await Promise.resolve().then(() => ld);
    if (e.ccipRead !== !1 && j?.slice(0, 10) === P && p) return { data: await B(e, { data: j, to: p }) };
    throw k && j?.slice(0, 10) === '0x101bb98d'
      ? new W0({ factory: l })
      : Ti(R, {
          ...t,
          account: S,
          chain: e.chain,
        });
  }
}
function hf({ request: e }) {
  const { data: t, to: n, ...r } = e;
  return !(!t || t.startsWith(df) || !n || Object.values(r).filter((s) => typeof s < 'u').length > 0);
}
async function pf(e, t) {
  const {
      batchSize: n = 1024,
      deployless: r = !1,
      wait: s = 0,
    } = typeof e.batch?.multicall == 'object' ? e.batch.multicall : {},
    { blockNumber: o, blockTag: i = e.experimental_blockTag ?? 'latest', data: a, to: c } = t,
    u = (() => {
      if (r) return null;
      if (t.multicallAddress) return t.multicallAddress;
      if (e.chain)
        return gt({
          blockNumber: o,
          chain: e.chain,
          contract: 'multicall3',
        });
      throw new ki();
    })(),
    d = (typeof o == 'bigint' ? z(o) : void 0) || i,
    { schedule: l } = Na({
      id: `${e.uid}.${d}`,
      wait: s,
      shouldSplitBatch(h) {
        return h.reduce((m, { data: A }) => m + (A.length - 2), 0) > n * 2;
      },
      fn: async (h) => {
        const w = h.map((x) => ({
            allowFailure: !0,
            callData: x.data,
            target: x.to,
          })),
          m = be({
            abi: Vt,
            args: [w],
            functionName: 'aggregate3',
          }),
          A = await e.request({
            method: 'eth_call',
            params: [
              {
                ...(u === null
                  ? {
                      data: Ni({
                        code: Rr,
                        data: m,
                      }),
                    }
                  : { to: u, data: m }),
              },
              d,
            ],
          });
        return Je({
          abi: Vt,
          args: [w],
          functionName: 'aggregate3',
          data: A || '0x',
        });
      },
    }),
    [{ returnData: b, success: y }] = await l({ data: a, to: c });
  if (!y) throw new cn({ data: b });
  return b === '0x' ? { data: void 0 } : { data: b };
}
function Ni(e) {
  const { code: t, data: n } = e;
  return Or({
    abi: go(['constructor(bytes, bytes)']),
    bytecode: Si,
    args: [t, n],
  });
}
function yf(e) {
  const { data: t, factory: n, factoryData: r, to: s } = e;
  return Or({
    abi: go(['constructor(address, bytes, address, bytes)']),
    bytecode: lf,
    args: [s, t, n, r],
  });
}
function mf(e) {
  if (!(e instanceof I)) return;
  const t = e.walk();
  return typeof t?.data == 'object' ? t.data?.data : t.data;
}
async function de(e, t) {
  const { abi: n, address: r, args: s, functionName: o, ...i } = t,
    a = be({
      abi: n,
      args: s,
      functionName: o,
    });
  try {
    const { data: c } = await L(
      e,
      _t,
      'call'
    )({
      ...i,
      data: a,
      to: r,
    });
    return Je({
      abi: n,
      args: s,
      functionName: o,
      data: c || '0x',
    });
  } catch (c) {
    throw ht(c, {
      abi: n,
      address: r,
      args: s,
      docsPath: '/docs/contract/readContract',
      functionName: o,
    });
  }
}
async function gf(e, t) {
  const { abi: n, address: r, args: s, dataSuffix: o, functionName: i, ...a } = t,
    c = a.account ? le(a.account) : e.account,
    u = be({ abi: n, args: s, functionName: i });
  try {
    const { data: f } = await L(
        e,
        _t,
        'call'
      )({
        batch: !1,
        data: `${u}${o ? o.replace('0x', '') : ''}`,
        to: r,
        ...a,
        account: c,
      }),
      d = Je({
        abi: n,
        args: s,
        functionName: i,
        data: f || '0x',
      }),
      l = n.filter((b) => 'name' in b && b.name === t.functionName);
    return {
      result: d,
      request: {
        abi: l,
        address: r,
        args: s,
        dataSuffix: o,
        functionName: i,
        ...a,
        account: c,
      },
    };
  } catch (f) {
    throw ht(f, {
      abi: n,
      address: r,
      args: s,
      docsPath: '/docs/contract/simulateContract',
      functionName: i,
      sender: c?.address,
    });
  }
}
const Sn = /* @__PURE__ */ new Map(),
  Ms = /* @__PURE__ */ new Map();
let wf = 0;
function Le(e, t, n) {
  const r = ++wf,
    s = () => Sn.get(e) || [],
    o = () => {
      const f = s();
      Sn.set(
        e,
        f.filter((d) => d.id !== r)
      );
    },
    i = () => {
      const f = s();
      if (!f.some((l) => l.id === r)) return;
      const d = Ms.get(e);
      if (f.length === 1 && d) {
        const l = d();
        l instanceof Promise && l.catch(() => {});
      }
      o();
    },
    a = s();
  if ((Sn.set(e, [...a, { id: r, fns: t }]), a && a.length > 0)) return i;
  const c = {};
  for (const f in t)
    c[f] = (...d) => {
      const l = s();
      if (l.length !== 0) for (const b of l) b.fns[f]?.(...d);
    };
  const u = n(c);
  return (typeof u == 'function' && Ms.set(e, u), i);
}
function Ut(e, { emitOnBegin: t, initialWaitTime: n, interval: r }) {
  let s = !0;
  const o = () => (s = !1);
  return (
    (async () => {
      let a;
      t && (a = await e({ unpoll: o }));
      const c = (await n?.(a)) ?? r;
      await ss(c);
      const u = async () => {
        s && (await e({ unpoll: o }), await ss(r), u());
      };
      u();
    })(),
    o
  );
}
const xf = /* @__PURE__ */ new Map(),
  vf = /* @__PURE__ */ new Map();
function Ef(e) {
  const t = (s, o) => ({
      clear: () => o.delete(s),
      get: () => o.get(s),
      set: (i) => o.set(s, i),
    }),
    n = t(e, xf),
    r = t(e, vf);
  return {
    clear: () => {
      (n.clear(), r.clear());
    },
    promise: n,
    response: r,
  };
}
async function Pf(e, { cacheKey: t, cacheTime: n = Number.POSITIVE_INFINITY }) {
  const r = Ef(t),
    s = r.response.get();
  if (s && n > 0 && Date.now() - s.created.getTime() < n) return s.data;
  let o = r.promise.get();
  o || ((o = e()), r.promise.set(o));
  try {
    const i = await o;
    return (r.response.set({ created: /* @__PURE__ */ new Date(), data: i }), i);
  } finally {
    r.promise.clear();
  }
}
const Af = (e) => `blockNumber.${e}`;
async function Mt(e, { cacheTime: t = e.cacheTime } = {}) {
  const n = await Pf(
    () =>
      e.request({
        method: 'eth_blockNumber',
      }),
    { cacheKey: Af(e.uid), cacheTime: t }
  );
  return BigInt(n);
}
async function bn(e, { filter: t }) {
  const n = 'strict' in t && t.strict,
    r = await t.request({
      method: 'eth_getFilterChanges',
      params: [t.id],
    });
  if (typeof r[0] == 'string') return r;
  const s = r.map((o) => Te(o));
  return !('abi' in t) || !t.abi
    ? s
    : Ir({
        abi: t.abi,
        logs: s,
        strict: n,
      });
}
async function hn(e, { filter: t }) {
  return t.request({
    method: 'eth_uninstallFilter',
    params: [t.id],
  });
}
function Bf(e, t) {
  const {
    abi: n,
    address: r,
    args: s,
    batch: o = !0,
    eventName: i,
    fromBlock: a,
    onError: c,
    onLogs: u,
    poll: f,
    pollingInterval: d = e.pollingInterval,
    strict: l,
  } = t;
  return (
    typeof f < 'u'
      ? f
      : typeof a == 'bigint'
        ? !0
        : !(
            e.transport.type === 'webSocket' ||
            e.transport.type === 'ipc' ||
            (e.transport.type === 'fallback' &&
              (e.transport.transports[0].config.type === 'webSocket' ||
                e.transport.transports[0].config.type === 'ipc'))
          )
  )
    ? (() => {
        const w = l ?? !1,
          m = se(['watchContractEvent', r, s, o, e.uid, i, d, w, a]);
        return Le(m, { onLogs: u, onError: c }, (A) => {
          let x;
          a !== void 0 && (x = a - 1n);
          let p,
            g = !1;
          const E = Ut(
            async () => {
              if (!g) {
                try {
                  p = await L(
                    e,
                    _o,
                    'createContractEventFilter'
                  )({
                    abi: n,
                    address: r,
                    args: s,
                    eventName: i,
                    strict: w,
                    fromBlock: a,
                  });
                } catch {}
                g = !0;
                return;
              }
              try {
                let v;
                if (p) v = await L(e, bn, 'getFilterChanges')({ filter: p });
                else {
                  const S = await L(e, Mt, 'getBlockNumber')({});
                  (x && x < S
                    ? (v = await L(
                        e,
                        di,
                        'getContractEvents'
                      )({
                        abi: n,
                        address: r,
                        args: s,
                        eventName: i,
                        fromBlock: x + 1n,
                        toBlock: S,
                        strict: w,
                      }))
                    : (v = []),
                    (x = S));
                }
                if (v.length === 0) return;
                if (o) A.onLogs(v);
                else for (const S of v) A.onLogs([S]);
              } catch (v) {
                (p && v instanceof no && (g = !1), A.onError?.(v));
              }
            },
            {
              emitOnBegin: !0,
              interval: d,
            }
          );
          return async () => {
            (p && (await L(e, hn, 'uninstallFilter')({ filter: p })), E());
          };
        });
      })()
    : (() => {
        const w = l ?? !1,
          m = se(['watchContractEvent', r, s, o, e.uid, i, d, w]);
        let A = !0,
          x = () => (A = !1);
        return Le(
          m,
          { onLogs: u, onError: c },
          (p) => (
            (async () => {
              try {
                const g = (() => {
                    if (e.transport.type === 'fallback') {
                      const S = e.transport.transports.find(
                        (O) => O.config.type === 'webSocket' || O.config.type === 'ipc'
                      );
                      return S ? S.value : e.transport;
                    }
                    return e.transport;
                  })(),
                  E = i
                    ? Nt({
                        abi: n,
                        eventName: i,
                        args: s,
                      })
                    : [],
                  { unsubscribe: v } = await g.subscribe({
                    params: ['logs', { address: r, topics: E }],
                    onData(S) {
                      if (!A) return;
                      const O = S.result;
                      try {
                        const { eventName: T, args: k } = $r({
                            abi: n,
                            data: O.data,
                            topics: O.topics,
                            strict: l,
                          }),
                          F = Te(O, {
                            args: k,
                            eventName: T,
                          });
                        p.onLogs([F]);
                      } catch (T) {
                        let k, F;
                        if (T instanceof Pt || T instanceof tn) {
                          if (l) return;
                          ((k = T.abiItem.name), (F = T.abiItem.inputs?.some((j) => !('name' in j && j.name))));
                        }
                        const R = Te(O, {
                          args: F ? [] : {},
                          eventName: k,
                        });
                        p.onLogs([R]);
                      }
                    },
                    onError(S) {
                      p.onError?.(S);
                    },
                  });
                ((x = v), A || x());
              } catch (g) {
                c?.(g);
              }
            })(),
            () => x()
          )
        );
      })();
}
async function $f(e, { serializedTransaction: t }) {
  return e.request(
    {
      method: 'eth_sendRawTransaction',
      params: [t],
    },
    { retryCount: 0 }
  );
}
const If = {
  '0x0': 'reverted',
  '0x1': 'success',
};
function Ci(e, t) {
  const n = {
    ...e,
    blockNumber: e.blockNumber ? BigInt(e.blockNumber) : null,
    contractAddress: e.contractAddress ? e.contractAddress : null,
    cumulativeGasUsed: e.cumulativeGasUsed ? BigInt(e.cumulativeGasUsed) : null,
    effectiveGasPrice: e.effectiveGasPrice ? BigInt(e.effectiveGasPrice) : null,
    gasUsed: e.gasUsed ? BigInt(e.gasUsed) : null,
    logs: e.logs ? e.logs.map((r) => Te(r)) : null,
    to: e.to ? e.to : null,
    transactionIndex: e.transactionIndex ? Ie(e.transactionIndex) : null,
    status: e.status ? If[e.status] : null,
    type: e.type ? Qo[e.type] || e.type : null,
  };
  return (
    e.blobGasPrice && (n.blobGasPrice = BigInt(e.blobGasPrice)),
    e.blobGasUsed && (n.blobGasUsed = BigInt(e.blobGasUsed)),
    n
  );
}
function Sf(e) {
  const { batch: t, chain: n, ccipRead: r, key: s = 'base', name: o = 'Base Client', type: i = 'base' } = e,
    a = e.experimental_blockTag ?? (typeof n?.experimental_preconfirmationTime == 'number' ? 'pending' : void 0),
    c = n?.blockTime ?? 12e3,
    u = Math.min(Math.max(Math.floor(c / 2), 500), 4e3),
    f = e.pollingInterval ?? u,
    d = e.cacheTime ?? f,
    l = e.account ? le(e.account) : void 0,
    {
      config: b,
      request: y,
      value: h,
    } = e.transport({
      chain: n,
      pollingInterval: f,
    }),
    w = { ...b, ...h },
    m = {
      account: l,
      batch: t,
      cacheTime: d,
      ccipRead: r,
      chain: n,
      key: s,
      name: o,
      pollingInterval: f,
      request: y,
      transport: w,
      type: i,
      uid: Ca(),
      ...(a ? { experimental_blockTag: a } : {}),
    };
  function A(x) {
    return (p) => {
      const g = p(x);
      for (const v in m) delete g[v];
      const E = { ...x, ...g };
      return Object.assign(E, { extend: A(E) });
    };
  }
  return Object.assign(m, { extend: A(m) });
}
function Fr(e) {
  if (!(e instanceof I)) return !1;
  const t = e.walk((n) => n instanceof Yn);
  return t instanceof Yn
    ? t.data?.errorName === 'HttpError' ||
        t.data?.errorName === 'ResolverError' ||
        t.data?.errorName === 'ResolverNotContract' ||
        t.data?.errorName === 'ResolverNotFound' ||
        t.data?.errorName === 'ReverseAddressMismatch' ||
        t.data?.errorName === 'UnsupportedResolverProfile'
    : !1;
}
function kf(e) {
  const { abi: t, data: n } = e,
    r = bt(n, 0, 4),
    s = t.find((o) => o.type === 'function' && r === Tt(ae(o)));
  if (!s)
    throw new Tc(r, {
      docsPath: '/docs/contract/decodeFunctionData',
    });
  return {
    functionName: s.name,
    args: 'inputs' in s && s.inputs && s.inputs.length > 0 ? Ct(s.inputs, bt(n, 4)) : void 0,
  };
}
const kn = '/docs/contract/encodeErrorResult';
function js(e) {
  const { abi: t, errorName: n, args: r } = e;
  let s = t[0];
  if (n) {
    const c = Xe({ abi: t, args: r, name: n });
    if (!c) throw new ps(n, { docsPath: kn });
    s = c;
  }
  if (s.type !== 'error') throw new ps(void 0, { docsPath: kn });
  const o = ae(s),
    i = Tt(o);
  let a = '0x';
  if (r && r.length > 0) {
    if (!s.inputs) throw new Sc(s.name, { docsPath: kn });
    a = _e(s.inputs, r);
  }
  return mt([i, a]);
}
const Tn = '/docs/contract/encodeFunctionResult';
function Tf(e) {
  const { abi: t, functionName: n, result: r } = e;
  let s = t[0];
  if (n) {
    const i = Xe({ abi: t, name: n });
    if (!i) throw new ft(n, { docsPath: Tn });
    s = i;
  }
  if (s.type !== 'function') throw new ft(void 0, { docsPath: Tn });
  if (!s.outputs) throw new Eo(s.name, { docsPath: Tn });
  const o = (() => {
    if (s.outputs.length === 0) return [];
    if (s.outputs.length === 1) return [r];
    if (Array.isArray(r)) return r;
    throw new Po(r);
  })();
  return _e(s.outputs, o);
}
const jt = 'x-batch-gateway:true';
async function Ri(e) {
  const { data: t, ccipRequest: n } = e,
    {
      args: [r],
    } = kf({ abi: Dn, data: t }),
    s = [],
    o = [];
  return (
    await Promise.all(
      r.map(async (i, a) => {
        try {
          ((o[a] = i.urls.includes(jt) ? await Ri({ data: i.data, ccipRequest: n }) : await n(i)), (s[a] = !1));
        } catch (c) {
          ((s[a] = !0), (o[a] = Nf(c)));
        }
      })
    ),
    Tf({
      abi: Dn,
      functionName: 'query',
      result: [s, o],
    })
  );
}
function Nf(e) {
  return e.name === 'HttpRequestError' && e.status
    ? js({
        abi: Dn,
        errorName: 'HttpError',
        args: [e.status, e.shortMessage],
      })
    : js({
        abi: [Uo],
        errorName: 'Error',
        args: ['shortMessage' in e ? e.shortMessage : e.message],
      });
}
function Oi(e) {
  if (e.length !== 66 || e.indexOf('[') !== 0 || e.indexOf(']') !== 65) return null;
  const t = `0x${e.slice(1, 65)}`;
  return ge(t) ? t : null;
}
function Qn(e) {
  let t = new Uint8Array(32).fill(0);
  if (!e) return V(t);
  const n = e.split('.');
  for (let r = n.length - 1; r >= 0; r -= 1) {
    const s = Oi(n[r]),
      o = s ? yt(s) : q(He(n[r]), 'bytes');
    t = q(ce([t, o]), 'bytes');
  }
  return V(t);
}
function Cf(e) {
  return `[${e.slice(2)}]`;
}
function Rf(e) {
  const t = new Uint8Array(32).fill(0);
  return e ? Oi(e) || q(He(e)) : V(t);
}
function zr(e) {
  const t = e.replace(/^\.|\.$/gm, '');
  if (t.length === 0) return new Uint8Array(1);
  const n = new Uint8Array(He(t).byteLength + 2);
  let r = 0;
  const s = t.split('.');
  for (let o = 0; o < s.length; o++) {
    let i = He(s[o]);
    (i.byteLength > 255 && (i = He(Cf(Rf(s[o])))), (n[r] = i.length), n.set(i, r + 1), (r += i.length + 1));
  }
  return n.byteLength !== r + 1 ? n.slice(0, r + 1) : n;
}
async function Of(e, t) {
  const { blockNumber: n, blockTag: r, coinType: s, name: o, gatewayUrls: i, strict: a } = t,
    { chain: c } = e,
    u = (() => {
      if (t.universalResolverAddress) return t.universalResolverAddress;
      if (!c) throw new Error('client chain not configured. universalResolverAddress is required.');
      return gt({
        blockNumber: n,
        chain: c,
        contract: 'ensUniversalResolver',
      });
    })(),
    f = c?.ensTlds;
  if (f && !f.some((l) => o.endsWith(l))) return null;
  const d = s != null ? [Qn(o), BigInt(s)] : [Qn(o)];
  try {
    const l = be({
        abi: os,
        functionName: 'addr',
        args: d,
      }),
      b = {
        address: u,
        abi: ro,
        functionName: 'resolveWithGateways',
        args: [Fe(zr(o)), l, i ?? [jt]],
        blockNumber: n,
        blockTag: r,
      },
      h = await L(e, de, 'readContract')(b);
    if (h[0] === '0x') return null;
    const w = Je({
      abi: os,
      args: d,
      functionName: 'addr',
      data: h[0],
    });
    return w === '0x' || Xt(w) === '0x00' ? null : w;
  } catch (l) {
    if (a) throw l;
    if (Fr(l)) return null;
    throw l;
  }
}
class Ff extends I {
  constructor({ data: t }) {
    super('Unable to extract image from metadata. The metadata may be malformed or invalid.', {
      metaMessages: [
        '- Metadata must be a JSON object with at least an `image`, `image_url` or `image_data` property.',
        '',
        `Provided data: ${JSON.stringify(t)}`,
      ],
      name: 'EnsAvatarInvalidMetadataError',
    });
  }
}
class Et extends I {
  constructor({ reason: t }) {
    super(`ENS NFT avatar URI is invalid. ${t}`, {
      name: 'EnsAvatarInvalidNftUriError',
    });
  }
}
class Lr extends I {
  constructor({ uri: t }) {
    super(
      `Unable to resolve ENS avatar URI "${t}". The URI may be malformed, invalid, or does not respond with a valid image.`,
      { name: 'EnsAvatarUriResolutionError' }
    );
  }
}
class zf extends I {
  constructor({ namespace: t }) {
    super(`ENS NFT avatar namespace "${t}" is not supported. Must be "erc721" or "erc1155".`, {
      name: 'EnsAvatarUnsupportedNamespaceError',
    });
  }
}
const Lf =
    /(?<protocol>https?:\/\/[^/]*|ipfs:\/|ipns:\/|ar:\/)?(?<root>\/)?(?<subpath>ipfs\/|ipns\/)?(?<target>[\w\-.]+)(?<subtarget>\/.*)?/,
  _f =
    /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})(\/(?<target>[\w\-.]+))?(?<subtarget>\/.*)?$/,
  Uf = /^data:([a-zA-Z\-/+]*);base64,([^"].*)/,
  Mf = /^data:([a-zA-Z\-/+]*)?(;[a-zA-Z0-9].*?)?(,)/;
async function jf(e) {
  try {
    const t = await fetch(e, { method: 'HEAD' });
    return t.status === 200 ? t.headers.get('content-type')?.startsWith('image/') : !1;
  } catch (t) {
    return (typeof t == 'object' && typeof t.response < 'u') || !Object.hasOwn(globalThis, 'Image')
      ? !1
      : new Promise((n) => {
          const r = new Image();
          ((r.onload = () => {
            n(!0);
          }),
            (r.onerror = () => {
              n(!1);
            }),
            (r.src = e));
        });
  }
}
function Ds(e, t) {
  return e ? (e.endsWith('/') ? e.slice(0, -1) : e) : t;
}
function Fi({ uri: e, gatewayUrls: t }) {
  const n = Uf.test(e);
  if (n) return { uri: e, isOnChain: !0, isEncoded: n };
  const r = Ds(t?.ipfs, 'https://ipfs.io'),
    s = Ds(t?.arweave, 'https://arweave.net'),
    o = e.match(Lf),
    { protocol: i, subpath: a, target: c, subtarget: u = '' } = o?.groups || {},
    f = i === 'ipns:/' || a === 'ipns/',
    d = i === 'ipfs:/' || a === 'ipfs/' || _f.test(e);
  if (e.startsWith('http') && !f && !d) {
    let b = e;
    return (
      t?.arweave && (b = e.replace(/https:\/\/arweave.net/g, t?.arweave)),
      { uri: b, isOnChain: !1, isEncoded: !1 }
    );
  }
  if ((f || d) && c)
    return {
      uri: `${r}/${f ? 'ipns' : 'ipfs'}/${c}${u}`,
      isOnChain: !1,
      isEncoded: !1,
    };
  if (i === 'ar:/' && c)
    return {
      uri: `${s}/${c}${u || ''}`,
      isOnChain: !1,
      isEncoded: !1,
    };
  let l = e.replace(Mf, '');
  if (
    (l.startsWith('<svg') && (l = `data:image/svg+xml;base64,${btoa(l)}`), l.startsWith('data:') || l.startsWith('{'))
  )
    return {
      uri: l,
      isOnChain: !0,
      isEncoded: !1,
    };
  throw new Lr({ uri: e });
}
function zi(e) {
  if (typeof e != 'object' || (!('image' in e) && !('image_url' in e) && !('image_data' in e)))
    throw new Ff({ data: e });
  return e.image || e.image_url || e.image_data;
}
async function Df({ gatewayUrls: e, uri: t }) {
  try {
    const n = await fetch(t).then((s) => s.json());
    return await _r({
      gatewayUrls: e,
      uri: zi(n),
    });
  } catch {
    throw new Lr({ uri: t });
  }
}
async function _r({ gatewayUrls: e, uri: t }) {
  const { uri: n, isOnChain: r } = Fi({ uri: t, gatewayUrls: e });
  if (r || (await jf(n))) return n;
  throw new Lr({ uri: t });
}
function Gf(e) {
  let t = e;
  t.startsWith('did:nft:') && (t = t.replace('did:nft:', '').replace(/_/g, '/'));
  const [n, r, s] = t.split('/'),
    [o, i] = n.split(':'),
    [a, c] = r.split(':');
  if (!o || o.toLowerCase() !== 'eip155') throw new Et({ reason: 'Only EIP-155 supported' });
  if (!i) throw new Et({ reason: 'Chain ID not found' });
  if (!c)
    throw new Et({
      reason: 'Contract address not found',
    });
  if (!s) throw new Et({ reason: 'Token ID not found' });
  if (!a) throw new Et({ reason: 'ERC namespace not found' });
  return {
    chainID: Number.parseInt(i, 10),
    namespace: a.toLowerCase(),
    contractAddress: c,
    tokenID: s,
  };
}
async function Hf(e, { nft: t }) {
  if (t.namespace === 'erc721')
    return de(e, {
      address: t.contractAddress,
      abi: [
        {
          name: 'tokenURI',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          outputs: [{ name: '', type: 'string' }],
        },
      ],
      functionName: 'tokenURI',
      args: [BigInt(t.tokenID)],
    });
  if (t.namespace === 'erc1155')
    return de(e, {
      address: t.contractAddress,
      abi: [
        {
          name: 'uri',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: '_id', type: 'uint256' }],
          outputs: [{ name: '', type: 'string' }],
        },
      ],
      functionName: 'uri',
      args: [BigInt(t.tokenID)],
    });
  throw new zf({ namespace: t.namespace });
}
async function qf(e, { gatewayUrls: t, record: n }) {
  return /eip155:/i.test(n) ? Vf(e, { gatewayUrls: t, record: n }) : _r({ uri: n, gatewayUrls: t });
}
async function Vf(e, { gatewayUrls: t, record: n }) {
  const r = Gf(n),
    s = await Hf(e, { nft: r }),
    { uri: o, isOnChain: i, isEncoded: a } = Fi({ uri: s, gatewayUrls: t });
  if (i && (o.includes('data:application/json;base64,') || o.startsWith('{'))) {
    const u = a
        ? // if it is encoded, decode it
          atob(o.replace('data:application/json;base64,', ''))
        : // if it isn't encoded assume it is a JSON string, but it could be anything (it will error if it is)
          o,
      f = JSON.parse(u);
    return _r({ uri: zi(f), gatewayUrls: t });
  }
  let c = r.tokenID;
  return (
    r.namespace === 'erc1155' && (c = c.replace('0x', '').padStart(64, '0')),
    Df({
      gatewayUrls: t,
      uri: o.replace(/(?:0x)?{id}/, c),
    })
  );
}
async function Li(e, t) {
  const { blockNumber: n, blockTag: r, key: s, name: o, gatewayUrls: i, strict: a } = t,
    { chain: c } = e,
    u = (() => {
      if (t.universalResolverAddress) return t.universalResolverAddress;
      if (!c) throw new Error('client chain not configured. universalResolverAddress is required.');
      return gt({
        blockNumber: n,
        chain: c,
        contract: 'ensUniversalResolver',
      });
    })(),
    f = c?.ensTlds;
  if (f && !f.some((d) => o.endsWith(d))) return null;
  try {
    const d = {
        address: u,
        abi: ro,
        args: [
          Fe(zr(o)),
          be({
            abi: is,
            functionName: 'text',
            args: [Qn(o), s],
          }),
          i ?? [jt],
        ],
        functionName: 'resolveWithGateways',
        blockNumber: n,
        blockTag: r,
      },
      b = await L(e, de, 'readContract')(d);
    if (b[0] === '0x') return null;
    const y = Je({
      abi: is,
      functionName: 'text',
      data: b[0],
    });
    return y === '' ? null : y;
  } catch (d) {
    if (a) throw d;
    if (Fr(d)) return null;
    throw d;
  }
}
async function Zf(
  e,
  { blockNumber: t, blockTag: n, assetGatewayUrls: r, name: s, gatewayUrls: o, strict: i, universalResolverAddress: a }
) {
  const c = await L(
    e,
    Li,
    'getEnsText'
  )({
    blockNumber: t,
    blockTag: n,
    key: 'avatar',
    name: s,
    universalResolverAddress: a,
    gatewayUrls: o,
    strict: i,
  });
  if (!c) return null;
  try {
    return await qf(e, {
      record: c,
      gatewayUrls: r,
    });
  } catch {
    return null;
  }
}
async function Wf(e, t) {
  const { address: n, blockNumber: r, blockTag: s, coinType: o = 60n, gatewayUrls: i, strict: a } = t,
    { chain: c } = e,
    u = (() => {
      if (t.universalResolverAddress) return t.universalResolverAddress;
      if (!c) throw new Error('client chain not configured. universalResolverAddress is required.');
      return gt({
        blockNumber: r,
        chain: c,
        contract: 'ensUniversalResolver',
      });
    })();
  try {
    const f = {
        address: u,
        abi: Ra,
        args: [n, o, i ?? [jt]],
        functionName: 'reverseWithGateways',
        blockNumber: r,
        blockTag: s,
      },
      d = L(e, de, 'readContract'),
      [l] = await d(f);
    return l || null;
  } catch (f) {
    if (a) throw f;
    if (Fr(f)) return null;
    throw f;
  }
}
async function Yf(e, t) {
  const { blockNumber: n, blockTag: r, name: s } = t,
    { chain: o } = e,
    i = (() => {
      if (t.universalResolverAddress) return t.universalResolverAddress;
      if (!o) throw new Error('client chain not configured. universalResolverAddress is required.');
      return gt({
        blockNumber: n,
        chain: o,
        contract: 'ensUniversalResolver',
      });
    })(),
    a = o?.ensTlds;
  if (a && !a.some((u) => s.endsWith(u)))
    throw new Error(`${s} is not a valid ENS TLD (${a?.join(', ')}) for chain "${o.name}" (id: ${o.id}).`);
  const [c] = await L(
    e,
    de,
    'readContract'
  )({
    address: i,
    abi: [
      {
        inputs: [{ type: 'bytes' }],
        name: 'findResolver',
        outputs: [{ type: 'address' }, { type: 'bytes32' }, { type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'findResolver',
    args: [Fe(zr(s))],
    blockNumber: n,
    blockTag: r,
  });
  return c;
}
async function _i(e, t) {
  const {
      account: n = e.account,
      blockNumber: r,
      blockTag: s = 'latest',
      blobs: o,
      data: i,
      gas: a,
      gasPrice: c,
      maxFeePerBlobGas: u,
      maxFeePerGas: f,
      maxPriorityFeePerGas: d,
      to: l,
      value: b,
      ...y
    } = t,
    h = n ? le(n) : void 0;
  try {
    Rt(t);
    const m = (typeof r == 'bigint' ? z(r) : void 0) || s,
      A = e.chain?.formatters?.transactionRequest?.format,
      p = (A || un)(
        {
          // Pick out extra data that might exist on the chain's transaction request type.
          ...xr(y, { format: A }),
          from: h?.address,
          blobs: o,
          data: i,
          gas: a,
          gasPrice: c,
          maxFeePerBlobGas: u,
          maxFeePerGas: f,
          maxPriorityFeePerGas: d,
          to: l,
          value: b,
        },
        'createAccessList'
      ),
      g = await e.request({
        method: 'eth_createAccessList',
        params: [p, m],
      });
    return {
      accessList: g.accessList,
      gasUsed: BigInt(g.gasUsed),
    };
  } catch (w) {
    throw Ti(w, {
      ...t,
      account: h,
      chain: e.chain,
    });
  }
}
async function Kf(e) {
  const t = on(e, {
      method: 'eth_newBlockFilter',
    }),
    n = await e.request({
      method: 'eth_newBlockFilter',
    });
  return { id: n, request: t(n), type: 'block' };
}
async function Ui(e, { address: t, args: n, event: r, events: s, fromBlock: o, strict: i, toBlock: a } = {}) {
  const c = s ?? (r ? [r] : void 0),
    u = on(e, {
      method: 'eth_newFilter',
    });
  let f = [];
  c &&
    ((f = [
      c.flatMap((b) =>
        Nt({
          abi: [b],
          eventName: b.name,
          args: n,
        })
      ),
    ]),
    r && (f = f[0]));
  const d = await e.request({
    method: 'eth_newFilter',
    params: [
      {
        address: t,
        fromBlock: typeof o == 'bigint' ? z(o) : o,
        toBlock: typeof a == 'bigint' ? z(a) : a,
        ...(f.length ? { topics: f } : {}),
      },
    ],
  });
  return {
    abi: c,
    args: n,
    eventName: r ? r.name : void 0,
    fromBlock: o,
    id: d,
    request: u(d),
    strict: !!i,
    toBlock: a,
    type: 'event',
  };
}
async function Mi(e) {
  const t = on(e, {
      method: 'eth_newPendingTransactionFilter',
    }),
    n = await e.request({
      method: 'eth_newPendingTransactionFilter',
    });
  return { id: n, request: t(n), type: 'transaction' };
}
async function Xf(e, { address: t, blockNumber: n, blockTag: r = e.experimental_blockTag ?? 'latest' }) {
  const s = typeof n == 'bigint' ? z(n) : void 0,
    o = await e.request({
      method: 'eth_getBalance',
      params: [t, s || r],
    });
  return BigInt(o);
}
async function Jf(e) {
  const t = await e.request({
    method: 'eth_blobBaseFee',
  });
  return BigInt(t);
}
async function Qf(e, { blockHash: t, blockNumber: n, blockTag: r = 'latest' } = {}) {
  const s = n !== void 0 ? z(n) : void 0;
  let o;
  return (
    t
      ? (o = await e.request(
          {
            method: 'eth_getBlockTransactionCountByHash',
            params: [t],
          },
          { dedupe: !0 }
        ))
      : (o = await e.request(
          {
            method: 'eth_getBlockTransactionCountByNumber',
            params: [s || r],
          },
          { dedupe: !!s }
        )),
    Ie(o)
  );
}
async function er(e, { address: t, blockNumber: n, blockTag: r = 'latest' }) {
  const s = n !== void 0 ? z(n) : void 0,
    o = await e.request(
      {
        method: 'eth_getCode',
        params: [t, s || r],
      },
      { dedupe: !!s }
    );
  if (o !== '0x') return o;
}
class ed extends I {
  constructor({ address: t }) {
    super(`No EIP-712 domain found on contract "${t}".`, {
      metaMessages: [
        'Ensure that:',
        `- The contract is deployed at the address "${t}".`,
        '- `eip712Domain()` function exists on the contract.',
        '- `eip712Domain()` function matches signature to ERC-5267 specification.',
      ],
      name: 'Eip712DomainNotFoundError',
    });
  }
}
async function td(e, t) {
  const { address: n, factory: r, factoryData: s } = t;
  try {
    const [o, i, a, c, u, f, d] = await L(
      e,
      de,
      'readContract'
    )({
      abi: nd,
      address: n,
      functionName: 'eip712Domain',
      factory: r,
      factoryData: s,
    });
    return {
      domain: {
        name: i,
        version: a,
        chainId: Number(c),
        verifyingContract: u,
        salt: f,
      },
      extensions: d,
      fields: o,
    };
  } catch (o) {
    const i = o;
    throw i.name === 'ContractFunctionExecutionError' && i.cause.name === 'ContractFunctionZeroDataError'
      ? new ed({ address: n })
      : i;
  }
}
const nd = [
  {
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', type: 'bytes1' },
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
      { name: 'salt', type: 'bytes32' },
      { name: 'extensions', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
function rd(e) {
  return {
    baseFeePerGas: e.baseFeePerGas.map((t) => BigInt(t)),
    gasUsedRatio: e.gasUsedRatio,
    oldestBlock: BigInt(e.oldestBlock),
    reward: e.reward?.map((t) => t.map((n) => BigInt(n))),
  };
}
async function sd(e, { blockCount: t, blockNumber: n, blockTag: r = 'latest', rewardPercentiles: s }) {
  const o = typeof n == 'bigint' ? z(n) : void 0,
    i = await e.request(
      {
        method: 'eth_feeHistory',
        params: [z(t), o || r, s],
      },
      { dedupe: !!o }
    );
  return rd(i);
}
async function od(e, { filter: t }) {
  const n = t.strict ?? !1,
    s = (
      await t.request({
        method: 'eth_getFilterLogs',
        params: [t.id],
      })
    ).map((o) => Te(o));
  return t.abi
    ? Ir({
        abi: t.abi,
        logs: s,
        strict: n,
      })
    : s;
}
async function id({ address: e, authorization: t, signature: n }) {
  return Ot(
    Co(e),
    await Xo({
      authorization: t,
      signature: n,
    })
  );
}
class ad extends I {
  constructor({ callbackSelector: t, cause: n, data: r, extraData: s, sender: o, urls: i }) {
    super(n.shortMessage || 'An error occurred while fetching for an offchain result.', {
      cause: n,
      metaMessages: [
        ...(n.metaMessages || []),
        n.metaMessages?.length ? '' : [],
        'Offchain Gateway Call:',
        i && ['  Gateway URL(s):', ...i.map((a) => `    ${so(a)}`)],
        `  Sender: ${o}`,
        `  Data: ${r}`,
        `  Callback selector: ${t}`,
        `  Extra data: ${s}`,
      ].flat(),
      name: 'OffchainLookupError',
    });
  }
}
class cd extends I {
  constructor({ result: t, url: n }) {
    super('Offchain gateway response is malformed. Response data must be a hex value.', {
      metaMessages: [`Gateway URL: ${so(n)}`, `Response: ${se(t)}`],
      name: 'OffchainLookupResponseMalformedError',
    });
  }
}
class ud extends I {
  constructor({ sender: t, to: n }) {
    super('Reverted sender address does not match target contract address (`to`).', {
      metaMessages: [`Contract address: ${n}`, `OffchainLookup sender address: ${t}`],
      name: 'OffchainLookupSenderMismatchError',
    });
  }
}
const fd = '0x556f1830',
  ji = {
    name: 'OffchainLookup',
    type: 'error',
    inputs: [
      {
        name: 'sender',
        type: 'address',
      },
      {
        name: 'urls',
        type: 'string[]',
      },
      {
        name: 'callData',
        type: 'bytes',
      },
      {
        name: 'callbackFunction',
        type: 'bytes4',
      },
      {
        name: 'extraData',
        type: 'bytes',
      },
    ],
  };
async function dd(e, { blockNumber: t, blockTag: n, data: r, to: s }) {
  const { args: o } = jo({
      data: r,
      abi: [ji],
    }),
    [i, a, c, u, f] = o,
    { ccipRead: d } = e,
    l = d && typeof d?.request == 'function' ? d.request : Di;
  try {
    if (!Ot(s, i)) throw new ud({ sender: i, to: s });
    const b = a.includes(jt)
        ? await Ri({
            data: c,
            ccipRequest: l,
          })
        : await l({ data: c, sender: i, urls: a }),
      { data: y } = await _t(e, {
        blockNumber: t,
        blockTag: n,
        data: ce([u, _e([{ type: 'bytes' }, { type: 'bytes' }], [b, f])]),
        to: s,
      });
    return y;
  } catch (b) {
    throw new ad({
      callbackSelector: u,
      cause: b,
      data: r,
      extraData: f,
      sender: i,
      urls: a,
    });
  }
}
async function Di({ data: e, sender: t, urls: n }) {
  let r = new Error('An unknown error occurred.');
  for (let s = 0; s < n.length; s++) {
    const o = n[s],
      i = o.includes('{data}') ? 'GET' : 'POST',
      a = i === 'POST' ? { data: e, sender: t } : void 0,
      c = i === 'POST' ? { 'Content-Type': 'application/json' } : {};
    try {
      const u = await fetch(o.replace('{sender}', t.toLowerCase()).replace('{data}', e), {
        body: JSON.stringify(a),
        headers: c,
        method: i,
      });
      let f;
      if (
        (u.headers.get('Content-Type')?.startsWith('application/json')
          ? (f = (await u.json()).data)
          : (f = await u.text()),
        !u.ok)
      ) {
        r = new as({
          body: a,
          details: f?.error ? se(f.error) : u.statusText,
          headers: u.headers,
          status: u.status,
          url: o,
        });
        continue;
      }
      if (!ge(f)) {
        r = new cd({
          result: f,
          url: o,
        });
        continue;
      }
      return f;
    } catch (u) {
      r = new as({
        body: a,
        details: u.message,
        url: o,
      });
    }
  }
  throw r;
}
const ld = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.defineProperty(
    {
      __proto__: null,
      ccipRequest: Di,
      offchainLookup: dd,
      offchainLookupAbiItem: ji,
      offchainLookupSignature: fd,
    },
    Symbol.toStringTag,
    { value: 'Module' }
  )
);
function O1(e) {
  return {
    formatters: void 0,
    fees: void 0,
    serializers: void 0,
    ...e,
  };
}
const bd = `Ethereum Signed Message:
`;
function hd(e) {
  const t = typeof e == 'string' ? Un(e) : typeof e.raw == 'string' ? e.raw : V(e.raw),
    n = Un(`${bd}${G(t)}`);
  return ce([n, t]);
}
function Gi(e, t) {
  return q(hd(e), t);
}
class pd extends I {
  constructor({ domain: t }) {
    super(`Invalid domain "${se(t)}".`, {
      metaMessages: ['Must be a valid EIP-712 domain.'],
    });
  }
}
class yd extends I {
  constructor({ primaryType: t, types: n }) {
    super(`Invalid primary type \`${t}\` must be one of \`${JSON.stringify(Object.keys(n))}\`.`, {
      docsPath: '/api/glossary/Errors#typeddatainvalidprimarytypeerror',
      metaMessages: ['Check that the primary type is a key in `types`.'],
    });
  }
}
class md extends I {
  constructor({ type: t }) {
    super(`Struct type "${t}" is invalid.`, {
      metaMessages: ['Struct type must not be a Solidity type.'],
      name: 'InvalidStructTypeError',
    });
  }
}
function gd(e) {
  const { domain: t, message: n, primaryType: r, types: s } = e,
    o = (i, a) => {
      for (const c of i) {
        const { name: u, type: f } = c,
          d = a[u],
          l = f.match(zo);
        if (l && (typeof d == 'number' || typeof d == 'bigint')) {
          const [h, w, m] = l;
          z(d, {
            signed: w === 'int',
            size: Number.parseInt(m, 10) / 8,
          });
        }
        if (f === 'address' && typeof d == 'string' && !oe(d)) throw new ze({ address: d });
        const b = f.match(m0);
        if (b) {
          const [h, w] = b;
          if (w && G(d) !== Number.parseInt(w, 10))
            throw new Cc({
              expectedSize: Number.parseInt(w, 10),
              givenSize: G(d),
            });
        }
        const y = s[f];
        y && (xd(f), o(y, d));
      }
    };
  if (s.EIP712Domain && t) {
    if (typeof t != 'object') throw new pd({ domain: t });
    o(s.EIP712Domain, t);
  }
  if (r !== 'EIP712Domain')
    if (s[r]) o(s[r], n);
    else throw new yd({ primaryType: r, types: s });
}
function wd({ domain: e }) {
  return [
    typeof e?.name == 'string' && { name: 'name', type: 'string' },
    e?.version && { name: 'version', type: 'string' },
    (typeof e?.chainId == 'number' || typeof e?.chainId == 'bigint') && {
      name: 'chainId',
      type: 'uint256',
    },
    e?.verifyingContract && {
      name: 'verifyingContract',
      type: 'address',
    },
    e?.salt && { name: 'salt', type: 'bytes32' },
  ].filter(Boolean);
}
function xd(e) {
  if (
    e === 'address' ||
    e === 'bool' ||
    e === 'string' ||
    e.startsWith('bytes') ||
    e.startsWith('uint') ||
    e.startsWith('int')
  )
    throw new md({ type: e });
}
function vd(e) {
  const { domain: t = {}, message: n, primaryType: r } = e,
    s = {
      EIP712Domain: wd({ domain: t }),
      ...e.types,
    };
  gd({
    domain: t,
    message: n,
    primaryType: r,
    types: s,
  });
  const o = ['0x1901'];
  return (
    t &&
      o.push(
        Ed({
          domain: t,
          types: s,
        })
      ),
    r !== 'EIP712Domain' &&
      o.push(
        Hi({
          data: n,
          primaryType: r,
          types: s,
        })
      ),
    q(ce(o))
  );
}
function Ed({ domain: e, types: t }) {
  return Hi({
    data: e,
    primaryType: 'EIP712Domain',
    types: t,
  });
}
function Hi({ data: e, primaryType: t, types: n }) {
  const r = qi({
    data: e,
    primaryType: t,
    types: n,
  });
  return q(r);
}
function qi({ data: e, primaryType: t, types: n }) {
  const r = [{ type: 'bytes32' }],
    s = [Pd({ primaryType: t, types: n })];
  for (const o of n[t]) {
    const [i, a] = Zi({
      types: n,
      name: o.name,
      type: o.type,
      value: e[o.name],
    });
    (r.push(i), s.push(a));
  }
  return _e(r, s);
}
function Pd({ primaryType: e, types: t }) {
  const n = Fe(Ad({ primaryType: e, types: t }));
  return q(n);
}
function Ad({ primaryType: e, types: t }) {
  let n = '';
  const r = Vi({ primaryType: e, types: t });
  r.delete(e);
  const s = [e, ...Array.from(r).sort()];
  for (const o of s) n += `${o}(${t[o].map(({ name: i, type: a }) => `${a} ${i}`).join(',')})`;
  return n;
}
function Vi({ primaryType: e, types: t }, n = /* @__PURE__ */ new Set()) {
  const s = e.match(/^\w*/u)?.[0];
  if (n.has(s) || t[s] === void 0) return n;
  n.add(s);
  for (const o of t[s]) Vi({ primaryType: o.type, types: t }, n);
  return n;
}
function Zi({ types: e, name: t, type: n, value: r }) {
  if (e[n] !== void 0) return [{ type: 'bytes32' }, q(qi({ data: r, primaryType: n, types: e }))];
  if (n === 'bytes') return ((r = `0x${(r.length % 2 ? '0' : '') + r.slice(2)}`), [{ type: 'bytes32' }, q(r)]);
  if (n === 'string') return [{ type: 'bytes32' }, q(Fe(r))];
  if (n.lastIndexOf(']') === n.length - 1) {
    const s = n.slice(0, n.lastIndexOf('[')),
      o = r.map((i) =>
        Zi({
          name: t,
          type: s,
          types: e,
          value: i,
        })
      );
    return [
      { type: 'bytes32' },
      q(
        _e(
          o.map(([i]) => i),
          o.map(([, i]) => i)
        )
      ),
    ];
  }
  return [{ type: n }, r];
}
class Bd extends Map {
  constructor(t) {
    (super(),
      Object.defineProperty(this, 'maxSize', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0,
      }),
      (this.maxSize = t));
  }
  get(t) {
    const n = super.get(t);
    return (super.has(t) && n !== void 0 && (this.delete(t), super.set(t, n)), n);
  }
  set(t, n) {
    if ((super.set(t, n), this.maxSize && this.size > this.maxSize)) {
      const r = this.keys().next().value;
      r && this.delete(r);
    }
    return this;
  }
}
const $d = {
    checksum: /* @__PURE__ */ new Bd(8192),
  },
  Nn = $d.checksum;
function Wi(e, t = {}) {
  const { as: n = typeof e == 'string' ? 'Hex' : 'Bytes' } = t,
    r = To(Hu(e));
  return n === 'Bytes' ? r : fe(r);
}
const Id = /^0x[a-fA-F0-9]{40}$/;
function pn(e, t = {}) {
  const { strict: n = !0 } = t;
  if (!Id.test(e))
    throw new Gs({
      address: e,
      cause: new Sd(),
    });
  if (n) {
    if (e.toLowerCase() === e) return;
    if (Yi(e) !== e)
      throw new Gs({
        address: e,
        cause: new kd(),
      });
  }
}
function Yi(e) {
  if (Nn.has(e)) return Nn.get(e);
  pn(e, { strict: !1 });
  const t = e.substring(2).toLowerCase(),
    n = Wi(Vu(t), { as: 'Bytes' }),
    r = t.split('');
  for (let o = 0; o < 40; o += 2)
    (n[o >> 1] >> 4 >= 8 && r[o] && (r[o] = r[o].toUpperCase()),
      (n[o >> 1] & 15) >= 8 && r[o + 1] && (r[o + 1] = r[o + 1].toUpperCase()));
  const s = `0x${r.join('')}`;
  return (Nn.set(e, s), s);
}
function tr(e, t = {}) {
  const { strict: n = !0 } = t ?? {};
  try {
    return (pn(e, { strict: n }), !0);
  } catch {
    return !1;
  }
}
class Gs extends U {
  constructor({ address: t, cause: n }) {
    (super(`Address "${t}" is invalid.`, {
      cause: n,
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Address.InvalidAddressError',
      }));
  }
}
class Sd extends U {
  constructor() {
    (super('Address is not a 20 byte (40 hexadecimal character) value.'),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Address.InvalidInputError',
      }));
  }
}
class kd extends U {
  constructor() {
    (super('Address does not match its checksum counterpart.'),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Address.InvalidChecksumError',
      }));
  }
}
const Td = /^(.*)\[([0-9]*)\]$/,
  Nd = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/,
  Ki =
    /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/,
  Hs = 2n ** 256n - 1n;
function ut(e, t, n) {
  const { checksumAddress: r, staticPosition: s } = n,
    o = jr(t.type);
  if (o) {
    const [i, a] = o;
    return Rd(e, { ...t, type: a }, { checksumAddress: r, length: i, staticPosition: s });
  }
  if (t.type === 'tuple')
    return Ld(e, t, {
      checksumAddress: r,
      staticPosition: s,
    });
  if (t.type === 'address') return Cd(e, { checksum: r });
  if (t.type === 'bool') return Od(e);
  if (t.type.startsWith('bytes')) return Fd(e, t, { staticPosition: s });
  if (t.type.startsWith('uint') || t.type.startsWith('int')) return zd(e, t);
  if (t.type === 'string') return _d(e, { staticPosition: s });
  throw new Gr(t.type);
}
const qs = 32,
  nr = 32;
function Cd(e, t = {}) {
  const { checksum: n = !1 } = t,
    r = e.readBytes(32);
  return [((o) => (n ? Yi(o) : o))(fe(Wu(r, -20))), 32];
}
function Rd(e, t, n) {
  const { checksumAddress: r, length: s, staticPosition: o } = n;
  if (!s) {
    const c = $e(e.readBytes(nr)),
      u = o + c,
      f = u + qs;
    e.setPosition(u);
    const d = $e(e.readBytes(qs)),
      l = St(t);
    let b = 0;
    const y = [];
    for (let h = 0; h < d; ++h) {
      e.setPosition(f + (l ? h * 32 : b));
      const [w, m] = ut(e, t, {
        checksumAddress: r,
        staticPosition: f,
      });
      ((b += m), y.push(w));
    }
    return (e.setPosition(o + 32), [y, 32]);
  }
  if (St(t)) {
    const c = $e(e.readBytes(nr)),
      u = o + c,
      f = [];
    for (let d = 0; d < s; ++d) {
      e.setPosition(u + d * 32);
      const [l] = ut(e, t, {
        checksumAddress: r,
        staticPosition: u,
      });
      f.push(l);
    }
    return (e.setPosition(o + 32), [f, 32]);
  }
  let i = 0;
  const a = [];
  for (let c = 0; c < s; ++c) {
    const [u, f] = ut(e, t, {
      checksumAddress: r,
      staticPosition: o + i,
    });
    ((i += f), a.push(u));
  }
  return [a, i];
}
function Od(e) {
  return [Ku(e.readBytes(32), { size: 32 }), 32];
}
function Fd(e, t, { staticPosition: n }) {
  const [r, s] = t.type.split('bytes');
  if (!s) {
    const i = $e(e.readBytes(32));
    e.setPosition(n + i);
    const a = $e(e.readBytes(32));
    if (a === 0) return (e.setPosition(n + 32), ['0x', 32]);
    const c = e.readBytes(a);
    return (e.setPosition(n + 32), [fe(c), 32]);
  }
  return [fe(e.readBytes(Number.parseInt(s, 10), 32)), 32];
}
function zd(e, t) {
  const n = t.type.startsWith('int'),
    r = Number.parseInt(t.type.split('int')[1] || '256', 10),
    s = e.readBytes(32);
  return [r > 48 ? Yu(s, { signed: n }) : $e(s, { signed: n }), 32];
}
function Ld(e, t, n) {
  const { checksumAddress: r, staticPosition: s } = n,
    o = t.components.length === 0 || t.components.some(({ name: c }) => !c),
    i = o ? [] : {};
  let a = 0;
  if (St(t)) {
    const c = $e(e.readBytes(nr)),
      u = s + c;
    for (let f = 0; f < t.components.length; ++f) {
      const d = t.components[f];
      e.setPosition(u + a);
      const [l, b] = ut(e, d, {
        checksumAddress: r,
        staticPosition: u,
      });
      ((a += b), (i[o ? f : d?.name] = l));
    }
    return (e.setPosition(s + 32), [i, 32]);
  }
  for (let c = 0; c < t.components.length; ++c) {
    const u = t.components[c],
      [f, d] = ut(e, u, {
        checksumAddress: r,
        staticPosition: s,
      });
    ((i[o ? c : u?.name] = f), (a += d));
  }
  return [i, a];
}
function _d(e, { staticPosition: t }) {
  const n = $e(e.readBytes(32)),
    r = t + n;
  e.setPosition(r);
  const s = $e(e.readBytes(32));
  if (s === 0) return (e.setPosition(t + 32), ['', 32]);
  const o = e.readBytes(s, 32),
    i = Xu(vi(o));
  return (e.setPosition(t + 32), [i, 32]);
}
function Ud({ checksumAddress: e, parameters: t, values: n }) {
  const r = [];
  for (let s = 0; s < t.length; s++)
    r.push(
      Ur({
        checksumAddress: e,
        parameter: t[s],
        value: n[s],
      })
    );
  return r;
}
function Ur({ checksumAddress: e = !1, parameter: t, value: n }) {
  const r = t,
    s = jr(r.type);
  if (s) {
    const [o, i] = s;
    return jd(n, {
      checksumAddress: e,
      length: o,
      parameter: {
        ...r,
        type: i,
      },
    });
  }
  if (r.type === 'tuple')
    return Vd(n, {
      checksumAddress: e,
      parameter: r,
    });
  if (r.type === 'address')
    return Md(n, {
      checksum: e,
    });
  if (r.type === 'bool') return Gd(n);
  if (r.type.startsWith('uint') || r.type.startsWith('int')) {
    const o = r.type.startsWith('int'),
      [, , i = '256'] = Ki.exec(r.type) ?? [];
    return Hd(n, {
      signed: o,
      size: Number(i),
    });
  }
  if (r.type.startsWith('bytes')) return Dd(n, { type: r.type });
  if (r.type === 'string') return qd(n);
  throw new Gr(r.type);
}
function Mr(e) {
  let t = 0;
  for (let o = 0; o < e.length; o++) {
    const { dynamic: i, encoded: a } = e[o];
    i ? (t += 32) : (t += te(a));
  }
  const n = [],
    r = [];
  let s = 0;
  for (let o = 0; o < e.length; o++) {
    const { dynamic: i, encoded: a } = e[o];
    i ? (n.push(W(t + s, { size: 32 })), r.push(a), (s += te(a))) : n.push(a);
  }
  return ue(...n, ...r);
}
function Md(e, t) {
  const { checksum: n = !1 } = t;
  return (
    pn(e, { strict: n }),
    {
      dynamic: !1,
      encoded: Ze(e.toLowerCase()),
    }
  );
}
function jd(e, t) {
  const { checksumAddress: n, length: r, parameter: s } = t,
    o = r === null;
  if (!Array.isArray(e)) throw new tl(e);
  if (!o && e.length !== r)
    throw new el({
      expectedLength: r,
      givenLength: e.length,
      type: `${s.type}[${r}]`,
    });
  let i = !1;
  const a = [];
  for (let c = 0; c < e.length; c++) {
    const u = Ur({
      checksumAddress: n,
      parameter: s,
      value: e[c],
    });
    (u.dynamic && (i = !0), a.push(u));
  }
  if (o || i) {
    const c = Mr(a);
    if (o) {
      const u = W(a.length, { size: 32 });
      return {
        dynamic: !0,
        encoded: a.length > 0 ? ue(u, c) : u,
      };
    }
    if (i) return { dynamic: !0, encoded: c };
  }
  return {
    dynamic: !1,
    encoded: ue(...a.map(({ encoded: c }) => c)),
  };
}
function Dd(e, { type: t }) {
  const [, n] = t.split('bytes'),
    r = te(e);
  if (!n) {
    let s = e;
    return (
      r % 32 !== 0 && (s = We(s, Math.ceil((e.length - 2) / 2 / 32) * 32)),
      {
        dynamic: !0,
        encoded: ue(Ze(W(r, { size: 32 })), s),
      }
    );
  }
  if (r !== Number.parseInt(n, 10))
    throw new Ji({
      expectedSize: Number.parseInt(n, 10),
      value: e,
    });
  return { dynamic: !1, encoded: We(e) };
}
function Gd(e) {
  if (typeof e != 'boolean')
    throw new U(`Invalid boolean value: "${e}" (type: ${typeof e}). Expected: \`true\` or \`false\`.`);
  return { dynamic: !1, encoded: Ze(Ei(e)) };
}
function Hd(e, { signed: t, size: n }) {
  if (typeof n == 'number') {
    const r = 2n ** (BigInt(n) - (t ? 1n : 0n)) - 1n,
      s = t ? -r - 1n : 0n;
    if (e > r || e < s)
      throw new Bi({
        max: r.toString(),
        min: s.toString(),
        signed: t,
        size: n / 8,
        value: e.toString(),
      });
  }
  return {
    dynamic: !1,
    encoded: W(e, {
      size: 32,
      signed: t,
    }),
  };
}
function qd(e) {
  const t = Cr(e),
    n = Math.ceil(te(t) / 32),
    r = [];
  for (let s = 0; s < n; s++) r.push(We(me(t, s * 32, (s + 1) * 32)));
  return {
    dynamic: !0,
    encoded: ue(We(W(te(t), { size: 32 })), ...r),
  };
}
function Vd(e, t) {
  const { checksumAddress: n, parameter: r } = t;
  let s = !1;
  const o = [];
  for (let i = 0; i < r.components.length; i++) {
    const a = r.components[i],
      c = Array.isArray(e) ? i : a.name,
      u = Ur({
        checksumAddress: n,
        parameter: a,
        value: e[c],
      });
    (o.push(u), u.dynamic && (s = !0));
  }
  return {
    dynamic: s,
    encoded: s ? Mr(o) : ue(...o.map(({ encoded: i }) => i)),
  };
}
function jr(e) {
  const t = e.match(/^(.*)\[(\d+)?\]$/);
  return t
    ? // Return `null` if the array is dynamic.
      [t[2] ? Number(t[2]) : null, t[1]]
    : void 0;
}
function St(e) {
  const { type: t } = e;
  if (t === 'string' || t === 'bytes' || t.endsWith('[]')) return !0;
  if (t === 'tuple') return e.components?.some(St);
  const n = jr(e.type);
  return !!(
    n &&
    St({
      ...e,
      type: n[1],
    })
  );
}
const Zd = {
  bytes: new Uint8Array(),
  dataView: new DataView(new ArrayBuffer(0)),
  position: 0,
  positionReadCount: /* @__PURE__ */ new Map(),
  recursiveReadCount: 0,
  recursiveReadLimit: Number.POSITIVE_INFINITY,
  assertReadLimit() {
    if (this.recursiveReadCount >= this.recursiveReadLimit)
      throw new Kd({
        count: this.recursiveReadCount + 1,
        limit: this.recursiveReadLimit,
      });
  },
  assertPosition(e) {
    if (e < 0 || e > this.bytes.length - 1)
      throw new Yd({
        length: this.bytes.length,
        position: e,
      });
  },
  decrementPosition(e) {
    if (e < 0) throw new Vs({ offset: e });
    const t = this.position - e;
    (this.assertPosition(t), (this.position = t));
  },
  getReadCount(e) {
    return this.positionReadCount.get(e || this.position) || 0;
  },
  incrementPosition(e) {
    if (e < 0) throw new Vs({ offset: e });
    const t = this.position + e;
    (this.assertPosition(t), (this.position = t));
  },
  inspectByte(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t), this.bytes[t]);
  },
  inspectBytes(e, t) {
    const n = t ?? this.position;
    return (this.assertPosition(n + e - 1), this.bytes.subarray(n, n + e));
  },
  inspectUint8(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t), this.bytes[t]);
  },
  inspectUint16(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t + 1), this.dataView.getUint16(t));
  },
  inspectUint24(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t + 2), (this.dataView.getUint16(t) << 8) + this.dataView.getUint8(t + 2));
  },
  inspectUint32(e) {
    const t = e ?? this.position;
    return (this.assertPosition(t + 3), this.dataView.getUint32(t));
  },
  pushByte(e) {
    (this.assertPosition(this.position), (this.bytes[this.position] = e), this.position++);
  },
  pushBytes(e) {
    (this.assertPosition(this.position + e.length - 1), this.bytes.set(e, this.position), (this.position += e.length));
  },
  pushUint8(e) {
    (this.assertPosition(this.position), (this.bytes[this.position] = e), this.position++);
  },
  pushUint16(e) {
    (this.assertPosition(this.position + 1), this.dataView.setUint16(this.position, e), (this.position += 2));
  },
  pushUint24(e) {
    (this.assertPosition(this.position + 2),
      this.dataView.setUint16(this.position, e >> 8),
      this.dataView.setUint8(this.position + 2, e & 255),
      (this.position += 3));
  },
  pushUint32(e) {
    (this.assertPosition(this.position + 3), this.dataView.setUint32(this.position, e), (this.position += 4));
  },
  readByte() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectByte();
    return (this.position++, e);
  },
  readBytes(e, t) {
    (this.assertReadLimit(), this._touch());
    const n = this.inspectBytes(e);
    return ((this.position += t ?? e), n);
  },
  readUint8() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectUint8();
    return ((this.position += 1), e);
  },
  readUint16() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectUint16();
    return ((this.position += 2), e);
  },
  readUint24() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectUint24();
    return ((this.position += 3), e);
  },
  readUint32() {
    (this.assertReadLimit(), this._touch());
    const e = this.inspectUint32();
    return ((this.position += 4), e);
  },
  get remaining() {
    return this.bytes.length - this.position;
  },
  setPosition(e) {
    const t = this.position;
    return (this.assertPosition(e), (this.position = e), () => (this.position = t));
  },
  _touch() {
    if (this.recursiveReadLimit === Number.POSITIVE_INFINITY) return;
    const e = this.getReadCount();
    (this.positionReadCount.set(this.position, e + 1), e > 0 && this.recursiveReadCount++);
  },
};
function Wd(e, { recursiveReadLimit: t = 8192 } = {}) {
  const n = Object.create(Zd);
  return (
    (n.bytes = e),
    (n.dataView = new DataView(e.buffer, e.byteOffset, e.byteLength)),
    (n.positionReadCount = /* @__PURE__ */ new Map()),
    (n.recursiveReadLimit = t),
    n
  );
}
class Vs extends U {
  constructor({ offset: t }) {
    (super(`Offset \`${t}\` cannot be negative.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Cursor.NegativeOffsetError',
      }));
  }
}
class Yd extends U {
  constructor({ length: t, position: n }) {
    (super(`Position \`${n}\` is out of bounds (\`0 < position < ${t}\`).`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Cursor.PositionOutOfBoundsError',
      }));
  }
}
class Kd extends U {
  constructor({ count: t, limit: n }) {
    (super(`Recursive read limit of \`${n}\` exceeded (recursive read count: \`${t}\`).`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Cursor.RecursiveReadLimitExceededError',
      }));
  }
}
function Xd(e, t, n = {}) {
  const { as: r = 'Array', checksumAddress: s = !1 } = n,
    o = typeof t == 'string' ? xi(t) : t,
    i = Wd(o);
  if (ot(o) === 0 && e.length > 0) throw new Qd();
  if (ot(o) && ot(o) < 32)
    throw new Jd({
      data: typeof t == 'string' ? t : fe(t),
      parameters: e,
      size: ot(o),
    });
  let a = 0;
  const c = r === 'Array' ? [] : {};
  for (let u = 0; u < e.length; ++u) {
    const f = e[u];
    i.setPosition(a);
    const [d, l] = ut(i, f, {
      checksumAddress: s,
      staticPosition: 0,
    });
    ((a += l), r === 'Array' ? c.push(d) : (c[f.name ?? u] = d));
  }
  return c;
}
function Dr(e, t, n) {
  const { checksumAddress: r = !1 } = {};
  if (e.length !== t.length)
    throw new Qi({
      expectedLength: e.length,
      givenLength: t.length,
    });
  const s = Ud({
      checksumAddress: r,
      parameters: e,
      values: t,
    }),
    o = Mr(s);
  return o.length === 0 ? '0x' : o;
}
function rr(e, t) {
  if (e.length !== t.length)
    throw new Qi({
      expectedLength: e.length,
      givenLength: t.length,
    });
  const n = [];
  for (let r = 0; r < e.length; r++) {
    const s = e[r],
      o = t[r];
    n.push(rr.encode(s, o));
  }
  return ue(...n);
}
(function (e) {
  function t(n, r, s = !1) {
    if (n === 'address') {
      const c = r;
      return (pn(c), Ze(c.toLowerCase(), s ? 32 : 0));
    }
    if (n === 'string') return Cr(r);
    if (n === 'bytes') return r;
    if (n === 'bool') return Ze(Ei(r), s ? 32 : 1);
    const o = n.match(Ki);
    if (o) {
      const [c, u, f = '256'] = o,
        d = Number.parseInt(f, 10) / 8;
      return W(r, {
        size: s ? 32 : d,
        signed: u === 'int',
      });
    }
    const i = n.match(Nd);
    if (i) {
      const [c, u] = i;
      if (Number.parseInt(u, 10) !== (r.length - 2) / 2)
        throw new Ji({
          expectedSize: Number.parseInt(u, 10),
          value: r,
        });
      return We(r, s ? 32 : 0);
    }
    const a = n.match(Td);
    if (a && Array.isArray(r)) {
      const [c, u] = a,
        f = [];
      for (let d = 0; d < r.length; d++) f.push(t(u, r[d], !0));
      return f.length === 0 ? '0x' : ue(...f);
    }
    throw new Gr(n);
  }
  e.encode = t;
})(rr || (rr = {}));
function Xi(e) {
  return (Array.isArray(e) && typeof e[0] == 'string') || typeof e == 'string' ? bs(e) : e;
}
class Jd extends U {
  constructor({ data: t, parameters: n, size: r }) {
    (super(`Data size of ${r} bytes is too small for given parameters.`, {
      metaMessages: [`Params: (${st(n)})`, `Data:   ${t} (${r} bytes)`],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiParameters.DataSizeTooSmallError',
      }));
  }
}
class Qd extends U {
  constructor() {
    (super('Cannot decode zero data ("0x") with ABI parameters.'),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiParameters.ZeroDataError',
      }));
  }
}
class el extends U {
  constructor({ expectedLength: t, givenLength: n, type: r }) {
    (super(`Array length mismatch for type \`${r}\`. Expected: \`${t}\`. Given: \`${n}\`.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiParameters.ArrayLengthMismatchError',
      }));
  }
}
class Ji extends U {
  constructor({ expectedSize: t, value: n }) {
    (super(`Size of bytes "${n}" (bytes${te(n)}) does not match expected size (bytes${t}).`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiParameters.BytesSizeMismatchError',
      }));
  }
}
class Qi extends U {
  constructor({ expectedLength: t, givenLength: n }) {
    (super(
      [
        'ABI encoding parameters/values length mismatch.',
        `Expected length (parameters): ${t}`,
        `Given length (values): ${n}`,
      ].join(`
`)
    ),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiParameters.LengthMismatchError',
      }));
  }
}
class tl extends U {
  constructor(t) {
    (super(`Value \`${t}\` is not a valid array.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiParameters.InvalidArrayError',
      }));
  }
}
class Gr extends U {
  constructor(t) {
    (super(`Type \`${t}\` is not a valid ABI Type.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiParameters.InvalidTypeError',
      }));
  }
}
class ea extends br {
  constructor(t, n) {
    (super(), (this.finished = !1), (this.destroyed = !1), Zc(t));
    const r = nn(n);
    if (((this.iHash = t.create()), typeof this.iHash.update != 'function'))
      throw new Error('Expected instance of class which extends utils.Hash');
    ((this.blockLen = this.iHash.blockLen), (this.outputLen = this.iHash.outputLen));
    const s = this.blockLen,
      o = new Uint8Array(s);
    o.set(r.length > s ? t.create().update(r).digest() : r);
    for (let i = 0; i < o.length; i++) o[i] ^= 54;
    (this.iHash.update(o), (this.oHash = t.create()));
    for (let i = 0; i < o.length; i++) o[i] ^= 106;
    (this.oHash.update(o), lt(o));
  }
  update(t) {
    return (dt(this), this.iHash.update(t), this);
  }
  digestInto(t) {
    (dt(this),
      Ve(t, this.outputLen),
      (this.finished = !0),
      this.iHash.digestInto(t),
      this.oHash.update(t),
      this.oHash.digestInto(t),
      this.destroy());
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return (this.digestInto(t), t);
  }
  _cloneInto(t) {
    t || (t = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: s, destroyed: o, blockLen: i, outputLen: a } = this;
    return (
      (t = t),
      (t.finished = s),
      (t.destroyed = o),
      (t.blockLen = i),
      (t.outputLen = a),
      (t.oHash = n._cloneInto(t.oHash)),
      (t.iHash = r._cloneInto(t.iHash)),
      t
    );
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    ((this.destroyed = !0), this.oHash.destroy(), this.iHash.destroy());
  }
}
const ta = (e, t, n) => new ea(e, t).update(n).digest();
ta.create = (e, t) => new ea(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const J = BigInt(0),
  Y = BigInt(1),
  je = /* @__PURE__ */ BigInt(2),
  nl = /* @__PURE__ */ BigInt(3),
  na = /* @__PURE__ */ BigInt(4),
  ra = /* @__PURE__ */ BigInt(5),
  sa = /* @__PURE__ */ BigInt(8);
function X(e, t) {
  const n = e % t;
  return n >= J ? n : t + n;
}
function ne(e, t, n) {
  let r = e;
  for (; t-- > J; ) ((r *= r), (r %= n));
  return r;
}
function sr(e, t) {
  if (e === J) throw new Error('invert: expected non-zero number');
  if (t <= J) throw new Error('invert: expected positive modulus, got ' + t);
  let n = X(e, t),
    r = t,
    s = J,
    o = Y;
  for (; n !== J; ) {
    const a = r / n,
      c = r % n,
      u = s - o * a;
    ((r = n), (n = c), (s = o), (o = u));
  }
  if (r !== Y) throw new Error('invert: does not exist');
  return X(s, t);
}
function oa(e, t) {
  const n = (e.ORDER + Y) / na,
    r = e.pow(t, n);
  if (!e.eql(e.sqr(r), t)) throw new Error('Cannot find square root');
  return r;
}
function rl(e, t) {
  const n = (e.ORDER - ra) / sa,
    r = e.mul(t, je),
    s = e.pow(r, n),
    o = e.mul(t, s),
    i = e.mul(e.mul(o, je), s),
    a = e.mul(o, e.sub(i, e.ONE));
  if (!e.eql(e.sqr(a), t)) throw new Error('Cannot find square root');
  return a;
}
function sl(e) {
  if (e < BigInt(3)) throw new Error('sqrt is not defined for small field');
  let t = e - Y,
    n = 0;
  for (; t % je === J; ) ((t /= je), n++);
  let r = je;
  const s = Hr(e);
  for (; Zs(s, r) === 1; ) if (r++ > 1e3) throw new Error('Cannot find square root: probably non-prime P');
  if (n === 1) return oa;
  let o = s.pow(r, t);
  const i = (t + Y) / je;
  return function (c, u) {
    if (c.is0(u)) return u;
    if (Zs(c, u) !== 1) throw new Error('Cannot find square root');
    let f = n,
      d = c.mul(c.ONE, o),
      l = c.pow(u, t),
      b = c.pow(u, i);
    for (; !c.eql(l, c.ONE); ) {
      if (c.is0(l)) return c.ZERO;
      let y = 1,
        h = c.sqr(l);
      for (; !c.eql(h, c.ONE); ) if ((y++, (h = c.sqr(h)), y === f)) throw new Error('Cannot find square root');
      const w = Y << BigInt(f - y - 1),
        m = c.pow(d, w);
      ((f = y), (d = c.sqr(m)), (l = c.mul(l, d)), (b = c.mul(b, m)));
    }
    return b;
  };
}
function ol(e) {
  return e % na === nl ? oa : e % sa === ra ? rl : sl(e);
}
const il = [
  'create',
  'isValid',
  'is0',
  'neg',
  'inv',
  'sqrt',
  'sqr',
  'eql',
  'add',
  'sub',
  'mul',
  'pow',
  'div',
  'addN',
  'subN',
  'mulN',
  'sqrN',
];
function al(e) {
  const t = {
      ORDER: 'bigint',
      MASK: 'bigint',
      BYTES: 'isSafeInteger',
      BITS: 'isSafeInteger',
    },
    n = il.reduce((r, s) => ((r[s] = 'function'), r), t);
  return dn(e, n);
}
function cl(e, t, n) {
  if (n < J) throw new Error('invalid exponent, negatives unsupported');
  if (n === J) return e.ONE;
  if (n === Y) return t;
  let r = e.ONE,
    s = t;
  for (; n > J; ) (n & Y && (r = e.mul(r, s)), (s = e.sqr(s)), (n >>= Y));
  return r;
}
function ia(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0),
    s = t.reduce((i, a, c) => (e.is0(a) ? i : ((r[c] = i), e.mul(i, a))), e.ONE),
    o = e.inv(s);
  return (t.reduceRight((i, a, c) => (e.is0(a) ? i : ((r[c] = e.mul(i, r[c])), e.mul(i, a))), o), r);
}
function Zs(e, t) {
  const n = (e.ORDER - Y) / je,
    r = e.pow(t, n),
    s = e.eql(r, e.ONE),
    o = e.eql(r, e.ZERO),
    i = e.eql(r, e.neg(e.ONE));
  if (!s && !o && !i) throw new Error('invalid Legendre symbol result');
  return s ? 1 : o ? 0 : -1;
}
function aa(e, t) {
  t !== void 0 && At(t);
  const n = t !== void 0 ? t : e.toString(2).length,
    r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Hr(e, t, n = !1, r = {}) {
  if (e <= J) throw new Error('invalid field: expected ORDER > 0, got ' + e);
  const { nBitLength: s, nByteLength: o } = aa(e, t);
  if (o > 2048) throw new Error('invalid field: expected ORDER of <= 2048 bytes');
  let i;
  const a = Object.freeze({
    ORDER: e,
    isLE: n,
    BITS: s,
    BYTES: o,
    MASK: fn(s),
    ZERO: J,
    ONE: Y,
    create: (c) => X(c, e),
    isValid: (c) => {
      if (typeof c != 'bigint') throw new Error('invalid field element: expected bigint, got ' + typeof c);
      return J <= c && c < e;
    },
    is0: (c) => c === J,
    isOdd: (c) => (c & Y) === Y,
    neg: (c) => X(-c, e),
    eql: (c, u) => c === u,
    sqr: (c) => X(c * c, e),
    add: (c, u) => X(c + u, e),
    sub: (c, u) => X(c - u, e),
    mul: (c, u) => X(c * u, e),
    pow: (c, u) => cl(a, c, u),
    div: (c, u) => X(c * sr(u, e), e),
    // Same as above, but doesn't normalize
    sqrN: (c) => c * c,
    addN: (c, u) => c + u,
    subN: (c, u) => c - u,
    mulN: (c, u) => c * u,
    inv: (c) => sr(c, e),
    sqrt: r.sqrt || ((c) => (i || (i = ol(e)), i(a, c))),
    toBytes: (c) => (n ? pi(c, o) : zt(c, o)),
    fromBytes: (c) => {
      if (c.length !== o) throw new Error('Field.fromBytes: expected ' + o + ' bytes, got ' + c.length);
      return n ? hi(c) : qe(c);
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (c) => ia(a, c),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (c, u, f) => (f ? u : c),
  });
  return Object.freeze(a);
}
function ca(e) {
  if (typeof e != 'bigint') throw new Error('field order must be bigint');
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function ua(e) {
  const t = ca(e);
  return t + Math.ceil(t / 2);
}
function ul(e, t, n = !1) {
  const r = e.length,
    s = ca(t),
    o = ua(t);
  if (r < 16 || r < o || r > 1024) throw new Error('expected ' + o + '-1024 bytes of input, got ' + r);
  const i = n ? hi(e) : qe(e),
    a = X(i, t - Y) + Y;
  return n ? pi(a, s) : zt(a, s);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ws = BigInt(0),
  or = BigInt(1);
function Cn(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function fa(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error('invalid window size, expected [1..' + t + '], got W=' + e);
}
function Rn(e, t) {
  fa(e, t);
  const n = Math.ceil(t / e) + 1,
    r = 2 ** (e - 1),
    s = 2 ** e,
    o = fn(e),
    i = BigInt(e);
  return { windows: n, windowSize: r, mask: o, maxNumber: s, shiftBy: i };
}
function Ys(e, t, n) {
  const { windowSize: r, mask: s, maxNumber: o, shiftBy: i } = n;
  let a = Number(e & s),
    c = e >> i;
  a > r && ((a -= o), (c += or));
  const u = t * r,
    f = u + Math.abs(a) - 1,
    d = a === 0,
    l = a < 0,
    b = t % 2 !== 0;
  return { nextN: c, offset: f, isZero: d, isNeg: l, isNegF: b, offsetF: u };
}
function fl(e, t) {
  if (!Array.isArray(e)) throw new Error('array expected');
  e.forEach((n, r) => {
    if (!(n instanceof t)) throw new Error('invalid point at index ' + r);
  });
}
function dl(e, t) {
  if (!Array.isArray(e)) throw new Error('array of scalars expected');
  e.forEach((n, r) => {
    if (!t.isValid(n)) throw new Error('invalid scalar at index ' + r);
  });
}
const On = /* @__PURE__ */ new WeakMap(),
  da = /* @__PURE__ */ new WeakMap();
function Fn(e) {
  return da.get(e) || 1;
}
function ll(e, t) {
  return {
    constTimeNegate: Cn,
    hasPrecomputes(n) {
      return Fn(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, s = e.ZERO) {
      let o = n;
      for (; r > Ws; ) (r & or && (s = s.add(o)), (o = o.double()), (r >>= or));
      return s;
    },
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @param elm Point instance
     * @param W window size
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(n, r) {
      const { windows: s, windowSize: o } = Rn(r, t),
        i = [];
      let a = n,
        c = a;
      for (let u = 0; u < s; u++) {
        ((c = a), i.push(c));
        for (let f = 1; f < o; f++) ((c = c.add(a)), i.push(c));
        a = c.double();
      }
      return i;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(n, r, s) {
      let o = e.ZERO,
        i = e.BASE;
      const a = Rn(n, t);
      for (let c = 0; c < a.windows; c++) {
        const { nextN: u, offset: f, isZero: d, isNeg: l, isNegF: b, offsetF: y } = Ys(s, c, a);
        ((s = u), d ? (i = i.add(Cn(b, r[y]))) : (o = o.add(Cn(l, r[f]))));
      }
      return { p: o, f: i };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(n, r, s, o = e.ZERO) {
      const i = Rn(n, t);
      for (let a = 0; a < i.windows && s !== Ws; a++) {
        const { nextN: c, offset: u, isZero: f, isNeg: d } = Ys(s, a, i);
        if (((s = c), !f)) {
          const l = r[u];
          o = o.add(d ? l.negate() : l);
        }
      }
      return o;
    },
    getPrecomputes(n, r, s) {
      let o = On.get(r);
      return (o || ((o = this.precomputeWindow(r, n)), n !== 1 && On.set(r, s(o))), o);
    },
    wNAFCached(n, r, s) {
      const o = Fn(n);
      return this.wNAF(o, this.getPrecomputes(o, n, s), r);
    },
    wNAFCachedUnsafe(n, r, s, o) {
      const i = Fn(n);
      return i === 1 ? this.unsafeLadder(n, r, o) : this.wNAFUnsafe(i, this.getPrecomputes(i, n, s), r, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      (fa(r, t), da.set(n, r), On.delete(n));
    },
  };
}
function bl(e, t, n, r) {
  (fl(n, e), dl(r, t));
  const s = n.length,
    o = r.length;
  if (s !== o) throw new Error('arrays of points and scalars must have equal length');
  const i = e.ZERO,
    a = Ru(BigInt(s));
  let c = 1;
  a > 12 ? (c = a - 3) : a > 4 ? (c = a - 2) : a > 0 && (c = 2);
  const u = fn(c),
    f = new Array(Number(u) + 1).fill(i),
    d = Math.floor((t.BITS - 1) / c) * c;
  let l = i;
  for (let b = d; b >= 0; b -= c) {
    f.fill(i);
    for (let h = 0; h < o; h++) {
      const w = r[h],
        m = Number((w >> BigInt(b)) & u);
      f[m] = f[m].add(n[h]);
    }
    let y = i;
    for (let h = f.length - 1, w = i; h > 0; h--) ((w = w.add(f[h])), (y = y.add(w)));
    if (((l = l.add(y)), b !== 0)) for (let h = 0; h < c; h++) l = l.double();
  }
  return l;
}
function la(e) {
  return (
    al(e.Fp),
    dn(
      e,
      {
        n: 'bigint',
        h: 'bigint',
        Gx: 'field',
        Gy: 'field',
      },
      {
        nBitLength: 'isSafeInteger',
        nByteLength: 'isSafeInteger',
      }
    ),
    Object.freeze({
      ...aa(e.n, e.nBitLength),
      ...e,
      p: e.Fp.ORDER,
    })
  );
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ks(e) {
  (e.lowS !== void 0 && $t('lowS', e.lowS), e.prehash !== void 0 && $t('prehash', e.prehash));
}
function hl(e) {
  const t = la(e);
  dn(
    t,
    {
      a: 'field',
      b: 'field',
    },
    {
      allowInfinityPoint: 'boolean',
      allowedPrivateKeyLengths: 'array',
      clearCofactor: 'function',
      fromBytes: 'function',
      isTorsionFree: 'function',
      toBytes: 'function',
      wrapPrivateKey: 'boolean',
    }
  );
  const { endo: n, Fp: r, a: s } = t;
  if (n) {
    if (!r.eql(s, r.ZERO)) throw new Error('invalid endo: CURVE.a must be 0');
    if (typeof n != 'object' || typeof n.beta != 'bigint' || typeof n.splitScalar != 'function')
      throw new Error('invalid endo: expected "beta": bigint and "splitScalar": function');
  }
  return Object.freeze({ ...t });
}
class pl extends Error {
  constructor(t = '') {
    super(t);
  }
}
const Pe = {
  // asn.1 DER encoding utils
  Err: pl,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Pe;
      if (e < 0 || e > 256) throw new n('tlv.encode: wrong tag');
      if (t.length & 1) throw new n('tlv.encode: unpadded data');
      const r = t.length / 2,
        s = Ht(r);
      if ((s.length / 2) & 128) throw new n('tlv.encode: long form length too big');
      const o = r > 127 ? Ht((s.length / 2) | 128) : '';
      return Ht(e) + o + s + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Pe;
      let r = 0;
      if (e < 0 || e > 256) throw new n('tlv.encode: wrong tag');
      if (t.length < 2 || t[r++] !== e) throw new n('tlv.decode: wrong tlv');
      const s = t[r++],
        o = !!(s & 128);
      let i = 0;
      if (!o) i = s;
      else {
        const c = s & 127;
        if (!c) throw new n('tlv.decode(long): indefinite length not supported');
        if (c > 4) throw new n('tlv.decode(long): byte length is too big');
        const u = t.subarray(r, r + c);
        if (u.length !== c) throw new n('tlv.decode: length bytes not complete');
        if (u[0] === 0) throw new n('tlv.decode(long): zero leftmost byte');
        for (const f of u) i = (i << 8) | f;
        if (((r += c), i < 128)) throw new n('tlv.decode(long): not minimal encoding');
      }
      const a = t.subarray(r, r + i);
      if (a.length !== i) throw new n('tlv.decode: wrong value length');
      return { v: a, l: t.subarray(r + i) };
    },
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = Pe;
      if (e < Ae) throw new t('integer: negative integers are not allowed');
      let n = Ht(e);
      if ((Number.parseInt(n[0], 16) & 8 && (n = '00' + n), n.length & 1))
        throw new t('unexpected DER parsing assertion: unpadded hex');
      return n;
    },
    decode(e) {
      const { Err: t } = Pe;
      if (e[0] & 128) throw new t('invalid signature integer: negative');
      if (e[0] === 0 && !(e[1] & 128)) throw new t('invalid signature integer: unnecessary leading zero');
      return qe(e);
    },
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Pe,
      s = re('signature', e),
      { v: o, l: i } = r.decode(48, s);
    if (i.length) throw new t('invalid signature: left bytes after parsing');
    const { v: a, l: c } = r.decode(2, o),
      { v: u, l: f } = r.decode(2, c);
    if (f.length) throw new t('invalid signature: left bytes after parsing');
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Pe,
      r = t.encode(2, n.encode(e.r)),
      s = t.encode(2, n.encode(e.s)),
      o = r + s;
    return t.encode(48, o);
  },
};
function zn(e, t) {
  return It(zt(e, t));
}
const Ae = BigInt(0),
  H = BigInt(1);
BigInt(2);
const Ln = BigInt(3),
  yl = BigInt(4);
function ml(e) {
  const t = hl(e),
    { Fp: n } = t,
    r = Hr(t.n, t.nBitLength),
    s =
      t.toBytes ||
      ((x, p, g) => {
        const E = p.toAffine();
        return Yt(Uint8Array.from([4]), n.toBytes(E.x), n.toBytes(E.y));
      }),
    o =
      t.fromBytes ||
      ((x) => {
        const p = x.subarray(1),
          g = n.fromBytes(p.subarray(0, n.BYTES)),
          E = n.fromBytes(p.subarray(n.BYTES, 2 * n.BYTES));
        return { x: g, y: E };
      });
  function i(x) {
    const { a: p, b: g } = t,
      E = n.sqr(x),
      v = n.mul(E, x);
    return n.add(n.add(v, n.mul(x, p)), g);
  }
  function a(x, p) {
    const g = n.sqr(p),
      E = i(x);
    return n.eql(g, E);
  }
  if (!a(t.Gx, t.Gy)) throw new Error('bad curve params: generator point');
  const c = n.mul(n.pow(t.a, Ln), yl),
    u = n.mul(n.sqr(t.b), BigInt(27));
  if (n.is0(n.add(c, u))) throw new Error('bad curve params: a or b');
  function f(x) {
    return Nr(x, H, t.n);
  }
  function d(x) {
    const { allowedPrivateKeyLengths: p, nByteLength: g, wrapPrivateKey: E, n: v } = t;
    if (p && typeof x != 'bigint') {
      if ((Ft(x) && (x = It(x)), typeof x != 'string' || !p.includes(x.length))) throw new Error('invalid private key');
      x = x.padStart(g * 2, '0');
    }
    let S;
    try {
      S = typeof x == 'bigint' ? x : qe(re('private key', x, g));
    } catch {
      throw new Error('invalid private key, expected hex or ' + g + ' bytes, got ' + typeof x);
    }
    return (E && (S = X(S, v)), ct('private key', S, H, v), S);
  }
  function l(x) {
    if (!(x instanceof h)) throw new Error('ProjectivePoint expected');
  }
  const b = zs((x, p) => {
      const { px: g, py: E, pz: v } = x;
      if (n.eql(v, n.ONE)) return { x: g, y: E };
      const S = x.is0();
      p == null && (p = S ? n.ONE : n.inv(v));
      const O = n.mul(g, p),
        T = n.mul(E, p),
        k = n.mul(v, p);
      if (S) return { x: n.ZERO, y: n.ZERO };
      if (!n.eql(k, n.ONE)) throw new Error('invZ was invalid');
      return { x: O, y: T };
    }),
    y = zs((x) => {
      if (x.is0()) {
        if (t.allowInfinityPoint && !n.is0(x.py)) return;
        throw new Error('bad point: ZERO');
      }
      const { x: p, y: g } = x.toAffine();
      if (!n.isValid(p) || !n.isValid(g)) throw new Error('bad point: x or y not FE');
      if (!a(p, g)) throw new Error('bad point: equation left != right');
      if (!x.isTorsionFree()) throw new Error('bad point: not in prime-order subgroup');
      return !0;
    });
  class h {
    constructor(p, g, E) {
      if (p == null || !n.isValid(p)) throw new Error('x required');
      if (g == null || !n.isValid(g) || n.is0(g)) throw new Error('y required');
      if (E == null || !n.isValid(E)) throw new Error('z required');
      ((this.px = p), (this.py = g), (this.pz = E), Object.freeze(this));
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(p) {
      const { x: g, y: E } = p || {};
      if (!p || !n.isValid(g) || !n.isValid(E)) throw new Error('invalid affine point');
      if (p instanceof h) throw new Error('projective point not allowed');
      const v = (S) => n.eql(S, n.ZERO);
      return v(g) && v(E) ? h.ZERO : new h(g, E, n.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     */
    static normalizeZ(p) {
      const g = ia(
        n,
        p.map((E) => E.pz)
      );
      return p.map((E, v) => E.toAffine(g[v])).map(h.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(p) {
      const g = h.fromAffine(o(re('pointHex', p)));
      return (g.assertValidity(), g);
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(p) {
      return h.BASE.multiply(d(p));
    }
    // Multiscalar Multiplication
    static msm(p, g) {
      return bl(h, r, p, g);
    }
    // "Private method", don't use it directly
    _setWindowSize(p) {
      A.setWindowSize(this, p);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      y(this);
    }
    hasEvenY() {
      const { y: p } = this.toAffine();
      if (n.isOdd) return !n.isOdd(p);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(p) {
      l(p);
      const { px: g, py: E, pz: v } = this,
        { px: S, py: O, pz: T } = p,
        k = n.eql(n.mul(g, T), n.mul(S, v)),
        F = n.eql(n.mul(E, T), n.mul(O, v));
      return k && F;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new h(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: p, b: g } = t,
        E = n.mul(g, Ln),
        { px: v, py: S, pz: O } = this;
      let T = n.ZERO,
        k = n.ZERO,
        F = n.ZERO,
        R = n.mul(v, v),
        j = n.mul(S, S),
        B = n.mul(O, O),
        P = n.mul(v, S);
      return (
        (P = n.add(P, P)),
        (F = n.mul(v, O)),
        (F = n.add(F, F)),
        (T = n.mul(p, F)),
        (k = n.mul(E, B)),
        (k = n.add(T, k)),
        (T = n.sub(j, k)),
        (k = n.add(j, k)),
        (k = n.mul(T, k)),
        (T = n.mul(P, T)),
        (F = n.mul(E, F)),
        (B = n.mul(p, B)),
        (P = n.sub(R, B)),
        (P = n.mul(p, P)),
        (P = n.add(P, F)),
        (F = n.add(R, R)),
        (R = n.add(F, R)),
        (R = n.add(R, B)),
        (R = n.mul(R, P)),
        (k = n.add(k, R)),
        (B = n.mul(S, O)),
        (B = n.add(B, B)),
        (R = n.mul(B, P)),
        (T = n.sub(T, R)),
        (F = n.mul(B, j)),
        (F = n.add(F, F)),
        (F = n.add(F, F)),
        new h(T, k, F)
      );
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(p) {
      l(p);
      const { px: g, py: E, pz: v } = this,
        { px: S, py: O, pz: T } = p;
      let k = n.ZERO,
        F = n.ZERO,
        R = n.ZERO;
      const j = t.a,
        B = n.mul(t.b, Ln);
      let P = n.mul(g, S),
        C = n.mul(E, O),
        $ = n.mul(v, T),
        N = n.add(g, E),
        _ = n.add(S, O);
      ((N = n.mul(N, _)), (_ = n.add(P, C)), (N = n.sub(N, _)), (_ = n.add(g, v)));
      let M = n.add(S, T);
      return (
        (_ = n.mul(_, M)),
        (M = n.add(P, $)),
        (_ = n.sub(_, M)),
        (M = n.add(E, v)),
        (k = n.add(O, T)),
        (M = n.mul(M, k)),
        (k = n.add(C, $)),
        (M = n.sub(M, k)),
        (R = n.mul(j, _)),
        (k = n.mul(B, $)),
        (R = n.add(k, R)),
        (k = n.sub(C, R)),
        (R = n.add(C, R)),
        (F = n.mul(k, R)),
        (C = n.add(P, P)),
        (C = n.add(C, P)),
        ($ = n.mul(j, $)),
        (_ = n.mul(B, _)),
        (C = n.add(C, $)),
        ($ = n.sub(P, $)),
        ($ = n.mul(j, $)),
        (_ = n.add(_, $)),
        (P = n.mul(C, _)),
        (F = n.add(F, P)),
        (P = n.mul(M, _)),
        (k = n.mul(N, k)),
        (k = n.sub(k, P)),
        (P = n.mul(N, C)),
        (R = n.mul(M, R)),
        (R = n.add(R, P)),
        new h(k, F, R)
      );
    }
    subtract(p) {
      return this.add(p.negate());
    }
    is0() {
      return this.equals(h.ZERO);
    }
    wNAF(p) {
      return A.wNAFCached(this, p, h.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(p) {
      const { endo: g, n: E } = t;
      ct('scalar', p, Ae, E);
      const v = h.ZERO;
      if (p === Ae) return v;
      if (this.is0() || p === H) return this;
      if (!g || A.hasPrecomputes(this)) return A.wNAFCachedUnsafe(this, p, h.normalizeZ);
      let { k1neg: S, k1: O, k2neg: T, k2: k } = g.splitScalar(p),
        F = v,
        R = v,
        j = this;
      for (; O > Ae || k > Ae; )
        (O & H && (F = F.add(j)), k & H && (R = R.add(j)), (j = j.double()), (O >>= H), (k >>= H));
      return (S && (F = F.negate()), T && (R = R.negate()), (R = new h(n.mul(R.px, g.beta), R.py, R.pz)), F.add(R));
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(p) {
      const { endo: g, n: E } = t;
      ct('scalar', p, H, E);
      let v, S;
      if (g) {
        const { k1neg: O, k1: T, k2neg: k, k2: F } = g.splitScalar(p);
        let { p: R, f: j } = this.wNAF(T),
          { p: B, f: P } = this.wNAF(F);
        ((R = A.constTimeNegate(O, R)),
          (B = A.constTimeNegate(k, B)),
          (B = new h(n.mul(B.px, g.beta), B.py, B.pz)),
          (v = R.add(B)),
          (S = j.add(P)));
      } else {
        const { p: O, f: T } = this.wNAF(p);
        ((v = O), (S = T));
      }
      return h.normalizeZ([v, S])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(p, g, E) {
      const v = h.BASE,
        S = (T, k) => (k === Ae || k === H || !T.equals(v) ? T.multiplyUnsafe(k) : T.multiply(k)),
        O = S(this, g).add(S(p, E));
      return O.is0() ? void 0 : O;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(p) {
      return b(this, p);
    }
    isTorsionFree() {
      const { h: p, isTorsionFree: g } = t;
      if (p === H) return !0;
      if (g) return g(h, this);
      throw new Error('isTorsionFree() has not been declared for the elliptic curve');
    }
    clearCofactor() {
      const { h: p, clearCofactor: g } = t;
      return p === H ? this : g ? g(h, this) : this.multiplyUnsafe(t.h);
    }
    toRawBytes(p = !0) {
      return ($t('isCompressed', p), this.assertValidity(), s(h, this, p));
    }
    toHex(p = !0) {
      return ($t('isCompressed', p), It(this.toRawBytes(p)));
    }
  }
  ((h.BASE = new h(t.Gx, t.Gy, n.ONE)), (h.ZERO = new h(n.ZERO, n.ONE, n.ZERO)));
  const { endo: w, nBitLength: m } = t,
    A = ll(h, w ? Math.ceil(m / 2) : m);
  return {
    CURVE: t,
    ProjectivePoint: h,
    normPrivateKeyToScalar: d,
    weierstrassEquation: i,
    isWithinCurveOrder: f,
  };
}
function gl(e) {
  const t = la(e);
  return (
    dn(
      t,
      {
        hash: 'hash',
        hmac: 'function',
        randomBytes: 'function',
      },
      {
        bits2int: 'function',
        bits2int_modN: 'function',
        lowS: 'boolean',
      }
    ),
    Object.freeze({ lowS: !0, ...t })
  );
}
function wl(e) {
  const t = gl(e),
    { Fp: n, n: r, nByteLength: s, nBitLength: o } = t,
    i = n.BYTES + 1,
    a = 2 * n.BYTES + 1;
  function c(B) {
    return X(B, r);
  }
  function u(B) {
    return sr(B, r);
  }
  const {
    ProjectivePoint: f,
    normPrivateKeyToScalar: d,
    weierstrassEquation: l,
    isWithinCurveOrder: b,
  } = ml({
    ...t,
    toBytes(B, P, C) {
      const $ = P.toAffine(),
        N = n.toBytes($.x),
        _ = Yt;
      return (
        $t('isCompressed', C),
        C ? _(Uint8Array.from([P.hasEvenY() ? 2 : 3]), N) : _(Uint8Array.from([4]), N, n.toBytes($.y))
      );
    },
    fromBytes(B) {
      const P = B.length,
        C = B[0],
        $ = B.subarray(1);
      if (P === i && (C === 2 || C === 3)) {
        const N = qe($);
        if (!Nr(N, H, n.ORDER)) throw new Error('Point is not on curve');
        const _ = l(N);
        let M;
        try {
          M = n.sqrt(_);
        } catch (K) {
          const Z = K instanceof Error ? ': ' + K.message : '';
          throw new Error('Point is not on curve' + Z);
        }
        const D = (M & H) === H;
        return (((C & 1) === 1) !== D && (M = n.neg(M)), { x: N, y: M });
      } else if (P === a && C === 4) {
        const N = n.fromBytes($.subarray(0, n.BYTES)),
          _ = n.fromBytes($.subarray(n.BYTES, 2 * n.BYTES));
        return { x: N, y: _ };
      } else {
        const N = i,
          _ = a;
        throw new Error('invalid Point, expected length of ' + N + ', or uncompressed ' + _ + ', got ' + P);
      }
    },
  });
  function y(B) {
    const P = r >> H;
    return B > P;
  }
  function h(B) {
    return y(B) ? c(-B) : B;
  }
  const w = (B, P, C) => qe(B.slice(P, C));
  class m {
    constructor(P, C, $) {
      (ct('r', P, H, r),
        ct('s', C, H, r),
        (this.r = P),
        (this.s = C),
        $ != null && (this.recovery = $),
        Object.freeze(this));
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(P) {
      const C = s;
      return ((P = re('compactSignature', P, C * 2)), new m(w(P, 0, C), w(P, C, 2 * C)));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(P) {
      const { r: C, s: $ } = Pe.toSig(re('DER', P));
      return new m(C, $);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {}
    addRecoveryBit(P) {
      return new m(this.r, this.s, P);
    }
    recoverPublicKey(P) {
      const { r: C, s: $, recovery: N } = this,
        _ = v(re('msgHash', P));
      if (N == null || ![0, 1, 2, 3].includes(N)) throw new Error('recovery id invalid');
      const M = N === 2 || N === 3 ? C + t.n : C;
      if (M >= n.ORDER) throw new Error('recovery id 2 or 3 invalid');
      const D = (N & 1) === 0 ? '02' : '03',
        ie = f.fromHex(D + zn(M, n.BYTES)),
        K = u(M),
        Z = c(-_ * K),
        Qe = c($ * K),
        Ce = f.BASE.multiplyAndAddUnsafe(ie, Z, Qe);
      if (!Ce) throw new Error('point at infinify');
      return (Ce.assertValidity(), Ce);
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return y(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new m(this.r, c(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return Wt(this.toDERHex());
    }
    toDERHex() {
      return Pe.hexFromSig(this);
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Wt(this.toCompactHex());
    }
    toCompactHex() {
      const P = s;
      return zn(this.r, P) + zn(this.s, P);
    }
  }
  const A = {
    isValidPrivateKey(B) {
      try {
        return (d(B), !0);
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: d,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const B = ua(t.n);
      return ul(t.randomBytes(B), t.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(B = 8, P = f.BASE) {
      return (P._setWindowSize(B), P.multiply(BigInt(3)), P);
    },
  };
  function x(B, P = !0) {
    return f.fromPrivateKey(B).toRawBytes(P);
  }
  function p(B) {
    if (typeof B == 'bigint') return !1;
    if (B instanceof f) return !0;
    const C = re('key', B).length,
      $ = n.BYTES,
      N = $ + 1,
      _ = 2 * $ + 1;
    if (!(t.allowedPrivateKeyLengths || s === N)) return C === N || C === _;
  }
  function g(B, P, C = !0) {
    if (p(B) === !0) throw new Error('first arg must be private key');
    if (p(P) === !1) throw new Error('second arg must be public key');
    return f.fromHex(P).multiply(d(B)).toRawBytes(C);
  }
  const E =
      t.bits2int ||
      function (B) {
        if (B.length > 8192) throw new Error('input is too large');
        const P = qe(B),
          C = B.length * 8 - o;
        return C > 0 ? P >> BigInt(C) : P;
      },
    v =
      t.bits2int_modN ||
      function (B) {
        return c(E(B));
      },
    S = fn(o);
  function O(B) {
    return (ct('num < 2^' + o, B, Ae, S), zt(B, s));
  }
  function T(B, P, C = k) {
    if (['recovered', 'canonical'].some((Ue) => Ue in C)) throw new Error('sign() legacy options not supported');
    const { hash: $, randomBytes: N } = t;
    let { lowS: _, prehash: M, extraEntropy: D } = C;
    (_ == null && (_ = !0), (B = re('msgHash', B)), Ks(C), M && (B = re('prehashed msgHash', $(B))));
    const ie = v(B),
      K = d(P),
      Z = [O(K), O(ie)];
    if (D != null && D !== !1) {
      const Ue = D === !0 ? N(n.BYTES) : D;
      Z.push(re('extraEntropy', Ue));
    }
    const Qe = Yt(...Z),
      Ce = ie;
    function gn(Ue) {
      const et = E(Ue);
      if (!b(et)) return;
      const wn = u(et),
        wt = f.BASE.multiply(et).toAffine(),
        Me = c(wt.x);
      if (Me === Ae) return;
      const xt = c(wn * c(Ce + Me * K));
      if (xt === Ae) return;
      let tt = (wt.x === Me ? 0 : 2) | Number(wt.y & H),
        Wr = xt;
      return (_ && y(xt) && ((Wr = h(xt)), (tt ^= 1)), new m(Me, Wr, tt));
    }
    return { seed: Qe, k2sig: gn };
  }
  const k = { lowS: t.lowS, prehash: !1 },
    F = { lowS: t.lowS, prehash: !1 };
  function R(B, P, C = k) {
    const { seed: $, k2sig: N } = T(B, P, C),
      _ = t;
    return Ou(_.hash.outputLen, _.nByteLength, _.hmac)($, N);
  }
  f.BASE._setWindowSize(8);
  function j(B, P, C, $ = F) {
    const N = B;
    ((P = re('msgHash', P)), (C = re('publicKey', C)));
    const { lowS: _, prehash: M, format: D } = $;
    if ((Ks($), 'strict' in $)) throw new Error('options.strict was renamed to lowS');
    if (D !== void 0 && D !== 'compact' && D !== 'der') throw new Error('format must be compact or der');
    const ie = typeof N == 'string' || Ft(N),
      K = !ie && !D && typeof N == 'object' && N !== null && typeof N.r == 'bigint' && typeof N.s == 'bigint';
    if (!ie && !K) throw new Error('invalid signature, expected Uint8Array, hex string or Signature instance');
    let Z, Qe;
    try {
      if ((K && (Z = new m(N.r, N.s)), ie)) {
        try {
          D !== 'compact' && (Z = m.fromDER(N));
        } catch (tt) {
          if (!(tt instanceof Pe.Err)) throw tt;
        }
        !Z && D !== 'der' && (Z = m.fromCompact(N));
      }
      Qe = f.fromHex(C);
    } catch {
      return !1;
    }
    if (!Z || (_ && Z.hasHighS())) return !1;
    M && (P = t.hash(P));
    const { r: Ce, s: gn } = Z,
      Ue = v(P),
      et = u(gn),
      wn = c(Ue * et),
      wt = c(Ce * et),
      Me = f.BASE.multiplyAndAddUnsafe(Qe, wn, wt)?.toAffine();
    return Me ? c(Me.x) === Ce : !1;
  }
  return {
    CURVE: t,
    getPublicKey: x,
    getSharedSecret: g,
    sign: R,
    verify: j,
    ProjectivePoint: f,
    Signature: m,
    utils: A,
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function xl(e) {
  return {
    hash: e,
    hmac: (t, ...n) => ta(e, t, Qc(...n)),
    randomBytes: e0,
  };
}
function vl(e, t) {
  const n = (r) => wl({ ...e, ...xl(r) });
  return { ...n(t), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ba = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f'),
  Xs = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'),
  El = BigInt(0),
  Pl = BigInt(1),
  ir = BigInt(2),
  Js = (e, t) => (e + t / ir) / t;
function Al(e) {
  const t = ba,
    n = BigInt(3),
    r = BigInt(6),
    s = BigInt(11),
    o = BigInt(22),
    i = BigInt(23),
    a = BigInt(44),
    c = BigInt(88),
    u = (e * e * e) % t,
    f = (u * u * e) % t,
    d = (ne(f, n, t) * f) % t,
    l = (ne(d, n, t) * f) % t,
    b = (ne(l, ir, t) * u) % t,
    y = (ne(b, s, t) * b) % t,
    h = (ne(y, o, t) * y) % t,
    w = (ne(h, a, t) * h) % t,
    m = (ne(w, c, t) * w) % t,
    A = (ne(m, a, t) * h) % t,
    x = (ne(A, n, t) * f) % t,
    p = (ne(x, i, t) * y) % t,
    g = (ne(p, r, t) * u) % t,
    E = ne(g, ir, t);
  if (!ar.eql(ar.sqr(E), e)) throw new Error('Cannot find square root');
  return E;
}
const ar = Hr(ba, void 0, void 0, { sqrt: Al }),
  ha = vl(
    {
      a: El,
      b: BigInt(7),
      Fp: ar,
      n: Xs,
      Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
      Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
      h: BigInt(1),
      lowS: !0,
      // Allow only low-S signatures by default in sign() and verify()
      endo: {
        // Endomorphism, see above
        beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
        splitScalar: (e) => {
          const t = Xs,
            n = BigInt('0x3086d221a7d46bcde86c90e49284eb15'),
            r = -Pl * BigInt('0xe4437ed6010e88286f547fa90abfe4c3'),
            s = BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8'),
            o = n,
            i = BigInt('0x100000000000000000000000000000000'),
            a = Js(o * e, t),
            c = Js(-r * e, t);
          let u = X(e - a * n - c * s, t),
            f = X(-a * r - c * o, t);
          const d = u > i,
            l = f > i;
          if ((d && (u = t - u), l && (f = t - f), u > i || f > i))
            throw new Error('splitScalar: Endomorphism failed, k=' + e);
          return { k1neg: d, k1: u, k2neg: l, k2: f };
        },
      },
    },
    ii
  ),
  Bl = /* @__PURE__ */ Object.freeze(
    /* @__PURE__ */ Object.defineProperty(
      {
        __proto__: null,
        secp256k1: ha,
      },
      Symbol.toStringTag,
      { value: 'Module' }
    )
  );
function pa(e, t = {}) {
  const { recovered: n } = t;
  if (typeof e.r > 'u') throw new _n({ signature: e });
  if (typeof e.s > 'u') throw new _n({ signature: e });
  if (n && typeof e.yParity > 'u') throw new _n({ signature: e });
  if (e.r < 0n || e.r > Hs) throw new Cl({ value: e.r });
  if (e.s < 0n || e.s > Hs) throw new Rl({ value: e.s });
  if (typeof e.yParity == 'number' && e.yParity !== 0 && e.yParity !== 1) throw new Vr({ value: e.yParity });
}
function $l(e) {
  return ya(fe(e));
}
function ya(e) {
  if (e.length !== 130 && e.length !== 132) throw new Nl({ signature: e });
  const t = BigInt(me(e, 0, 32)),
    n = BigInt(me(e, 32, 64)),
    r = (() => {
      const s = +`0x${e.slice(130)}`;
      if (!Number.isNaN(s))
        try {
          return qr(s);
        } catch {
          throw new Vr({ value: s });
        }
    })();
  return typeof r > 'u'
    ? {
        r: t,
        s: n,
      }
    : {
        r: t,
        s: n,
        yParity: r,
      };
}
function Il(e) {
  if (!(typeof e.r > 'u') && !(typeof e.s > 'u')) return Sl(e);
}
function Sl(e) {
  const t =
    typeof e == 'string'
      ? ya(e)
      : e instanceof Uint8Array
        ? $l(e)
        : typeof e.r == 'string'
          ? Tl(e)
          : e.v
            ? kl(e)
            : {
                r: e.r,
                s: e.s,
                ...(typeof e.yParity < 'u' ? { yParity: e.yParity } : {}),
              };
  return (pa(t), t);
}
function kl(e) {
  return {
    r: e.r,
    s: e.s,
    yParity: qr(e.v),
  };
}
function Tl(e) {
  const t = (() => {
    const n = e.v ? Number(e.v) : void 0;
    let r = e.yParity ? Number(e.yParity) : void 0;
    if ((typeof n == 'number' && typeof r != 'number' && (r = qr(n)), typeof r != 'number'))
      throw new Vr({ value: e.yParity });
    return r;
  })();
  return {
    r: BigInt(e.r),
    s: BigInt(e.s),
    yParity: t,
  };
}
function qr(e) {
  if (e === 0 || e === 27) return 0;
  if (e === 1 || e === 28) return 1;
  if (e >= 35) return e % 2 === 0 ? 1 : 0;
  throw new Ol({ value: e });
}
class Nl extends U {
  constructor({ signature: t }) {
    (super(`Value \`${t}\` is an invalid signature size.`, {
      metaMessages: ['Expected: 64 bytes or 65 bytes.', `Received ${te(of(t))} bytes.`],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Signature.InvalidSerializedSizeError',
      }));
  }
}
class _n extends U {
  constructor({ signature: t }) {
    (super(`Signature \`${wi(t)}\` is missing either an \`r\`, \`s\`, or \`yParity\` property.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Signature.MissingPropertiesError',
      }));
  }
}
class Cl extends U {
  constructor({ value: t }) {
    (super(`Value \`${t}\` is an invalid r value. r must be a positive integer less than 2^256.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Signature.InvalidRError',
      }));
  }
}
class Rl extends U {
  constructor({ value: t }) {
    (super(`Value \`${t}\` is an invalid s value. s must be a positive integer less than 2^256.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Signature.InvalidSError',
      }));
  }
}
class Vr extends U {
  constructor({ value: t }) {
    (super(`Value \`${t}\` is an invalid y-parity value. Y-parity must be 0 or 1.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Signature.InvalidYParityError',
      }));
  }
}
class Ol extends U {
  constructor({ value: t }) {
    (super(`Value \`${t}\` is an invalid v value. v must be 27, 28 or >=35.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'Signature.InvalidVError',
      }));
  }
}
function Fl(e, t = {}) {
  return typeof e.chainId == 'string' ? zl(e) : { ...e, ...t.signature };
}
function zl(e) {
  const { address: t, chainId: n, nonce: r } = e,
    s = Il(e);
  return {
    address: t,
    chainId: Number(n),
    nonce: BigInt(r),
    ...s,
  };
}
const Ll = '0x8010801080108010801080108010801080108010801080108010801080108010',
  _l = Xi(
    '(uint256 chainId, address delegation, uint256 nonce, uint8 yParity, uint256 r, uint256 s), address to, bytes data'
  );
function ma(e) {
  if (typeof e == 'string') {
    if (me(e, -32) !== Ll) throw new jl(e);
  } else pa(e.authorization);
}
function Ul(e) {
  ma(e);
  const t = Ai(me(e, -64, -32)),
    n = me(e, -t - 64, -64),
    r = me(e, 0, -t - 64),
    [s, o, i] = Xd(_l, n);
  return {
    authorization: Fl({
      address: s.delegation,
      chainId: Number(s.chainId),
      nonce: s.nonce,
      yParity: s.yParity,
      r: s.r,
      s: s.s,
    }),
    signature: r,
    ...(i && i !== '0x' ? { data: i, to: o } : {}),
  };
}
function Ml(e) {
  try {
    return (ma(e), !0);
  } catch {
    return !1;
  }
}
let jl = class extends U {
  constructor(t) {
    (super(`Value \`${t}\` is an invalid ERC-8010 wrapped signature.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'SignatureErc8010.InvalidWrappedSignatureError',
      }));
  }
};
function Dl(e) {
  return e.map((t) => ({
    ...t,
    value: BigInt(t.value),
  }));
}
function Gl(e) {
  return {
    ...e,
    balance: e.balance ? BigInt(e.balance) : void 0,
    nonce: e.nonce ? Ie(e.nonce) : void 0,
    storageProof: e.storageProof ? Dl(e.storageProof) : void 0,
  };
}
async function Hl(e, { address: t, blockNumber: n, blockTag: r, storageKeys: s }) {
  const o = r ?? 'latest',
    i = n !== void 0 ? z(n) : void 0,
    a = await e.request({
      method: 'eth_getProof',
      params: [t, s, i || o],
    });
  return Gl(a);
}
async function ql(e, { address: t, blockNumber: n, blockTag: r = 'latest', slot: s }) {
  const o = n !== void 0 ? z(n) : void 0;
  return await e.request({
    method: 'eth_getStorageAt',
    params: [t, s, o || r],
  });
}
async function Zr(e, { blockHash: t, blockNumber: n, blockTag: r, hash: s, index: o }) {
  const i = r || 'latest',
    a = n !== void 0 ? z(n) : void 0;
  let c = null;
  if (
    (s
      ? (c = await e.request(
          {
            method: 'eth_getTransactionByHash',
            params: [s],
          },
          { dedupe: !0 }
        ))
      : t
        ? (c = await e.request(
            {
              method: 'eth_getTransactionByBlockHashAndIndex',
              params: [t, z(o)],
            },
            { dedupe: !0 }
          ))
        : (c = await e.request(
            {
              method: 'eth_getTransactionByBlockNumberAndIndex',
              params: [a || i, z(o)],
            },
            { dedupe: !!a }
          )),
    !c)
  )
    throw new Ho({
      blockHash: t,
      blockNumber: n,
      blockTag: i,
      hash: s,
      index: o,
    });
  return (e.chain?.formatters?.transaction?.format || ei)(c, 'getTransaction');
}
async function Vl(e, { hash: t, transactionReceipt: n }) {
  const [r, s] = await Promise.all([
      L(e, Mt, 'getBlockNumber')({}),
      t ? L(e, Zr, 'getTransaction')({ hash: t }) : void 0,
    ]),
    o = n?.blockNumber || s?.blockNumber;
  return o ? r - o + 1n : 0n;
}
async function qt(e, { hash: t }) {
  const n = await e.request(
    {
      method: 'eth_getTransactionReceipt',
      params: [t],
    },
    { dedupe: !0 }
  );
  if (!n) throw new qo({ hash: t });
  return (e.chain?.formatters?.transactionReceipt?.format || Ci)(n, 'getTransactionReceipt');
}
async function Zl(e, t) {
  const {
      account: n,
      authorizationList: r,
      allowFailure: s = !0,
      blockNumber: o,
      blockOverrides: i,
      blockTag: a,
      stateOverride: c,
    } = t,
    u = t.contracts,
    { batchSize: f = t.batchSize ?? 1024, deployless: d = t.deployless ?? !1 } =
      typeof e.batch?.multicall == 'object' ? e.batch.multicall : {},
    l = (() => {
      if (t.multicallAddress) return t.multicallAddress;
      if (d) return null;
      if (e.chain)
        return gt({
          blockNumber: o,
          chain: e.chain,
          contract: 'multicall3',
        });
      throw new Error('client chain not configured. multicallAddress is required.');
    })(),
    b = [[]];
  let y = 0,
    h = 0;
  for (let A = 0; A < u.length; A++) {
    const { abi: x, address: p, args: g, functionName: E } = u[A];
    try {
      const v = be({ abi: x, args: g, functionName: E });
      ((h += (v.length - 2) / 2), // Check if batching is enabled.
        f > 0 && // Check if the current size of the batch exceeds the size limit.
          h > f && // Check if the current chunk is not already empty.
          b[y].length > 0 &&
          (y++, (h = (v.length - 2) / 2), (b[y] = [])),
        (b[y] = [
          ...b[y],
          {
            allowFailure: !0,
            callData: v,
            target: p,
          },
        ]));
    } catch (v) {
      const S = ht(v, {
        abi: x,
        address: p,
        args: g,
        docsPath: '/docs/contract/multicall',
        functionName: E,
        sender: n,
      });
      if (!s) throw S;
      b[y] = [
        ...b[y],
        {
          allowFailure: !0,
          callData: '0x',
          target: p,
        },
      ];
    }
  }
  const w = await Promise.allSettled(
      b.map((A) =>
        L(
          e,
          de,
          'readContract'
        )({
          ...(l === null ? { code: Rr } : { address: l }),
          abi: Vt,
          account: n,
          args: [A],
          authorizationList: r,
          blockNumber: o,
          blockOverrides: i,
          blockTag: a,
          functionName: 'aggregate3',
          stateOverride: c,
        })
      )
    ),
    m = [];
  for (let A = 0; A < w.length; A++) {
    const x = w[A];
    if (x.status === 'rejected') {
      if (!s) throw x.reason;
      for (let g = 0; g < b[A].length; g++)
        m.push({
          status: 'failure',
          error: x.reason,
          result: void 0,
        });
      continue;
    }
    const p = x.value;
    for (let g = 0; g < p.length; g++) {
      const { returnData: E, success: v } = p[g],
        { callData: S } = b[A][g],
        { abi: O, address: T, functionName: k, args: F } = u[m.length];
      try {
        if (S === '0x') throw new kt();
        if (!v) throw new cn({ data: E });
        const R = Je({
          abi: O,
          args: F,
          data: E,
          functionName: k,
        });
        m.push(s ? { result: R, status: 'success' } : R);
      } catch (R) {
        const j = ht(R, {
          abi: O,
          address: T,
          args: F,
          docsPath: '/docs/contract/multicall',
          functionName: k,
        });
        if (!s) throw j;
        m.push({ error: j, result: void 0, status: 'failure' });
      }
    }
  }
  if (m.length !== u.length) throw new I('multicall results mismatch');
  return m;
}
async function cr(e, t) {
  const {
    blockNumber: n,
    blockTag: r = e.experimental_blockTag ?? 'latest',
    blocks: s,
    returnFullTransactions: o,
    traceTransfers: i,
    validation: a,
  } = t;
  try {
    const c = [];
    for (const l of s) {
      const b = l.blockOverrides ? Ii(l.blockOverrides) : void 0,
        y = l.calls.map((w) => {
          const m = w,
            A = m.account ? le(m.account) : void 0,
            x = m.abi ? be(m) : m.data,
            p = {
              ...m,
              data: m.dataSuffix ? ce([x || '0x', m.dataSuffix]) : x,
              from: m.from ?? A?.address,
            };
          return (Rt(p), un(p));
        }),
        h = l.stateOverrides ? vr(l.stateOverrides) : void 0;
      c.push({
        blockOverrides: b,
        calls: y,
        stateOverrides: h,
      });
    }
    const f = (typeof n == 'bigint' ? z(n) : void 0) || r;
    return (
      await e.request({
        method: 'eth_simulateV1',
        params: [{ blockStateCalls: c, returnFullTransactions: o, traceTransfers: i, validation: a }, f],
      })
    ).map((l, b) => ({
      ...ti(l),
      calls: l.calls.map((y, h) => {
        const { abi: w, args: m, functionName: A, to: x } = s[b].calls[h],
          p = y.error?.data ?? y.returnData,
          g = BigInt(y.gasUsed),
          E = y.logs?.map((T) => Te(T)),
          v = y.status === '0x1' ? 'success' : 'failure',
          S =
            w && v === 'success' && p !== '0x'
              ? Je({
                  abi: w,
                  data: p,
                  functionName: A,
                })
              : null,
          O = (() => {
            if (v === 'success') return;
            let T;
            if ((y.error?.data === '0x' ? (T = new kt()) : y.error && (T = new cn(y.error)), !!T))
              return ht(T, {
                abi: w ?? [],
                address: x ?? '0x',
                args: m,
                functionName: A ?? '<unknown>',
              });
          })();
        return {
          data: p,
          gasUsed: g,
          logs: E,
          status: v,
          ...(v === 'success'
            ? {
                result: S,
              }
            : {
                error: O,
              }),
        };
      }),
    }));
  } catch (c) {
    const u = c,
      f = wr(u, {});
    throw f instanceof Jt ? u : f;
  }
}
function ur(e) {
  let t = !0,
    n = '',
    r = 0,
    s = '',
    o = !1;
  for (let i = 0; i < e.length; i++) {
    const a = e[i];
    if ((['(', ')', ','].includes(a) && (t = !0), a === '(' && r++, a === ')' && r--, !!t)) {
      if (r === 0) {
        if (a === ' ' && ['event', 'function', 'error', ''].includes(s)) s = '';
        else if (((s += a), a === ')')) {
          o = !0;
          break;
        }
        continue;
      }
      if (a === ' ') {
        e[i - 1] !== ',' && n !== ',' && n !== ',(' && ((n = ''), (t = !1));
        continue;
      }
      ((s += a), (n += a));
    }
  }
  if (!o) throw new U('Unable to normalize signature.');
  return s;
}
function fr(e, t) {
  const n = typeof e,
    r = t.type;
  switch (r) {
    case 'address':
      return tr(e, { strict: !1 });
    case 'bool':
      return n === 'boolean';
    case 'function':
      return n === 'string';
    case 'string':
      return n === 'string';
    default:
      return r === 'tuple' && 'components' in t
        ? Object.values(t.components).every((s, o) => fr(Object.values(e)[o], s))
        : /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(
              r
            )
          ? n === 'number' || n === 'bigint'
          : /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/.test(r)
            ? n === 'string' || e instanceof Uint8Array
            : /[a-z]+[1-9]{0,3}(\[[0-9]{0,}\])+$/.test(r)
              ? Array.isArray(e) &&
                e.every((s) =>
                  fr(s, {
                    ...t,
                    // Pop off `[]` or `[M]` from end of type
                    type: r.replace(/(\[[0-9]{0,}\])$/, ''),
                  })
                )
              : !1;
  }
}
function ga(e, t, n) {
  for (const r in e) {
    const s = e[r],
      o = t[r];
    if (s.type === 'tuple' && o.type === 'tuple' && 'components' in s && 'components' in o)
      return ga(s.components, o.components, n[r]);
    const i = [s.type, o.type];
    if (
      i.includes('address') && i.includes('bytes20')
        ? !0
        : i.includes('address') && i.includes('string')
          ? tr(n[r], {
              strict: !1,
            })
          : i.includes('address') && i.includes('bytes')
            ? tr(n[r], {
                strict: !1,
              })
            : !1
    )
      return i;
  }
}
function wa(e, t = {}) {
  const { prepare: n = !0 } = t,
    r = Array.isArray(e) || typeof e == 'string' ? ls(e) : e;
  return {
    ...r,
    ...(n ? { hash: it(r) } : {}),
  };
}
function yn(e, t, n) {
  const { args: r = [], prepare: s = !0 } = n ?? {},
    o = af(t, { strict: !1 }),
    i = e.filter((u) =>
      o
        ? u.type === 'function' || u.type === 'error'
          ? xa(u) === me(t, 0, 4)
          : u.type === 'event'
            ? it(u) === t
            : !1
        : 'name' in u && u.name === t
    );
  if (i.length === 0) throw new Kt({ name: t });
  if (i.length === 1)
    return {
      ...i[0],
      ...(s ? { hash: it(i[0]) } : {}),
    };
  let a;
  for (const u of i) {
    if (!('inputs' in u)) continue;
    if (!r || r.length === 0) {
      if (!u.inputs || u.inputs.length === 0)
        return {
          ...u,
          ...(s ? { hash: it(u) } : {}),
        };
      continue;
    }
    if (!u.inputs || u.inputs.length === 0 || u.inputs.length !== r.length) continue;
    if (
      r.every((d, l) => {
        const b = 'inputs' in u && u.inputs[l];
        return b ? fr(d, b) : !1;
      })
    ) {
      if (a && 'inputs' in a && a.inputs) {
        const d = ga(u.inputs, a.inputs, r);
        if (d)
          throw new Yl(
            {
              abiItem: u,
              type: d[0],
            },
            {
              abiItem: a,
              type: d[1],
            }
          );
      }
      a = u;
    }
  }
  const c = (() => {
    if (a) return a;
    const [u, ...f] = i;
    return { ...u, overloads: f };
  })();
  if (!c) throw new Kt({ name: t });
  return {
    ...c,
    ...(s ? { hash: it(c) } : {}),
  };
}
function xa(...e) {
  const t = (() => {
    if (Array.isArray(e[0])) {
      const [n, r] = e;
      return yn(n, r);
    }
    return e[0];
  })();
  return me(it(t), 0, 4);
}
function Wl(...e) {
  const t = (() => {
      if (Array.isArray(e[0])) {
        const [r, s] = e;
        return yn(r, s);
      }
      return e[0];
    })(),
    n = typeof t == 'string' ? t : Zt(t);
  return ur(n);
}
function it(...e) {
  const t = (() => {
    if (Array.isArray(e[0])) {
      const [n, r] = e;
      return yn(n, r);
    }
    return e[0];
  })();
  return typeof t != 'string' && 'hash' in t && t.hash ? t.hash : Wi(Cr(Wl(t)));
}
class Yl extends U {
  constructor(t, n) {
    (super('Found ambiguous types in overloaded ABI Items.', {
      metaMessages: [
        // TODO: abitype to add support for signature-formatted ABI items.
        `\`${t.type}\` in \`${ur(Zt(t.abiItem))}\`, and`,
        `\`${n.type}\` in \`${ur(Zt(n.abiItem))}\``,
        '',
        'These types encode differently and cannot be distinguished at runtime.',
        'Remove one of the ambiguous items in the ABI.',
      ],
    }),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiItem.AmbiguityError',
      }));
  }
}
class Kt extends U {
  constructor({ name: t, data: n, type: r = 'item' }) {
    const s = t ? ` with name "${t}"` : n ? ` with data "${n}"` : '';
    (super(`ABI ${r}${s} not found.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'AbiItem.NotFoundError',
      }));
  }
}
function Kl(...e) {
  const [t, n] = (() => {
      if (Array.isArray(e[0])) {
        const [o, i] = e;
        return [Jl(o), i];
      }
      return e;
    })(),
    { bytecode: r, args: s } = n;
  return ue(r, t.inputs?.length && s?.length ? Dr(t.inputs, s) : '0x');
}
function Xl(e) {
  return wa(e);
}
function Jl(e) {
  const t = e.find((n) => n.type === 'constructor');
  if (!t) throw new Kt({ name: 'constructor' });
  return t;
}
function Ql(...e) {
  const [t, n = []] = (() => {
      if (Array.isArray(e[0])) {
        const [u, f, d] = e;
        return [Qs(u, f, { args: d }), d];
      }
      const [a, c] = e;
      return [a, c];
    })(),
    { overloads: r } = t,
    s = r
      ? Qs([t, ...r], t.name, {
          args: n,
        })
      : t,
    o = e1(s),
    i = n.length > 0 ? Dr(s.inputs, n) : void 0;
  return i ? ue(o, i) : o;
}
function rt(e, t = {}) {
  return wa(e, t);
}
function Qs(e, t, n) {
  const r = yn(e, t, n);
  if (r.type !== 'function') throw new Kt({ name: t, type: 'function' });
  return r;
}
function e1(e) {
  return xa(e);
}
const t1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  pe = '0x0000000000000000000000000000000000000000',
  n1 =
    '0x6080604052348015600e575f80fd5b5061016d8061001c5f395ff3fe608060405234801561000f575f80fd5b5060043610610029575f3560e01c8063f8b2cb4f1461002d575b5f80fd5b610047600480360381019061004291906100db565b61005d565b604051610054919061011e565b60405180910390f35b5f8173ffffffffffffffffffffffffffffffffffffffff16319050919050565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6100aa82610081565b9050919050565b6100ba816100a0565b81146100c4575f80fd5b50565b5f813590506100d5816100b1565b92915050565b5f602082840312156100f0576100ef61007d565b5b5f6100fd848285016100c7565b91505092915050565b5f819050919050565b61011881610106565b82525050565b5f6020820190506101315f83018461010f565b9291505056fea26469706673582212203b9fe929fe995c7cf9887f0bdba8a36dd78e8b73f149b17d2d9ad7cd09d2dc6264736f6c634300081a0033';
async function r1(e, t) {
  const {
      blockNumber: n,
      blockTag: r,
      calls: s,
      stateOverrides: o,
      traceAssetChanges: i,
      traceTransfers: a,
      validation: c,
    } = t,
    u = t.account ? le(t.account) : void 0;
  if (i && !u) throw new I('`account` is required when `traceAssetChanges` is true');
  const f = u
      ? Kl(Xl('constructor(bytes, bytes)'), {
          bytecode: Si,
          args: [n1, Ql(rt('function getBalance(address)'), [u.address])],
        })
      : void 0,
    d = i
      ? await Promise.all(
          t.calls.map(async ($) => {
            if (!$.data && !$.abi) return;
            const { accessList: N } = await _i(e, {
              account: u.address,
              ...$,
              data: $.abi ? be($) : $.data,
            });
            return N.map(({ address: _, storageKeys: M }) => (M.length > 0 ? _ : null));
          })
        ).then(($) => $.flat().filter(Boolean))
      : [],
    l = await cr(e, {
      blockNumber: n,
      blockTag: r,
      blocks: [
        ...(i
          ? [
              // ETH pre balances
              {
                calls: [{ data: f }],
                stateOverrides: o,
              },
              // Asset pre balances
              {
                calls: d.map(($, N) => ({
                  abi: [rt('function balanceOf(address) returns (uint256)')],
                  functionName: 'balanceOf',
                  args: [u.address],
                  to: $,
                  from: pe,
                  nonce: N,
                })),
                stateOverrides: [
                  {
                    address: pe,
                    nonce: 0,
                  },
                ],
              },
            ]
          : []),
        {
          calls: [...s, {}].map(($) => ({
            ...$,
            from: u?.address,
          })),
          stateOverrides: o,
        },
        ...(i
          ? [
              // ETH post balances
              {
                calls: [{ data: f }],
              },
              // Asset post balances
              {
                calls: d.map(($, N) => ({
                  abi: [rt('function balanceOf(address) returns (uint256)')],
                  functionName: 'balanceOf',
                  args: [u.address],
                  to: $,
                  from: pe,
                  nonce: N,
                })),
                stateOverrides: [
                  {
                    address: pe,
                    nonce: 0,
                  },
                ],
              },
              // Decimals
              {
                calls: d.map(($, N) => ({
                  to: $,
                  abi: [rt('function decimals() returns (uint256)')],
                  functionName: 'decimals',
                  from: pe,
                  nonce: N,
                })),
                stateOverrides: [
                  {
                    address: pe,
                    nonce: 0,
                  },
                ],
              },
              // Token URI
              {
                calls: d.map(($, N) => ({
                  to: $,
                  abi: [rt('function tokenURI(uint256) returns (string)')],
                  functionName: 'tokenURI',
                  args: [0n],
                  from: pe,
                  nonce: N,
                })),
                stateOverrides: [
                  {
                    address: pe,
                    nonce: 0,
                  },
                ],
              },
              // Symbols
              {
                calls: d.map(($, N) => ({
                  to: $,
                  abi: [rt('function symbol() returns (string)')],
                  functionName: 'symbol',
                  from: pe,
                  nonce: N,
                })),
                stateOverrides: [
                  {
                    address: pe,
                    nonce: 0,
                  },
                ],
              },
            ]
          : []),
      ],
      traceTransfers: a,
      validation: c,
    }),
    b = i ? l[2] : l[0],
    [y, h, , w, m, A, x, p] = i ? l : [],
    { calls: g, ...E } = b,
    v = g.slice(0, -1) ?? [],
    S = y?.calls ?? [],
    O = h?.calls ?? [],
    T = [...S, ...O].map(($) => ($.status === 'success' ? Se($.data) : null)),
    k = w?.calls ?? [],
    F = m?.calls ?? [],
    R = [...k, ...F].map(($) => ($.status === 'success' ? Se($.data) : null)),
    j = (A?.calls ?? []).map(($) => ($.status === 'success' ? $.result : null)),
    B = (p?.calls ?? []).map(($) => ($.status === 'success' ? $.result : null)),
    P = (x?.calls ?? []).map(($) => ($.status === 'success' ? $.result : null)),
    C = [];
  for (const [$, N] of R.entries()) {
    const _ = T[$];
    if (typeof N != 'bigint' || typeof _ != 'bigint') continue;
    const M = j[$ - 1],
      D = B[$ - 1],
      ie = P[$ - 1],
      K =
        $ === 0
          ? {
              address: t1,
              decimals: 18,
              symbol: 'ETH',
            }
          : {
              address: d[$ - 1],
              decimals: ie || M ? Number(M ?? 1) : void 0,
              symbol: D ?? void 0,
            };
    C.some((Z) => Z.token.address === K.address) ||
      C.push({
        token: K,
        value: {
          pre: _,
          post: N,
          diff: N - _,
        },
      });
  }
  return {
    assetChanges: C,
    block: E,
    results: v,
  };
}
const va = '0x6492649264926492649264926492649264926492649264926492649264926492';
function s1(e) {
  if (me(e, -32) !== va) throw new a1(e);
}
function o1(e) {
  const { data: t, signature: n, to: r } = e;
  return ue(Dr(Xi('address, bytes, bytes'), [r, t, n]), va);
}
function i1(e) {
  try {
    return (s1(e), !0);
  } catch {
    return !1;
  }
}
class a1 extends U {
  constructor(t) {
    (super(`Value \`${t}\` is an invalid ERC-6492 wrapped signature.`),
      Object.defineProperty(this, 'name', {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: 'SignatureErc6492.InvalidWrappedSignatureError',
      }));
  }
}
function c1({ r: e, s: t, to: n = 'hex', v: r, yParity: s }) {
  const o = (() => {
      if (s === 0 || s === 1) return s;
      if (r && (r === 27n || r === 28n || r >= 35n)) return r % 2n === 0n ? 1 : 0;
      throw new Error('Invalid `v` or `yParity` value');
    })(),
    i = `0x${new ha.Signature(Se(e), Se(t)).toCompactHex()}${o === 0 ? '1b' : '1c'}`;
  return n === 'hex' ? i : we(i);
}
async function mn(e, t) {
  const {
      address: n,
      hash: r,
      erc6492VerifierAddress: s = t.universalSignatureVerifierAddress ?? e.chain?.contracts?.erc6492Verifier?.address,
      multicallAddress: o = t.multicallAddress ?? e.chain?.contracts?.multicall3?.address,
    } = t,
    i = (() => {
      const a = t.signature;
      return ge(a) ? a : typeof a == 'object' && 'r' in a && 's' in a ? c1(a) : V(a);
    })();
  try {
    return Ml(i)
      ? await u1(e, {
          ...t,
          multicallAddress: o,
          signature: i,
        })
      : await f1(e, {
          ...t,
          verifierAddress: s,
          signature: i,
        });
  } catch (a) {
    try {
      if (Ot(Co(n), await Wo({ hash: r, signature: i }))) return !0;
    } catch {}
    if (a instanceof Ye) return !1;
    throw a;
  }
}
async function u1(e, t) {
  const { address: n, blockNumber: r, blockTag: s, hash: o, multicallAddress: i } = t,
    { authorization: a, data: c, signature: u, to: f } = Ul(t.signature);
  if (
    (await er(e, {
      address: n,
      blockNumber: r,
      blockTag: s,
    })) === mt(['0xef0100', a.address])
  )
    return await d1(e, {
      address: n,
      blockNumber: r,
      blockTag: s,
      hash: o,
      signature: u,
    });
  const l = {
    address: a.address,
    chainId: Number(a.chainId),
    nonce: Number(a.nonce),
    r: z(a.r, { size: 32 }),
    s: z(a.s, { size: 32 }),
    yParity: a.yParity,
  };
  if (
    !(await id({
      address: n,
      authorization: l,
    }))
  )
    throw new Ye();
  const y = await L(
    e,
    de,
    'readContract'
  )({
    ...(i ? { address: i } : { code: Rr }),
    authorizationList: [l],
    abi: Vt,
    blockNumber: r,
    blockTag: 'pending',
    functionName: 'aggregate3',
    args: [
      [
        ...(c
          ? [
              {
                allowFailure: !0,
                target: f ?? n,
                callData: c,
              },
            ]
          : []),
        {
          allowFailure: !0,
          target: n,
          callData: be({
            abi: oo,
            functionName: 'isValidSignature',
            args: [o, u],
          }),
        },
      ],
    ],
  });
  if (y[y.length - 1]?.returnData?.startsWith('0x1626ba7e')) return !0;
  throw new Ye();
}
async function f1(e, t) {
  const { address: n, factory: r, factoryData: s, hash: o, signature: i, verifierAddress: a, ...c } = t,
    u = await (async () =>
      (!r && !s) || i1(i)
        ? i
        : o1({
            data: s,
            signature: i,
            to: r,
          }))(),
    f = a
      ? {
          to: a,
          data: be({
            abi: cs,
            functionName: 'isValidSig',
            args: [n, o, u],
          }),
          ...c,
        }
      : {
          data: Or({
            abi: cs,
            args: [n, o, u],
            bytecode: bf,
          }),
          ...c,
        },
    { data: d } = await L(
      e,
      _t,
      'call'
    )(f).catch((l) => {
      throw l instanceof Vo ? new Ye() : l;
    });
  if (Oa(d ?? '0x0')) return !0;
  throw new Ye();
}
async function d1(e, t) {
  const { address: n, blockNumber: r, blockTag: s, hash: o, signature: i } = t;
  if (
    (
      await L(
        e,
        de,
        'readContract'
      )({
        address: n,
        abi: oo,
        args: [o, i],
        blockNumber: r,
        blockTag: s,
        functionName: 'isValidSignature',
      }).catch((c) => {
        throw c instanceof Zo ? new Ye() : c;
      })
    ).startsWith('0x1626ba7e')
  )
    return !0;
  throw new Ye();
}
class Ye extends Error {}
async function l1(e, { address: t, message: n, factory: r, factoryData: s, signature: o, ...i }) {
  const a = Gi(n);
  return mn(e, {
    address: t,
    factory: r,
    factoryData: s,
    hash: a,
    signature: o,
    ...i,
  });
}
async function b1(e, t) {
  const {
      address: n,
      factory: r,
      factoryData: s,
      signature: o,
      message: i,
      primaryType: a,
      types: c,
      domain: u,
      ...f
    } = t,
    d = vd({ message: i, primaryType: a, types: c, domain: u });
  return mn(e, {
    address: n,
    factory: r,
    factoryData: s,
    hash: d,
    signature: o,
    ...f,
  });
}
function Ea(
  e,
  {
    emitOnBegin: t = !1,
    emitMissed: n = !1,
    onBlockNumber: r,
    onError: s,
    poll: o,
    pollingInterval: i = e.pollingInterval,
  }
) {
  const a =
    typeof o < 'u'
      ? o
      : !(
          e.transport.type === 'webSocket' ||
          e.transport.type === 'ipc' ||
          (e.transport.type === 'fallback' &&
            (e.transport.transports[0].config.type === 'webSocket' || e.transport.transports[0].config.type === 'ipc'))
        );
  let c;
  return a
    ? (() => {
        const d = se(['watchBlockNumber', e.uid, t, n, i]);
        return Le(d, { onBlockNumber: r, onError: s }, (l) =>
          Ut(
            async () => {
              try {
                const b = await L(e, Mt, 'getBlockNumber')({ cacheTime: 0 });
                if (c !== void 0) {
                  if (b === c) return;
                  if (b - c > 1 && n) for (let y = c + 1n; y < b; y++) (l.onBlockNumber(y, c), (c = y));
                }
                (c === void 0 || b > c) && (l.onBlockNumber(b, c), (c = b));
              } catch (b) {
                l.onError?.(b);
              }
            },
            {
              emitOnBegin: t,
              interval: i,
            }
          )
        );
      })()
    : (() => {
        const d = se(['watchBlockNumber', e.uid, t, n]);
        return Le(d, { onBlockNumber: r, onError: s }, (l) => {
          let b = !0,
            y = () => (b = !1);
          return (
            (async () => {
              try {
                const h = (() => {
                    if (e.transport.type === 'fallback') {
                      const m = e.transport.transports.find(
                        (A) => A.config.type === 'webSocket' || A.config.type === 'ipc'
                      );
                      return m ? m.value : e.transport;
                    }
                    return e.transport;
                  })(),
                  { unsubscribe: w } = await h.subscribe({
                    params: ['newHeads'],
                    onData(m) {
                      if (!b) return;
                      const A = Se(m.result?.number);
                      (l.onBlockNumber(A, c), (c = A));
                    },
                    onError(m) {
                      l.onError?.(m);
                    },
                  });
                ((y = w), b || y());
              } catch (h) {
                s?.(h);
              }
            })(),
            () => y()
          );
        });
      })();
}
async function h1(e, t) {
  const {
      checkReplacement: n = !0,
      confirmations: r = 1,
      hash: s,
      onReplaced: o,
      retryCount: i = 6,
      retryDelay: a = ({ count: g }) => ~~(1 << g) * 200,
      // exponential backoff
      timeout: c = 18e4,
    } = t,
    u = se(['waitForTransactionReceipt', e.uid, s]),
    f = t.pollingInterval
      ? t.pollingInterval
      : e.chain?.experimental_preconfirmationTime
        ? e.chain.experimental_preconfirmationTime
        : e.pollingInterval;
  let d,
    l,
    b,
    y = !1,
    h,
    w;
  const { promise: m, resolve: A, reject: x } = Fa(),
    p = c
      ? setTimeout(() => {
          (w?.(), h?.(), x(new V0({ hash: s })));
        }, c)
      : void 0;
  return (
    (h = Le(u, { onReplaced: o, resolve: A, reject: x }, async (g) => {
      if (((b = await L(e, qt, 'getTransactionReceipt')({ hash: s }).catch(() => {})), b && r <= 1)) {
        (clearTimeout(p), g.resolve(b), h?.());
        return;
      }
      w = L(
        e,
        Ea,
        'watchBlockNumber'
      )({
        emitMissed: !0,
        emitOnBegin: !0,
        poll: !0,
        pollingInterval: f,
        async onBlockNumber(E) {
          const v = (O) => {
            (clearTimeout(p), w?.(), O(), h?.());
          };
          let S = E;
          if (!y)
            try {
              if (b) {
                if (r > 1 && (!b.blockNumber || S - b.blockNumber + 1n < r)) return;
                v(() => g.resolve(b));
                return;
              }
              if (
                (n &&
                  !d &&
                  ((y = !0),
                  await us(
                    async () => {
                      ((d = await L(e, Zr, 'getTransaction')({ hash: s })), d.blockNumber && (S = d.blockNumber));
                    },
                    {
                      delay: a,
                      retryCount: i,
                    }
                  ),
                  (y = !1)),
                (b = await L(e, qt, 'getTransactionReceipt')({ hash: s })),
                r > 1 && (!b.blockNumber || S - b.blockNumber + 1n < r))
              )
                return;
              v(() => g.resolve(b));
            } catch (O) {
              if (O instanceof Ho || O instanceof qo) {
                if (!d) {
                  y = !1;
                  return;
                }
                try {
                  ((l = d), (y = !0));
                  const T = await us(
                    () =>
                      L(
                        e,
                        ye,
                        'getBlock'
                      )({
                        blockNumber: S,
                        includeTransactions: !0,
                      }),
                    {
                      delay: a,
                      retryCount: i,
                      shouldRetry: ({ error: R }) => R instanceof Jo,
                    }
                  );
                  y = !1;
                  const k = T.transactions.find(({ from: R, nonce: j }) => R === l.from && j === l.nonce);
                  if (
                    !k ||
                    ((b = await L(
                      e,
                      qt,
                      'getTransactionReceipt'
                    )({
                      hash: k.hash,
                    })),
                    r > 1 && (!b.blockNumber || S - b.blockNumber + 1n < r))
                  )
                    return;
                  let F = 'replaced';
                  (k.to === l.to && k.value === l.value && k.input === l.input
                    ? (F = 'repriced')
                    : k.from === k.to && k.value === 0n && (F = 'cancelled'),
                    v(() => {
                      (g.onReplaced?.({
                        reason: F,
                        replacedTransaction: l,
                        transaction: k,
                        transactionReceipt: b,
                      }),
                        g.resolve(b));
                    }));
                } catch (T) {
                  v(() => g.reject(T));
                }
              } else v(() => g.reject(O));
            }
        },
      });
    })),
    m
  );
}
function p1(
  e,
  {
    blockTag: t = e.experimental_blockTag ?? 'latest',
    emitMissed: n = !1,
    emitOnBegin: r = !1,
    onBlock: s,
    onError: o,
    includeTransactions: i,
    poll: a,
    pollingInterval: c = e.pollingInterval,
  }
) {
  const u =
      typeof a < 'u'
        ? a
        : !(
            e.transport.type === 'webSocket' ||
            e.transport.type === 'ipc' ||
            (e.transport.type === 'fallback' &&
              (e.transport.transports[0].config.type === 'webSocket' ||
                e.transport.transports[0].config.type === 'ipc'))
          ),
    f = i ?? !1;
  let d;
  return u
    ? (() => {
        const y = se(['watchBlocks', e.uid, t, n, r, f, c]);
        return Le(y, { onBlock: s, onError: o }, (h) =>
          Ut(
            async () => {
              try {
                const w = await L(
                  e,
                  ye,
                  'getBlock'
                )({
                  blockTag: t,
                  includeTransactions: f,
                });
                if (w.number !== null && d?.number != null) {
                  if (w.number === d.number) return;
                  if (w.number - d.number > 1 && n)
                    for (let m = d?.number + 1n; m < w.number; m++) {
                      const A = await L(
                        e,
                        ye,
                        'getBlock'
                      )({
                        blockNumber: m,
                        includeTransactions: f,
                      });
                      (h.onBlock(A, d), (d = A));
                    }
                }
                // If no previous block exists, emit.
                (d?.number == null || // If the block tag is "pending" with no block number, emit.
                  (t === 'pending' && w?.number == null) || // If the next block number is greater than the previous block number, emit.
                  // We don't want to emit blocks in the past.
                  (w.number !== null && w.number > d.number)) &&
                  (h.onBlock(w, d), (d = w));
              } catch (w) {
                h.onError?.(w);
              }
            },
            {
              emitOnBegin: r,
              interval: c,
            }
          )
        );
      })()
    : (() => {
        let y = !0,
          h = !0,
          w = () => (y = !1);
        return (
          (async () => {
            try {
              r &&
                L(
                  e,
                  ye,
                  'getBlock'
                )({
                  blockTag: t,
                  includeTransactions: f,
                })
                  .then((x) => {
                    y && h && (s(x, void 0), (h = !1));
                  })
                  .catch(o);
              const m = (() => {
                  if (e.transport.type === 'fallback') {
                    const x = e.transport.transports.find(
                      (p) => p.config.type === 'webSocket' || p.config.type === 'ipc'
                    );
                    return x ? x.value : e.transport;
                  }
                  return e.transport;
                })(),
                { unsubscribe: A } = await m.subscribe({
                  params: ['newHeads'],
                  async onData(x) {
                    if (!y) return;
                    const p = await L(
                      e,
                      ye,
                      'getBlock'
                    )({
                      blockNumber: x.result?.number,
                      includeTransactions: f,
                    }).catch(() => {});
                    y && (s(p, d), (h = !1), (d = p));
                  },
                  onError(x) {
                    o?.(x);
                  },
                });
              ((w = A), y || w());
            } catch (m) {
              o?.(m);
            }
          })(),
          () => w()
        );
      })();
}
function y1(
  e,
  {
    address: t,
    args: n,
    batch: r = !0,
    event: s,
    events: o,
    fromBlock: i,
    onError: a,
    onLogs: c,
    poll: u,
    pollingInterval: f = e.pollingInterval,
    strict: d,
  }
) {
  const l =
      typeof u < 'u'
        ? u
        : typeof i == 'bigint'
          ? !0
          : !(
              e.transport.type === 'webSocket' ||
              e.transport.type === 'ipc' ||
              (e.transport.type === 'fallback' &&
                (e.transport.transports[0].config.type === 'webSocket' ||
                  e.transport.transports[0].config.type === 'ipc'))
            ),
    b = d ?? !1;
  return l
    ? (() => {
        const w = se(['watchEvent', t, n, r, e.uid, s, f, i]);
        return Le(w, { onLogs: c, onError: a }, (m) => {
          let A;
          i !== void 0 && (A = i - 1n);
          let x,
            p = !1;
          const g = Ut(
            async () => {
              if (!p) {
                try {
                  x = await L(
                    e,
                    Ui,
                    'createEventFilter'
                  )({
                    address: t,
                    args: n,
                    event: s,
                    events: o,
                    strict: b,
                    fromBlock: i,
                  });
                } catch {}
                p = !0;
                return;
              }
              try {
                let E;
                if (x) E = await L(e, bn, 'getFilterChanges')({ filter: x });
                else {
                  const v = await L(e, Mt, 'getBlockNumber')({});
                  (A && A !== v
                    ? (E = await L(
                        e,
                        Sr,
                        'getLogs'
                      )({
                        address: t,
                        args: n,
                        event: s,
                        events: o,
                        fromBlock: A + 1n,
                        toBlock: v,
                      }))
                    : (E = []),
                    (A = v));
                }
                if (E.length === 0) return;
                if (r) m.onLogs(E);
                else for (const v of E) m.onLogs([v]);
              } catch (E) {
                (x && E instanceof no && (p = !1), m.onError?.(E));
              }
            },
            {
              emitOnBegin: !0,
              interval: f,
            }
          );
          return async () => {
            (x && (await L(e, hn, 'uninstallFilter')({ filter: x })), g());
          };
        });
      })()
    : (() => {
        let w = !0,
          m = () => (w = !1);
        return (
          (async () => {
            try {
              const A = (() => {
                  if (e.transport.type === 'fallback') {
                    const E = e.transport.transports.find(
                      (v) => v.config.type === 'webSocket' || v.config.type === 'ipc'
                    );
                    return E ? E.value : e.transport;
                  }
                  return e.transport;
                })(),
                x = o ?? (s ? [s] : void 0);
              let p = [];
              x &&
                ((p = [
                  x.flatMap((v) =>
                    Nt({
                      abi: [v],
                      eventName: v.name,
                      args: n,
                    })
                  ),
                ]),
                s && (p = p[0]));
              const { unsubscribe: g } = await A.subscribe({
                params: ['logs', { address: t, topics: p }],
                onData(E) {
                  if (!w) return;
                  const v = E.result;
                  try {
                    const { eventName: S, args: O } = $r({
                        abi: x ?? [],
                        data: v.data,
                        topics: v.topics,
                        strict: b,
                      }),
                      T = Te(v, { args: O, eventName: S });
                    c([T]);
                  } catch (S) {
                    let O, T;
                    if (S instanceof Pt || S instanceof tn) {
                      if (d) return;
                      ((O = S.abiItem.name), (T = S.abiItem.inputs?.some((F) => !('name' in F && F.name))));
                    }
                    const k = Te(v, {
                      args: T ? [] : {},
                      eventName: O,
                    });
                    c([k]);
                  }
                },
                onError(E) {
                  a?.(E);
                },
              });
              ((m = g), w || m());
            } catch (A) {
              a?.(A);
            }
          })(),
          () => m()
        );
      })();
}
function m1(e, { batch: t = !0, onError: n, onTransactions: r, poll: s, pollingInterval: o = e.pollingInterval }) {
  return (typeof s < 'u' ? s : e.transport.type !== 'webSocket' && e.transport.type !== 'ipc')
    ? (() => {
        const u = se(['watchPendingTransactions', e.uid, t, o]);
        return Le(u, { onTransactions: r, onError: n }, (f) => {
          let d;
          const l = Ut(
            async () => {
              try {
                if (!d)
                  try {
                    d = await L(e, Mi, 'createPendingTransactionFilter')({});
                    return;
                  } catch (y) {
                    throw (l(), y);
                  }
                const b = await L(e, bn, 'getFilterChanges')({ filter: d });
                if (b.length === 0) return;
                if (t) f.onTransactions(b);
                else for (const y of b) f.onTransactions([y]);
              } catch (b) {
                f.onError?.(b);
              }
            },
            {
              emitOnBegin: !0,
              interval: o,
            }
          );
          return async () => {
            (d && (await L(e, hn, 'uninstallFilter')({ filter: d })), l());
          };
        });
      })()
    : (() => {
        let u = !0,
          f = () => (u = !1);
        return (
          (async () => {
            try {
              const { unsubscribe: d } = await e.transport.subscribe({
                params: ['newPendingTransactions'],
                onData(l) {
                  if (!u) return;
                  const b = l.result;
                  r([b]);
                },
                onError(l) {
                  n?.(l);
                },
              });
              ((f = d), u || f());
            } catch (d) {
              n?.(d);
            }
          })(),
          () => f()
        );
      })();
}
function g1(e) {
  const { scheme: t, statement: n, ...r } = e.match(w1)?.groups ?? {},
    { chainId: s, expirationTime: o, issuedAt: i, notBefore: a, requestId: c, ...u } = e.match(x1)?.groups ?? {},
    f = e
      .split('Resources:')[1]
      ?.split(
        `
- `
      )
      .slice(1);
  return {
    ...r,
    ...u,
    ...(s ? { chainId: Number(s) } : {}),
    ...(o ? { expirationTime: new Date(o) } : {}),
    ...(i ? { issuedAt: new Date(i) } : {}),
    ...(a ? { notBefore: new Date(a) } : {}),
    ...(c ? { requestId: c } : {}),
    ...(f ? { resources: f } : {}),
    ...(t ? { scheme: t } : {}),
    ...(n ? { statement: n } : {}),
  };
}
const w1 =
    /^(?:(?<scheme>[a-zA-Z][a-zA-Z0-9+-.]*):\/\/)?(?<domain>[a-zA-Z0-9+-.]*(?::[0-9]{1,5})?) (?:wants you to sign in with your Ethereum account:\n)(?<address>0x[a-fA-F0-9]{40})\n\n(?:(?<statement>.*)\n\n)?/,
  x1 =
    /(?:URI: (?<uri>.+))\n(?:Version: (?<version>.+))\n(?:Chain ID: (?<chainId>\d+))\n(?:Nonce: (?<nonce>[a-zA-Z0-9]+))\n(?:Issued At: (?<issuedAt>.+))(?:\nExpiration Time: (?<expirationTime>.+))?(?:\nNot Before: (?<notBefore>.+))?(?:\nRequest ID: (?<requestId>.+))?/;
function v1(e) {
  const { address: t, domain: n, message: r, nonce: s, scheme: o, time: i = /* @__PURE__ */ new Date() } = e;
  if (
    (n && r.domain !== n) ||
    (s && r.nonce !== s) ||
    (o && r.scheme !== o) ||
    (r.expirationTime && i >= r.expirationTime) ||
    (r.notBefore && i < r.notBefore)
  )
    return !1;
  try {
    if (!r.address || !oe(r.address, { strict: !1 }) || (t && !Ot(r.address, t))) return !1;
  } catch {
    return !1;
  }
  return !0;
}
async function E1(e, t) {
  const {
      address: n,
      domain: r,
      message: s,
      nonce: o,
      scheme: i,
      signature: a,
      time: c = /* @__PURE__ */ new Date(),
      ...u
    } = t,
    f = g1(s);
  if (
    !f.address ||
    !v1({
      address: n,
      domain: r,
      message: f,
      nonce: o,
      scheme: i,
      time: c,
    })
  )
    return !1;
  const l = Gi(s);
  return mn(e, {
    address: f.address,
    hash: l,
    signature: a,
    ...u,
  });
}
async function P1(e, { serializedTransaction: t, timeout: n }) {
  const r = await e.request(
    {
      method: 'eth_sendRawTransactionSync',
      params: n ? [t, z(n)] : [t],
    },
    { retryCount: 0 }
  );
  return (e.chain?.formatters?.transactionReceipt?.format || Ci)(r);
}
function A1(e) {
  return {
    call: (t) => _t(e, t),
    createAccessList: (t) => _i(e, t),
    createBlockFilter: () => Kf(e),
    createContractEventFilter: (t) => _o(e, t),
    createEventFilter: (t) => Ui(e, t),
    createPendingTransactionFilter: () => Mi(e),
    estimateContractGas: (t) => ku(e, t),
    estimateGas: (t) => Br(e, t),
    getBalance: (t) => Xf(e, t),
    getBlobBaseFee: () => Jf(e),
    getBlock: (t) => ye(e, t),
    getBlockNumber: (t) => Mt(e, t),
    getBlockTransactionCount: (t) => Qf(e, t),
    getBytecode: (t) => er(e, t),
    getChainId: () => ui(e),
    getCode: (t) => er(e, t),
    getContractEvents: (t) => di(e, t),
    getEip712Domain: (t) => td(e, t),
    getEnsAddress: (t) => Of(e, t),
    getEnsAvatar: (t) => Zf(e, t),
    getEnsName: (t) => Wf(e, t),
    getEnsResolver: (t) => Yf(e, t),
    getEnsText: (t) => Li(e, t),
    getFeeHistory: (t) => sd(e, t),
    estimateFeesPerGas: (t) => lu(e, t),
    getFilterChanges: (t) => bn(e, t),
    getFilterLogs: (t) => od(e, t),
    getGasPrice: () => Pr(e),
    getLogs: (t) => Sr(e, t),
    getProof: (t) => Hl(e, t),
    estimateMaxPriorityFeePerGas: (t) => du(e, t),
    getStorageAt: (t) => ql(e, t),
    getTransaction: (t) => Zr(e, t),
    getTransactionConfirmations: (t) => Vl(e, t),
    getTransactionCount: (t) => ri(e, t),
    getTransactionReceipt: (t) => qt(e, t),
    multicall: (t) => Zl(e, t),
    prepareTransactionRequest: (t) => fi(e, t),
    readContract: (t) => de(e, t),
    sendRawTransaction: (t) => $f(e, t),
    sendRawTransactionSync: (t) => P1(e, t),
    simulate: (t) => cr(e, t),
    simulateBlocks: (t) => cr(e, t),
    simulateCalls: (t) => r1(e, t),
    simulateContract: (t) => gf(e, t),
    verifyHash: (t) => mn(e, t),
    verifyMessage: (t) => l1(e, t),
    verifySiweMessage: (t) => E1(e, t),
    verifyTypedData: (t) => b1(e, t),
    uninstallFilter: (t) => hn(e, t),
    waitForTransactionReceipt: (t) => h1(e, t),
    watchBlocks: (t) => p1(e, t),
    watchBlockNumber: (t) => Ea(e, t),
    watchContractEvent: (t) => Bf(e, t),
    watchEvent: (t) => y1(e, t),
    watchPendingTransactions: (t) => m1(e, t),
  };
}
function z1(e) {
  const { key: t = 'public', name: n = 'Public Client' } = e;
  return Sf({
    ...e,
    key: t,
    name: n,
    type: 'publicClient',
  }).extend(A1);
}
export {
  Ac as AbiConstructorNotFoundError,
  hs as AbiConstructorParamsNotFoundError,
  wo as AbiDecodingDataSizeTooSmallError,
  kt as AbiDecodingZeroDataError,
  Bc as AbiEncodingArrayLengthMismatchError,
  $c as AbiEncodingBytesSizeMismatchError,
  Ic as AbiEncodingLengthMismatchError,
  Sc as AbiErrorInputsNotFoundError,
  ps as AbiErrorNotFoundError,
  xo as AbiErrorSignatureNotFoundError,
  ys as AbiEventNotFoundError,
  kc as AbiEventSignatureEmptyTopicsError,
  vo as AbiEventSignatureNotFoundError,
  ft as AbiFunctionNotFoundError,
  Eo as AbiFunctionOutputsNotFoundError,
  Tc as AbiFunctionSignatureNotFoundError,
  j0 as AccountStateConflictError,
  U1 as AtomicReadyWalletRejectedUpgradeError,
  M1 as AtomicityNotSupportedError,
  I as BaseError,
  cu as BaseFeeScalarError,
  Jo as BlockNotFoundError,
  j1 as BundleTooLargeError,
  Cc as BytesSizeMismatchError,
  Vo as CallExecutionError,
  D1 as ChainDisconnectedError,
  Jn as ChainDoesNotSupportContract,
  cc as CircularReferenceError,
  ki as ClientChainNotConfiguredError,
  Zo as ContractFunctionExecutionError,
  Yn as ContractFunctionRevertedError,
  Z0 as ContractFunctionZeroDataError,
  W0 as CounterfactualDeploymentFailedError,
  Pt as DecodeLogDataMismatch,
  tn as DecodeLogTopicsMismatch,
  G1 as DuplicateIdError,
  Er as Eip1559FeesNotSupportedError,
  Et as EnsAvatarInvalidNftUriError,
  zf as EnsAvatarUnsupportedNamespaceError,
  Lr as EnsAvatarUriResolutionError,
  nu as EstimateGasExecutionError,
  Dt as ExecutionRevertedError,
  Mn as FeeCapTooHighError,
  Yr as FeeCapTooLowError,
  H0 as FeeConflictError,
  zc as FilterTypeNotSupportedError,
  as as HttpRequestError,
  Qr as InsufficientFundsError,
  Aa as IntegerOutOfRangeError,
  ka as InternalRpcError,
  es as IntrinsicGasTooHighError,
  ts as IntrinsicGasTooLowError,
  Oc as InvalidAbiDecodingTypeError,
  Rc as InvalidAbiEncodingTypeError,
  Xa as InvalidAbiItemError,
  ec as InvalidAbiParametersError,
  oc as InvalidAbiTypeParameterError,
  ze as InvalidAddressError,
  Po as InvalidArrayError,
  Ba as InvalidBytesBooleanError,
  Fc as InvalidDefinitionTypeError,
  pd as InvalidDomainError,
  sc as InvalidFunctionModifierError,
  H1 as InvalidHexBooleanError,
  no as InvalidInputRpcError,
  rc as InvalidModifierError,
  tc as InvalidParameterError,
  q1 as InvalidParamsRpcError,
  uc as InvalidParenthesisError,
  yd as InvalidPrimaryTypeError,
  V1 as InvalidRequestRpcError,
  q0 as InvalidSerializableTransactionError,
  pt as InvalidSignatureError,
  ac as InvalidStructSignatureError,
  md as InvalidStructTypeError,
  Z1 as JsonRpcVersionUnsupportedError,
  W1 as LimitExceededRpcError,
  uu as MaxFeePerGasTooLowError,
  Y1 as MethodNotFoundRpcError,
  K1 as MethodNotSupportedRpcError,
  Jr as NonceMaxValueError,
  Kr as NonceTooHighError,
  Xr as NonceTooLowError,
  X1 as ParseRpcError,
  J1 as ProviderDisconnectedError,
  Q1 as ProviderRpcError,
  cn as RawContractError,
  eb as ResourceNotFoundRpcError,
  tb as ResourceUnavailableRpcError,
  nb as RpcError,
  Ta as RpcRequestError,
  rb as SizeExceedsPaddingSizeError,
  sb as SizeOverflowError,
  to as SliceOffsetOutOfBoundsError,
  nc as SolidityProtectedKeywordError,
  D0 as StateAssignmentConflictError,
  ob as SwitchChainError,
  ib as TimeoutError,
  jn as TipAboveFeeCapError,
  Ho as TransactionNotFoundError,
  qo as TransactionReceiptNotFoundError,
  ab as TransactionRejectedRpcError,
  ns as TransactionTypeNotSupportedError,
  cb as UnauthorizedProviderError,
  ub as UnknownBundleIdError,
  Jt as UnknownNodeError,
  fb as UnknownRpcError,
  ic as UnknownSignatureError,
  Ja as UnknownTypeError,
  db as UnsupportedChainIdError,
  lb as UnsupportedNonOptionalCapabilityError,
  bb as UnsupportedProviderMethodError,
  hb as UrlRequiredError,
  pb as UserRejectedRequestError,
  V0 as WaitForTransactionReceiptTimeoutError,
  Rt as assertRequest,
  si as blobsToCommitments,
  oi as blobsToProofs,
  _c as boolToBytes,
  Pa as boolToHex,
  N0 as bytesToBigInt,
  C0 as bytesToBool,
  V as bytesToHex,
  Be as bytesToNumber,
  R0 as bytesToString,
  Di as ccipFetch,
  Di as ccipRequest,
  sn as checksumAddress,
  vu as commitmentToVersionedHash,
  Eu as commitmentsToVersionedHashes,
  ce as concat,
  p0 as concatBytes,
  mt as concatHex,
  Sf as createClient,
  z1 as createPublicClient,
  yb as createTransport,
  Ct as decodeAbiParameters,
  jo as decodeErrorResult,
  $r as decodeEventLog,
  kf as decodeFunctionData,
  Je as decodeFunctionResult,
  O1 as defineChain,
  Si as deploylessCallViaBytecodeBytecode,
  lf as deploylessCallViaFactoryBytecode,
  _e as encodeAbiParameters,
  Or as encodeDeployData,
  js as encodeErrorResult,
  Nt as encodeEventTopics,
  be as encodeFunctionData,
  Tf as encodeFunctionResult,
  mb as erc20Abi,
  cs as erc6492SignatureValidatorAbi,
  bf as erc6492SignatureValidatorByteCode,
  t1 as ethAddress,
  Ia as etherUnits,
  gb as fallback,
  ti as formatBlock,
  Go as formatEther,
  Ge as formatGwei,
  Te as formatLog,
  ei as formatTransaction,
  Ci as formatTransactionReceipt,
  un as formatTransactionRequest,
  $a as formatUnits,
  Xe as getAbiItem,
  Co as getAddress,
  gt as getChainContractAddress,
  ht as getContractError,
  rn as getEventSelector,
  b0 as getEventSignature,
  Tt as getFunctionSelector,
  b0 as getFunctionSignature,
  Iu as getTransactionType,
  wd as getTypesForEIP712Domain,
  wb as gweiUnits,
  Ed as hashDomain,
  Gi as hashMessage,
  Hi as hashStruct,
  vd as hashTypedData,
  Se as hexToBigInt,
  Oa as hexToBool,
  we as hexToBytes,
  Ie as hexToNumber,
  xb as http,
  oe as isAddress,
  Ot as isAddressEqual,
  ge as isHex,
  q as keccak256,
  Rf as labelhash,
  au as maxUint256,
  Vt as multicall3Abi,
  Qn as namehash,
  Uc as numberToBytes,
  z as numberToHex,
  dd as offchainLookup,
  ji as offchainLookupAbiItem,
  fd as offchainLookupSignature,
  dr as pad,
  vb as padBytes,
  De as padHex,
  go as parseAbi,
  ls as parseAbiItem,
  bs as parseAbiParameters,
  Ir as parseEventLogs,
  $0 as prepareEncodeFunctionData,
  bd as presignMessagePrefix,
  A1 as publicActions,
  Wo as recoverAddress,
  X0 as recoverPublicKey,
  su as rpcTransactionType,
  c1 as serializeSignature,
  xu as sha256,
  Eb as shouldThrow,
  c1 as signatureToHex,
  G as size,
  bt as slice,
  Fo as sliceBytes,
  y0 as sliceHex,
  He as stringToBytes,
  Un as stringToHex,
  se as stringify,
  $u as toBlobSidecars,
  Bu as toBlobs,
  yt as toBytes,
  No as toEventHash,
  rn as toEventSelector,
  b0 as toEventSignature,
  No as toFunctionHash,
  Tt as toFunctionSelector,
  b0 as toFunctionSignature,
  Fe as toHex,
  hd as toPrefixedMessage,
  J0 as toRlp,
  Qo as transactionType,
  Xt as trim,
  cs as universalSignatureValidatorAbi,
  bf as universalSignatureValidatorByteCode,
  gd as validateTypedData,
  Pf as withCache,
  us as withRetry,
  Pb as withTimeout,
  pe as zeroAddress,
};
//# sourceMappingURL=index-DYc2oKhZ.mjs.map
