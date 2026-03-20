import { z as zs, O as Oe$1, f as fl, a as Uf, s as sc, X as Xn } from "./CedeStore-DfpiZiOO.js";
import { a as cr$1 } from "./index-7d1bf759-DyVxwjav.js";
import { b as a } from "./index-8f43ecdf-vRKU5WRJ.js";
import { C as C$1, S } from "./index-08f6a6bd-CvLoXr4d.js";
import { t as tt$1 } from "./assert-990dca8c-PQWgsRh1.js";
import { r as rt$1 } from "./url-6cb53b95-DWjpptWm.js";
import { a as a$1 } from "./empty-73bf2089-BEzbM0NJ.js";
import "./index-73GArslZ.js";
var Or = {}, Ur = {};
function Li() {
  this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
}
var Ai = Li, he = {}, Ye = {};
(function(e) {
  var i = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
  function t(n, l) {
    return Object.prototype.hasOwnProperty.call(n, l);
  }
  e.assign = function(n) {
    for (var l = Array.prototype.slice.call(arguments, 1); l.length; ) {
      var o = l.shift();
      if (o) {
        if (typeof o != "object")
          throw new TypeError(o + "must be non-object");
        for (var d in o)
          t(o, d) && (n[d] = o[d]);
      }
    }
    return n;
  }, e.shrinkBuf = function(n, l) {
    return n.length === l ? n : n.subarray ? n.subarray(0, l) : (n.length = l, n);
  };
  var r = {
    arraySet: function(n, l, o, d, f) {
      if (l.subarray && n.subarray) {
        n.set(l.subarray(o, o + d), f);
        return;
      }
      for (var h = 0; h < d; h++)
        n[f + h] = l[o + h];
    },
    // Join array of chunks to single array.
    flattenChunks: function(n) {
      var l, o, d, f, h, g;
      for (d = 0, l = 0, o = n.length; l < o; l++)
        d += n[l].length;
      for (g = new Uint8Array(d), f = 0, l = 0, o = n.length; l < o; l++)
        h = n[l], g.set(h, f), f += h.length;
      return g;
    }
  }, a2 = {
    arraySet: function(n, l, o, d, f) {
      for (var h = 0; h < d; h++)
        n[f + h] = l[o + h];
    },
    // Join array of chunks to single array.
    flattenChunks: function(n) {
      return [].concat.apply([], n);
    }
  };
  e.setTyped = function(n) {
    n ? (e.Buf8 = Uint8Array, e.Buf16 = Uint16Array, e.Buf32 = Int32Array, e.assign(e, r)) : (e.Buf8 = Array, e.Buf16 = Array, e.Buf32 = Array, e.assign(e, a2));
  }, e.setTyped(i);
})(Ye);
var xe = {}, Ii = Ye, Zi = 4, Yt = 0, Vt = 1, Ni = 2;
function De(e) {
  for (var i = e.length; --i >= 0; )
    e[i] = 0;
}
var zi = 0, Br = 1, xi = 2, Di = 3, Fi = 258, Bt = 29, Ve = 256, He = Ve + 1 + Bt, ze = 30, Pt = 19, Pr = 2 * He + 1, pe = 15, Et = 16, Oi = 7, Ct = 256, Cr = 16, Mr = 17, Hr = 18, zt = (
  /* extra bits for each length code */
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
), at = (
  /* extra bits for each distance code */
  [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
), Ui = (
  /* extra bits for each bit length code */
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]
), $r = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], Bi = 512, ue = new Array((He + 2) * 2);
De(ue);
var Pe = new Array(ze * 2);
De(Pe);
var $e = new Array(Bi);
De($e);
var We = new Array(Fi - Di + 1);
De(We);
var Mt = new Array(Bt);
De(Mt);
var ht = new Array(ze);
De(ht);
function pt(e, i, t, r, a2) {
  this.static_tree = e, this.extra_bits = i, this.extra_base = t, this.elems = r, this.max_length = a2, this.has_stree = e && e.length;
}
var Wr, Gr, Kr;
function mt(e, i) {
  this.dyn_tree = e, this.max_code = 0, this.stat_desc = i;
}
function Xr(e) {
  return e < 256 ? $e[e] : $e[256 + (e >>> 7)];
}
function Ge(e, i) {
  e.pending_buf[e.pending++] = i & 255, e.pending_buf[e.pending++] = i >>> 8 & 255;
}
function W(e, i, t) {
  e.bi_valid > Et - t ? (e.bi_buf |= i << e.bi_valid & 65535, Ge(e, e.bi_buf), e.bi_buf = i >> Et - e.bi_valid, e.bi_valid += t - Et) : (e.bi_buf |= i << e.bi_valid & 65535, e.bi_valid += t);
}
function ae(e, i, t) {
  W(
    e,
    t[i * 2],
    t[i * 2 + 1]
    /*.Len*/
  );
}
function Yr(e, i) {
  var t = 0;
  do
    t |= e & 1, e >>>= 1, t <<= 1;
  while (--i > 0);
  return t >>> 1;
}
function Pi(e) {
  e.bi_valid === 16 ? (Ge(e, e.bi_buf), e.bi_buf = 0, e.bi_valid = 0) : e.bi_valid >= 8 && (e.pending_buf[e.pending++] = e.bi_buf & 255, e.bi_buf >>= 8, e.bi_valid -= 8);
}
function Ci(e, i) {
  var t = i.dyn_tree, r = i.max_code, a2 = i.stat_desc.static_tree, n = i.stat_desc.has_stree, l = i.stat_desc.extra_bits, o = i.stat_desc.extra_base, d = i.stat_desc.max_length, f, h, g, _, u, v, b = 0;
  for (_ = 0; _ <= pe; _++)
    e.bl_count[_] = 0;
  for (t[e.heap[e.heap_max] * 2 + 1] = 0, f = e.heap_max + 1; f < Pr; f++)
    h = e.heap[f], _ = t[t[h * 2 + 1] * 2 + 1] + 1, _ > d && (_ = d, b++), t[h * 2 + 1] = _, !(h > r) && (e.bl_count[_]++, u = 0, h >= o && (u = l[h - o]), v = t[h * 2], e.opt_len += v * (_ + u), n && (e.static_len += v * (a2[h * 2 + 1] + u)));
  if (b !== 0) {
    do {
      for (_ = d - 1; e.bl_count[_] === 0; )
        _--;
      e.bl_count[_]--, e.bl_count[_ + 1] += 2, e.bl_count[d]--, b -= 2;
    } while (b > 0);
    for (_ = d; _ !== 0; _--)
      for (h = e.bl_count[_]; h !== 0; )
        g = e.heap[--f], !(g > r) && (t[g * 2 + 1] !== _ && (e.opt_len += (_ - t[g * 2 + 1]) * t[g * 2], t[g * 2 + 1] = _), h--);
  }
}
function Vr(e, i, t) {
  var r = new Array(pe + 1), a2 = 0, n, l;
  for (n = 1; n <= pe; n++)
    r[n] = a2 = a2 + t[n - 1] << 1;
  for (l = 0; l <= i; l++) {
    var o = e[l * 2 + 1];
    o !== 0 && (e[l * 2] = Yr(r[o]++, o));
  }
}
function Mi() {
  var e, i, t, r, a2, n = new Array(pe + 1);
  for (t = 0, r = 0; r < Bt - 1; r++)
    for (Mt[r] = t, e = 0; e < 1 << zt[r]; e++)
      We[t++] = r;
  for (We[t - 1] = r, a2 = 0, r = 0; r < 16; r++)
    for (ht[r] = a2, e = 0; e < 1 << at[r]; e++)
      $e[a2++] = r;
  for (a2 >>= 7; r < ze; r++)
    for (ht[r] = a2 << 7, e = 0; e < 1 << at[r] - 7; e++)
      $e[256 + a2++] = r;
  for (i = 0; i <= pe; i++)
    n[i] = 0;
  for (e = 0; e <= 143; )
    ue[e * 2 + 1] = 8, e++, n[8]++;
  for (; e <= 255; )
    ue[e * 2 + 1] = 9, e++, n[9]++;
  for (; e <= 279; )
    ue[e * 2 + 1] = 7, e++, n[7]++;
  for (; e <= 287; )
    ue[e * 2 + 1] = 8, e++, n[8]++;
  for (Vr(ue, He + 1, n), e = 0; e < ze; e++)
    Pe[e * 2 + 1] = 5, Pe[e * 2] = Yr(e, 5);
  Wr = new pt(ue, zt, Ve + 1, He, pe), Gr = new pt(Pe, at, 0, ze, pe), Kr = new pt(new Array(0), Ui, 0, Pt, Oi);
}
function jr(e) {
  var i;
  for (i = 0; i < He; i++)
    e.dyn_ltree[i * 2] = 0;
  for (i = 0; i < ze; i++)
    e.dyn_dtree[i * 2] = 0;
  for (i = 0; i < Pt; i++)
    e.bl_tree[i * 2] = 0;
  e.dyn_ltree[Ct * 2] = 1, e.opt_len = e.static_len = 0, e.last_lit = e.matches = 0;
}
function Jr(e) {
  e.bi_valid > 8 ? Ge(e, e.bi_buf) : e.bi_valid > 0 && (e.pending_buf[e.pending++] = e.bi_buf), e.bi_buf = 0, e.bi_valid = 0;
}
function Hi(e, i, t, r) {
  Jr(e), Ge(e, t), Ge(e, ~t), Ii.arraySet(e.pending_buf, e.window, i, t, e.pending), e.pending += t;
}
function jt(e, i, t, r) {
  var a2 = i * 2, n = t * 2;
  return e[a2] < e[n] || e[a2] === e[n] && r[i] <= r[t];
}
function yt(e, i, t) {
  for (var r = e.heap[t], a2 = t << 1; a2 <= e.heap_len && (a2 < e.heap_len && jt(i, e.heap[a2 + 1], e.heap[a2], e.depth) && a2++, !jt(i, r, e.heap[a2], e.depth)); )
    e.heap[t] = e.heap[a2], t = a2, a2 <<= 1;
  e.heap[t] = r;
}
function Jt(e, i, t) {
  var r, a2, n = 0, l, o;
  if (e.last_lit !== 0)
    do
      r = e.pending_buf[e.d_buf + n * 2] << 8 | e.pending_buf[e.d_buf + n * 2 + 1], a2 = e.pending_buf[e.l_buf + n], n++, r === 0 ? ae(e, a2, i) : (l = We[a2], ae(e, l + Ve + 1, i), o = zt[l], o !== 0 && (a2 -= Mt[l], W(e, a2, o)), r--, l = Xr(r), ae(e, l, t), o = at[l], o !== 0 && (r -= ht[l], W(e, r, o)));
    while (n < e.last_lit);
  ae(e, Ct, i);
}
function xt(e, i) {
  var t = i.dyn_tree, r = i.stat_desc.static_tree, a2 = i.stat_desc.has_stree, n = i.stat_desc.elems, l, o, d = -1, f;
  for (e.heap_len = 0, e.heap_max = Pr, l = 0; l < n; l++)
    t[l * 2] !== 0 ? (e.heap[++e.heap_len] = d = l, e.depth[l] = 0) : t[l * 2 + 1] = 0;
  for (; e.heap_len < 2; )
    f = e.heap[++e.heap_len] = d < 2 ? ++d : 0, t[f * 2] = 1, e.depth[f] = 0, e.opt_len--, a2 && (e.static_len -= r[f * 2 + 1]);
  for (i.max_code = d, l = e.heap_len >> 1; l >= 1; l--)
    yt(e, t, l);
  f = n;
  do
    l = e.heap[
      1
      /*SMALLEST*/
    ], e.heap[
      1
      /*SMALLEST*/
    ] = e.heap[e.heap_len--], yt(
      e,
      t,
      1
      /*SMALLEST*/
    ), o = e.heap[
      1
      /*SMALLEST*/
    ], e.heap[--e.heap_max] = l, e.heap[--e.heap_max] = o, t[f * 2] = t[l * 2] + t[o * 2], e.depth[f] = (e.depth[l] >= e.depth[o] ? e.depth[l] : e.depth[o]) + 1, t[l * 2 + 1] = t[o * 2 + 1] = f, e.heap[
      1
      /*SMALLEST*/
    ] = f++, yt(
      e,
      t,
      1
      /*SMALLEST*/
    );
  while (e.heap_len >= 2);
  e.heap[--e.heap_max] = e.heap[
    1
    /*SMALLEST*/
  ], Ci(e, i), Vr(t, d, e.bl_count);
}
function Qt(e, i, t) {
  var r, a2 = -1, n, l = i[0 * 2 + 1], o = 0, d = 7, f = 4;
  for (l === 0 && (d = 138, f = 3), i[(t + 1) * 2 + 1] = 65535, r = 0; r <= t; r++)
    n = l, l = i[(r + 1) * 2 + 1], !(++o < d && n === l) && (o < f ? e.bl_tree[n * 2] += o : n !== 0 ? (n !== a2 && e.bl_tree[n * 2]++, e.bl_tree[Cr * 2]++) : o <= 10 ? e.bl_tree[Mr * 2]++ : e.bl_tree[Hr * 2]++, o = 0, a2 = n, l === 0 ? (d = 138, f = 3) : n === l ? (d = 6, f = 3) : (d = 7, f = 4));
}
function qt(e, i, t) {
  var r, a2 = -1, n, l = i[0 * 2 + 1], o = 0, d = 7, f = 4;
  for (l === 0 && (d = 138, f = 3), r = 0; r <= t; r++)
    if (n = l, l = i[(r + 1) * 2 + 1], !(++o < d && n === l)) {
      if (o < f)
        do
          ae(e, n, e.bl_tree);
        while (--o !== 0);
      else
        n !== 0 ? (n !== a2 && (ae(e, n, e.bl_tree), o--), ae(e, Cr, e.bl_tree), W(e, o - 3, 2)) : o <= 10 ? (ae(e, Mr, e.bl_tree), W(e, o - 3, 3)) : (ae(e, Hr, e.bl_tree), W(e, o - 11, 7));
      o = 0, a2 = n, l === 0 ? (d = 138, f = 3) : n === l ? (d = 6, f = 3) : (d = 7, f = 4);
    }
}
function $i(e) {
  var i;
  for (Qt(e, e.dyn_ltree, e.l_desc.max_code), Qt(e, e.dyn_dtree, e.d_desc.max_code), xt(e, e.bl_desc), i = Pt - 1; i >= 3 && e.bl_tree[$r[i] * 2 + 1] === 0; i--)
    ;
  return e.opt_len += 3 * (i + 1) + 5 + 5 + 4, i;
}
function Wi(e, i, t, r) {
  var a2;
  for (W(e, i - 257, 5), W(e, t - 1, 5), W(e, r - 4, 4), a2 = 0; a2 < r; a2++)
    W(e, e.bl_tree[$r[a2] * 2 + 1], 3);
  qt(e, e.dyn_ltree, i - 1), qt(e, e.dyn_dtree, t - 1);
}
function Gi(e) {
  var i = 4093624447, t;
  for (t = 0; t <= 31; t++, i >>>= 1)
    if (i & 1 && e.dyn_ltree[t * 2] !== 0)
      return Yt;
  if (e.dyn_ltree[9 * 2] !== 0 || e.dyn_ltree[10 * 2] !== 0 || e.dyn_ltree[13 * 2] !== 0)
    return Vt;
  for (t = 32; t < Ve; t++)
    if (e.dyn_ltree[t * 2] !== 0)
      return Vt;
  return Yt;
}
var er = false;
function Ki(e) {
  er || (Mi(), er = true), e.l_desc = new mt(e.dyn_ltree, Wr), e.d_desc = new mt(e.dyn_dtree, Gr), e.bl_desc = new mt(e.bl_tree, Kr), e.bi_buf = 0, e.bi_valid = 0, jr(e);
}
function Qr(e, i, t, r) {
  W(e, (zi << 1) + (r ? 1 : 0), 3), Hi(e, i, t);
}
function Xi(e) {
  W(e, Br << 1, 3), ae(e, Ct, ue), Pi(e);
}
function Yi(e, i, t, r) {
  var a2, n, l = 0;
  e.level > 0 ? (e.strm.data_type === Ni && (e.strm.data_type = Gi(e)), xt(e, e.l_desc), xt(e, e.d_desc), l = $i(e), a2 = e.opt_len + 3 + 7 >>> 3, n = e.static_len + 3 + 7 >>> 3, n <= a2 && (a2 = n)) : a2 = n = t + 5, t + 4 <= a2 && i !== -1 ? Qr(e, i, t, r) : e.strategy === Zi || n === a2 ? (W(e, (Br << 1) + (r ? 1 : 0), 3), Jt(e, ue, Pe)) : (W(e, (xi << 1) + (r ? 1 : 0), 3), Wi(e, e.l_desc.max_code + 1, e.d_desc.max_code + 1, l + 1), Jt(e, e.dyn_ltree, e.dyn_dtree)), jr(e), r && Jr(e);
}
function Vi(e, i, t) {
  return e.pending_buf[e.d_buf + e.last_lit * 2] = i >>> 8 & 255, e.pending_buf[e.d_buf + e.last_lit * 2 + 1] = i & 255, e.pending_buf[e.l_buf + e.last_lit] = t & 255, e.last_lit++, i === 0 ? e.dyn_ltree[t * 2]++ : (e.matches++, i--, e.dyn_ltree[(We[t] + Ve + 1) * 2]++, e.dyn_dtree[Xr(i) * 2]++), e.last_lit === e.lit_bufsize - 1;
}
xe._tr_init = Ki;
xe._tr_stored_block = Qr;
xe._tr_flush_block = Yi;
xe._tr_tally = Vi;
xe._tr_align = Xi;
function ji(e, i, t, r) {
  for (var a2 = e & 65535 | 0, n = e >>> 16 & 65535 | 0, l = 0; t !== 0; ) {
    l = t > 2e3 ? 2e3 : t, t -= l;
    do
      a2 = a2 + i[r++] | 0, n = n + a2 | 0;
    while (--l);
    a2 %= 65521, n %= 65521;
  }
  return a2 | n << 16 | 0;
}
var qr = ji;
function Ji() {
  for (var e, i = [], t = 0; t < 256; t++) {
    e = t;
    for (var r = 0; r < 8; r++)
      e = e & 1 ? 3988292384 ^ e >>> 1 : e >>> 1;
    i[t] = e;
  }
  return i;
}
var Qi = Ji();
function qi(e, i, t, r) {
  var a2 = Qi, n = r + t;
  e ^= -1;
  for (var l = r; l < n; l++)
    e = e >>> 8 ^ a2[(e ^ i[l]) & 255];
  return e ^ -1;
}
var ei = qi, ea = {
  2: "need dictionary",
  /* Z_NEED_DICT       2  */
  1: "stream end",
  /* Z_STREAM_END      1  */
  0: "",
  /* Z_OK              0  */
  "-1": "file error",
  /* Z_ERRNO         (-1) */
  "-2": "stream error",
  /* Z_STREAM_ERROR  (-2) */
  "-3": "data error",
  /* Z_DATA_ERROR    (-3) */
  "-4": "insufficient memory",
  /* Z_MEM_ERROR     (-4) */
  "-5": "buffer error",
  /* Z_BUF_ERROR     (-5) */
  "-6": "incompatible version"
  /* Z_VERSION_ERROR (-6) */
}, $ = Ye, Y = xe, ti = qr, _e = ei, ta = ea, Se = 0, ra = 1, ia = 3, be = 4, tr = 5, ne = 0, rr = 1, V = -2, aa = -3, kt = -5, na = -1, fa = 1, qe = 2, la = 3, oa = 4, ha = 0, sa = 2, _t = 8, ua = 9, da = 15, _a = 8, ca = 29, va = 256, Dt = va + 1 + ca, wa = 30, ga = 19, ba = 2 * Dt + 1, Ea = 15, Z = 3, we = 258, q = we + Z + 1, pa = 32, ct = 42, Ft = 69, nt = 73, ft = 91, lt = 103, me = 113, Be = 666, B = 1, je = 2, ye = 3, Fe = 4, ma = 3;
function ge(e, i) {
  return e.msg = ta[i], i;
}
function ir(e) {
  return (e << 1) - (e > 4 ? 9 : 0);
}
function ve(e) {
  for (var i = e.length; --i >= 0; )
    e[i] = 0;
}
function ce(e) {
  var i = e.state, t = i.pending;
  t > e.avail_out && (t = e.avail_out), t !== 0 && ($.arraySet(e.output, i.pending_buf, i.pending_out, t, e.next_out), e.next_out += t, i.pending_out += t, e.total_out += t, e.avail_out -= t, i.pending -= t, i.pending === 0 && (i.pending_out = 0));
}
function C(e, i) {
  Y._tr_flush_block(e, e.block_start >= 0 ? e.block_start : -1, e.strstart - e.block_start, i), e.block_start = e.strstart, ce(e.strm);
}
function N(e, i) {
  e.pending_buf[e.pending++] = i;
}
function Oe(e, i) {
  e.pending_buf[e.pending++] = i >>> 8 & 255, e.pending_buf[e.pending++] = i & 255;
}
function ya(e, i, t, r) {
  var a2 = e.avail_in;
  return a2 > r && (a2 = r), a2 === 0 ? 0 : (e.avail_in -= a2, $.arraySet(i, e.input, e.next_in, a2, t), e.state.wrap === 1 ? e.adler = ti(e.adler, i, a2, t) : e.state.wrap === 2 && (e.adler = _e(e.adler, i, a2, t)), e.next_in += a2, e.total_in += a2, a2);
}
function ri(e, i) {
  var t = e.max_chain_length, r = e.strstart, a2, n, l = e.prev_length, o = e.nice_match, d = e.strstart > e.w_size - q ? e.strstart - (e.w_size - q) : 0, f = e.window, h = e.w_mask, g = e.prev, _ = e.strstart + we, u = f[r + l - 1], v = f[r + l];
  e.prev_length >= e.good_match && (t >>= 2), o > e.lookahead && (o = e.lookahead);
  do
    if (a2 = i, !(f[a2 + l] !== v || f[a2 + l - 1] !== u || f[a2] !== f[r] || f[++a2] !== f[r + 1])) {
      r += 2, a2++;
      do
        ;
      while (f[++r] === f[++a2] && f[++r] === f[++a2] && f[++r] === f[++a2] && f[++r] === f[++a2] && f[++r] === f[++a2] && f[++r] === f[++a2] && f[++r] === f[++a2] && f[++r] === f[++a2] && r < _);
      if (n = we - (_ - r), r = _ - we, n > l) {
        if (e.match_start = i, l = n, n >= o)
          break;
        u = f[r + l - 1], v = f[r + l];
      }
    }
  while ((i = g[i & h]) > d && --t !== 0);
  return l <= e.lookahead ? l : e.lookahead;
}
function ke(e) {
  var i = e.w_size, t, r, a2, n, l;
  do {
    if (n = e.window_size - e.lookahead - e.strstart, e.strstart >= i + (i - q)) {
      $.arraySet(e.window, e.window, i, i, 0), e.match_start -= i, e.strstart -= i, e.block_start -= i, r = e.hash_size, t = r;
      do
        a2 = e.head[--t], e.head[t] = a2 >= i ? a2 - i : 0;
      while (--r);
      r = i, t = r;
      do
        a2 = e.prev[--t], e.prev[t] = a2 >= i ? a2 - i : 0;
      while (--r);
      n += i;
    }
    if (e.strm.avail_in === 0)
      break;
    if (r = ya(e.strm, e.window, e.strstart + e.lookahead, n), e.lookahead += r, e.lookahead + e.insert >= Z)
      for (l = e.strstart - e.insert, e.ins_h = e.window[l], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[l + 1]) & e.hash_mask; e.insert && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[l + Z - 1]) & e.hash_mask, e.prev[l & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = l, l++, e.insert--, !(e.lookahead + e.insert < Z)); )
        ;
  } while (e.lookahead < q && e.strm.avail_in !== 0);
}
function ka(e, i) {
  var t = 65535;
  for (t > e.pending_buf_size - 5 && (t = e.pending_buf_size - 5); ; ) {
    if (e.lookahead <= 1) {
      if (ke(e), e.lookahead === 0 && i === Se)
        return B;
      if (e.lookahead === 0)
        break;
    }
    e.strstart += e.lookahead, e.lookahead = 0;
    var r = e.block_start + t;
    if ((e.strstart === 0 || e.strstart >= r) && (e.lookahead = e.strstart - r, e.strstart = r, C(e, false), e.strm.avail_out === 0) || e.strstart - e.block_start >= e.w_size - q && (C(e, false), e.strm.avail_out === 0))
      return B;
  }
  return e.insert = 0, i === be ? (C(e, true), e.strm.avail_out === 0 ? ye : Fe) : (e.strstart > e.block_start && (C(e, false), e.strm.avail_out === 0), B);
}
function Tt(e, i) {
  for (var t, r; ; ) {
    if (e.lookahead < q) {
      if (ke(e), e.lookahead < q && i === Se)
        return B;
      if (e.lookahead === 0)
        break;
    }
    if (t = 0, e.lookahead >= Z && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + Z - 1]) & e.hash_mask, t = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), t !== 0 && e.strstart - t <= e.w_size - q && (e.match_length = ri(e, t)), e.match_length >= Z)
      if (r = Y._tr_tally(e, e.strstart - e.match_start, e.match_length - Z), e.lookahead -= e.match_length, e.match_length <= e.max_lazy_match && e.lookahead >= Z) {
        e.match_length--;
        do
          e.strstart++, e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + Z - 1]) & e.hash_mask, t = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart;
        while (--e.match_length !== 0);
        e.strstart++;
      } else
        e.strstart += e.match_length, e.match_length = 0, e.ins_h = e.window[e.strstart], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 1]) & e.hash_mask;
    else
      r = Y._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++;
    if (r && (C(e, false), e.strm.avail_out === 0))
      return B;
  }
  return e.insert = e.strstart < Z - 1 ? e.strstart : Z - 1, i === be ? (C(e, true), e.strm.avail_out === 0 ? ye : Fe) : e.last_lit && (C(e, false), e.strm.avail_out === 0) ? B : je;
}
function Le(e, i) {
  for (var t, r, a2; ; ) {
    if (e.lookahead < q) {
      if (ke(e), e.lookahead < q && i === Se)
        return B;
      if (e.lookahead === 0)
        break;
    }
    if (t = 0, e.lookahead >= Z && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + Z - 1]) & e.hash_mask, t = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), e.prev_length = e.match_length, e.prev_match = e.match_start, e.match_length = Z - 1, t !== 0 && e.prev_length < e.max_lazy_match && e.strstart - t <= e.w_size - q && (e.match_length = ri(e, t), e.match_length <= 5 && (e.strategy === fa || e.match_length === Z && e.strstart - e.match_start > 4096) && (e.match_length = Z - 1)), e.prev_length >= Z && e.match_length <= e.prev_length) {
      a2 = e.strstart + e.lookahead - Z, r = Y._tr_tally(e, e.strstart - 1 - e.prev_match, e.prev_length - Z), e.lookahead -= e.prev_length - 1, e.prev_length -= 2;
      do
        ++e.strstart <= a2 && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + Z - 1]) & e.hash_mask, t = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart);
      while (--e.prev_length !== 0);
      if (e.match_available = 0, e.match_length = Z - 1, e.strstart++, r && (C(e, false), e.strm.avail_out === 0))
        return B;
    } else if (e.match_available) {
      if (r = Y._tr_tally(e, 0, e.window[e.strstart - 1]), r && C(e, false), e.strstart++, e.lookahead--, e.strm.avail_out === 0)
        return B;
    } else
      e.match_available = 1, e.strstart++, e.lookahead--;
  }
  return e.match_available && (r = Y._tr_tally(e, 0, e.window[e.strstart - 1]), e.match_available = 0), e.insert = e.strstart < Z - 1 ? e.strstart : Z - 1, i === be ? (C(e, true), e.strm.avail_out === 0 ? ye : Fe) : e.last_lit && (C(e, false), e.strm.avail_out === 0) ? B : je;
}
function Ta(e, i) {
  for (var t, r, a2, n, l = e.window; ; ) {
    if (e.lookahead <= we) {
      if (ke(e), e.lookahead <= we && i === Se)
        return B;
      if (e.lookahead === 0)
        break;
    }
    if (e.match_length = 0, e.lookahead >= Z && e.strstart > 0 && (a2 = e.strstart - 1, r = l[a2], r === l[++a2] && r === l[++a2] && r === l[++a2])) {
      n = e.strstart + we;
      do
        ;
      while (r === l[++a2] && r === l[++a2] && r === l[++a2] && r === l[++a2] && r === l[++a2] && r === l[++a2] && r === l[++a2] && r === l[++a2] && a2 < n);
      e.match_length = we - (n - a2), e.match_length > e.lookahead && (e.match_length = e.lookahead);
    }
    if (e.match_length >= Z ? (t = Y._tr_tally(e, 1, e.match_length - Z), e.lookahead -= e.match_length, e.strstart += e.match_length, e.match_length = 0) : (t = Y._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++), t && (C(e, false), e.strm.avail_out === 0))
      return B;
  }
  return e.insert = 0, i === be ? (C(e, true), e.strm.avail_out === 0 ? ye : Fe) : e.last_lit && (C(e, false), e.strm.avail_out === 0) ? B : je;
}
function Sa(e, i) {
  for (var t; ; ) {
    if (e.lookahead === 0 && (ke(e), e.lookahead === 0)) {
      if (i === Se)
        return B;
      break;
    }
    if (e.match_length = 0, t = Y._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++, t && (C(e, false), e.strm.avail_out === 0))
      return B;
  }
  return e.insert = 0, i === be ? (C(e, true), e.strm.avail_out === 0 ? ye : Fe) : e.last_lit && (C(e, false), e.strm.avail_out === 0) ? B : je;
}
function re(e, i, t, r, a2) {
  this.good_length = e, this.max_lazy = i, this.nice_length = t, this.max_chain = r, this.func = a2;
}
var Ne;
Ne = [
  /*      good lazy nice chain */
  new re(0, 0, 0, 0, ka),
  /* 0 store only */
  new re(4, 4, 8, 4, Tt),
  /* 1 max speed, no lazy matches */
  new re(4, 5, 16, 8, Tt),
  /* 2 */
  new re(4, 6, 32, 32, Tt),
  /* 3 */
  new re(4, 4, 16, 16, Le),
  /* 4 lazy matches */
  new re(8, 16, 32, 32, Le),
  /* 5 */
  new re(8, 16, 128, 128, Le),
  /* 6 */
  new re(8, 32, 128, 256, Le),
  /* 7 */
  new re(32, 128, 258, 1024, Le),
  /* 8 */
  new re(32, 258, 258, 4096, Le)
  /* 9 max compression */
];
function Ra(e) {
  e.window_size = 2 * e.w_size, ve(e.head), e.max_lazy_match = Ne[e.level].max_lazy, e.good_match = Ne[e.level].good_length, e.nice_match = Ne[e.level].nice_length, e.max_chain_length = Ne[e.level].max_chain, e.strstart = 0, e.block_start = 0, e.lookahead = 0, e.insert = 0, e.match_length = e.prev_length = Z - 1, e.match_available = 0, e.ins_h = 0;
}
function La() {
  this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = _t, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new $.Buf16(ba * 2), this.dyn_dtree = new $.Buf16((2 * wa + 1) * 2), this.bl_tree = new $.Buf16((2 * ga + 1) * 2), ve(this.dyn_ltree), ve(this.dyn_dtree), ve(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new $.Buf16(Ea + 1), this.heap = new $.Buf16(2 * Dt + 1), ve(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new $.Buf16(2 * Dt + 1), ve(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
}
function ii(e) {
  var i;
  return !e || !e.state ? ge(e, V) : (e.total_in = e.total_out = 0, e.data_type = sa, i = e.state, i.pending = 0, i.pending_out = 0, i.wrap < 0 && (i.wrap = -i.wrap), i.status = i.wrap ? ct : me, e.adler = i.wrap === 2 ? 0 : 1, i.last_flush = Se, Y._tr_init(i), ne);
}
function ai(e) {
  var i = ii(e);
  return i === ne && Ra(e.state), i;
}
function Aa(e, i) {
  return !e || !e.state || e.state.wrap !== 2 ? V : (e.state.gzhead = i, ne);
}
function ni(e, i, t, r, a2, n) {
  if (!e)
    return V;
  var l = 1;
  if (i === na && (i = 6), r < 0 ? (l = 0, r = -r) : r > 15 && (l = 2, r -= 16), a2 < 1 || a2 > ua || t !== _t || r < 8 || r > 15 || i < 0 || i > 9 || n < 0 || n > oa)
    return ge(e, V);
  r === 8 && (r = 9);
  var o = new La();
  return e.state = o, o.strm = e, o.wrap = l, o.gzhead = null, o.w_bits = r, o.w_size = 1 << o.w_bits, o.w_mask = o.w_size - 1, o.hash_bits = a2 + 7, o.hash_size = 1 << o.hash_bits, o.hash_mask = o.hash_size - 1, o.hash_shift = ~~((o.hash_bits + Z - 1) / Z), o.window = new $.Buf8(o.w_size * 2), o.head = new $.Buf16(o.hash_size), o.prev = new $.Buf16(o.w_size), o.lit_bufsize = 1 << a2 + 6, o.pending_buf_size = o.lit_bufsize * 4, o.pending_buf = new $.Buf8(o.pending_buf_size), o.d_buf = 1 * o.lit_bufsize, o.l_buf = (1 + 2) * o.lit_bufsize, o.level = i, o.strategy = n, o.method = t, ai(e);
}
function Ia(e, i) {
  return ni(e, i, _t, da, _a, ha);
}
function Za(e, i) {
  var t, r, a2, n;
  if (!e || !e.state || i > tr || i < 0)
    return e ? ge(e, V) : V;
  if (r = e.state, !e.output || !e.input && e.avail_in !== 0 || r.status === Be && i !== be)
    return ge(e, e.avail_out === 0 ? kt : V);
  if (r.strm = e, t = r.last_flush, r.last_flush = i, r.status === ct)
    if (r.wrap === 2)
      e.adler = 0, N(r, 31), N(r, 139), N(r, 8), r.gzhead ? (N(
        r,
        (r.gzhead.text ? 1 : 0) + (r.gzhead.hcrc ? 2 : 0) + (r.gzhead.extra ? 4 : 0) + (r.gzhead.name ? 8 : 0) + (r.gzhead.comment ? 16 : 0)
      ), N(r, r.gzhead.time & 255), N(r, r.gzhead.time >> 8 & 255), N(r, r.gzhead.time >> 16 & 255), N(r, r.gzhead.time >> 24 & 255), N(r, r.level === 9 ? 2 : r.strategy >= qe || r.level < 2 ? 4 : 0), N(r, r.gzhead.os & 255), r.gzhead.extra && r.gzhead.extra.length && (N(r, r.gzhead.extra.length & 255), N(r, r.gzhead.extra.length >> 8 & 255)), r.gzhead.hcrc && (e.adler = _e(e.adler, r.pending_buf, r.pending, 0)), r.gzindex = 0, r.status = Ft) : (N(r, 0), N(r, 0), N(r, 0), N(r, 0), N(r, 0), N(r, r.level === 9 ? 2 : r.strategy >= qe || r.level < 2 ? 4 : 0), N(r, ma), r.status = me);
    else {
      var l = _t + (r.w_bits - 8 << 4) << 8, o = -1;
      r.strategy >= qe || r.level < 2 ? o = 0 : r.level < 6 ? o = 1 : r.level === 6 ? o = 2 : o = 3, l |= o << 6, r.strstart !== 0 && (l |= pa), l += 31 - l % 31, r.status = me, Oe(r, l), r.strstart !== 0 && (Oe(r, e.adler >>> 16), Oe(r, e.adler & 65535)), e.adler = 1;
    }
  if (r.status === Ft)
    if (r.gzhead.extra) {
      for (a2 = r.pending; r.gzindex < (r.gzhead.extra.length & 65535) && !(r.pending === r.pending_buf_size && (r.gzhead.hcrc && r.pending > a2 && (e.adler = _e(e.adler, r.pending_buf, r.pending - a2, a2)), ce(e), a2 = r.pending, r.pending === r.pending_buf_size)); )
        N(r, r.gzhead.extra[r.gzindex] & 255), r.gzindex++;
      r.gzhead.hcrc && r.pending > a2 && (e.adler = _e(e.adler, r.pending_buf, r.pending - a2, a2)), r.gzindex === r.gzhead.extra.length && (r.gzindex = 0, r.status = nt);
    } else
      r.status = nt;
  if (r.status === nt)
    if (r.gzhead.name) {
      a2 = r.pending;
      do {
        if (r.pending === r.pending_buf_size && (r.gzhead.hcrc && r.pending > a2 && (e.adler = _e(e.adler, r.pending_buf, r.pending - a2, a2)), ce(e), a2 = r.pending, r.pending === r.pending_buf_size)) {
          n = 1;
          break;
        }
        r.gzindex < r.gzhead.name.length ? n = r.gzhead.name.charCodeAt(r.gzindex++) & 255 : n = 0, N(r, n);
      } while (n !== 0);
      r.gzhead.hcrc && r.pending > a2 && (e.adler = _e(e.adler, r.pending_buf, r.pending - a2, a2)), n === 0 && (r.gzindex = 0, r.status = ft);
    } else
      r.status = ft;
  if (r.status === ft)
    if (r.gzhead.comment) {
      a2 = r.pending;
      do {
        if (r.pending === r.pending_buf_size && (r.gzhead.hcrc && r.pending > a2 && (e.adler = _e(e.adler, r.pending_buf, r.pending - a2, a2)), ce(e), a2 = r.pending, r.pending === r.pending_buf_size)) {
          n = 1;
          break;
        }
        r.gzindex < r.gzhead.comment.length ? n = r.gzhead.comment.charCodeAt(r.gzindex++) & 255 : n = 0, N(r, n);
      } while (n !== 0);
      r.gzhead.hcrc && r.pending > a2 && (e.adler = _e(e.adler, r.pending_buf, r.pending - a2, a2)), n === 0 && (r.status = lt);
    } else
      r.status = lt;
  if (r.status === lt && (r.gzhead.hcrc ? (r.pending + 2 > r.pending_buf_size && ce(e), r.pending + 2 <= r.pending_buf_size && (N(r, e.adler & 255), N(r, e.adler >> 8 & 255), e.adler = 0, r.status = me)) : r.status = me), r.pending !== 0) {
    if (ce(e), e.avail_out === 0)
      return r.last_flush = -1, ne;
  } else if (e.avail_in === 0 && ir(i) <= ir(t) && i !== be)
    return ge(e, kt);
  if (r.status === Be && e.avail_in !== 0)
    return ge(e, kt);
  if (e.avail_in !== 0 || r.lookahead !== 0 || i !== Se && r.status !== Be) {
    var d = r.strategy === qe ? Sa(r, i) : r.strategy === la ? Ta(r, i) : Ne[r.level].func(r, i);
    if ((d === ye || d === Fe) && (r.status = Be), d === B || d === ye)
      return e.avail_out === 0 && (r.last_flush = -1), ne;
    if (d === je && (i === ra ? Y._tr_align(r) : i !== tr && (Y._tr_stored_block(r, 0, 0, false), i === ia && (ve(r.head), r.lookahead === 0 && (r.strstart = 0, r.block_start = 0, r.insert = 0))), ce(e), e.avail_out === 0))
      return r.last_flush = -1, ne;
  }
  return i !== be ? ne : r.wrap <= 0 ? rr : (r.wrap === 2 ? (N(r, e.adler & 255), N(r, e.adler >> 8 & 255), N(r, e.adler >> 16 & 255), N(r, e.adler >> 24 & 255), N(r, e.total_in & 255), N(r, e.total_in >> 8 & 255), N(r, e.total_in >> 16 & 255), N(r, e.total_in >> 24 & 255)) : (Oe(r, e.adler >>> 16), Oe(r, e.adler & 65535)), ce(e), r.wrap > 0 && (r.wrap = -r.wrap), r.pending !== 0 ? ne : rr);
}
function Na(e) {
  var i;
  return !e || !e.state ? V : (i = e.state.status, i !== ct && i !== Ft && i !== nt && i !== ft && i !== lt && i !== me && i !== Be ? ge(e, V) : (e.state = null, i === me ? ge(e, aa) : ne));
}
function za(e, i) {
  var t = i.length, r, a2, n, l, o, d, f, h;
  if (!e || !e.state || (r = e.state, l = r.wrap, l === 2 || l === 1 && r.status !== ct || r.lookahead))
    return V;
  for (l === 1 && (e.adler = ti(e.adler, i, t, 0)), r.wrap = 0, t >= r.w_size && (l === 0 && (ve(r.head), r.strstart = 0, r.block_start = 0, r.insert = 0), h = new $.Buf8(r.w_size), $.arraySet(h, i, t - r.w_size, r.w_size, 0), i = h, t = r.w_size), o = e.avail_in, d = e.next_in, f = e.input, e.avail_in = t, e.next_in = 0, e.input = i, ke(r); r.lookahead >= Z; ) {
    a2 = r.strstart, n = r.lookahead - (Z - 1);
    do
      r.ins_h = (r.ins_h << r.hash_shift ^ r.window[a2 + Z - 1]) & r.hash_mask, r.prev[a2 & r.w_mask] = r.head[r.ins_h], r.head[r.ins_h] = a2, a2++;
    while (--n);
    r.strstart = a2, r.lookahead = Z - 1, ke(r);
  }
  return r.strstart += r.lookahead, r.block_start = r.strstart, r.insert = r.lookahead, r.lookahead = 0, r.match_length = r.prev_length = Z - 1, r.match_available = 0, e.next_in = d, e.input = f, e.avail_in = o, r.wrap = l, ne;
}
he.deflateInit = Ia;
he.deflateInit2 = ni;
he.deflateReset = ai;
he.deflateResetKeep = ii;
he.deflateSetHeader = Aa;
he.deflate = Za;
he.deflateEnd = Na;
he.deflateSetDictionary = za;
he.deflateInfo = "pako deflate (from Nodeca project)";
var ee = {}, et = 30, xa = 12, Da = function(i, t) {
  var r, a2, n, l, o, d, f, h, g, _, u, v, b, E, p, S2, I, m, w, k, R, T, y, D, A;
  r = i.state, a2 = i.next_in, D = i.input, n = a2 + (i.avail_in - 5), l = i.next_out, A = i.output, o = l - (t - i.avail_out), d = l + (i.avail_out - 257), f = r.dmax, h = r.wsize, g = r.whave, _ = r.wnext, u = r.window, v = r.hold, b = r.bits, E = r.lencode, p = r.distcode, S2 = (1 << r.lenbits) - 1, I = (1 << r.distbits) - 1;
  e:
    do {
      b < 15 && (v += D[a2++] << b, b += 8, v += D[a2++] << b, b += 8), m = E[v & S2];
      t:
        for (; ; ) {
          if (w = m >>> 24, v >>>= w, b -= w, w = m >>> 16 & 255, w === 0)
            A[l++] = m & 65535;
          else if (w & 16) {
            k = m & 65535, w &= 15, w && (b < w && (v += D[a2++] << b, b += 8), k += v & (1 << w) - 1, v >>>= w, b -= w), b < 15 && (v += D[a2++] << b, b += 8, v += D[a2++] << b, b += 8), m = p[v & I];
            r:
              for (; ; ) {
                if (w = m >>> 24, v >>>= w, b -= w, w = m >>> 16 & 255, w & 16) {
                  if (R = m & 65535, w &= 15, b < w && (v += D[a2++] << b, b += 8, b < w && (v += D[a2++] << b, b += 8)), R += v & (1 << w) - 1, R > f) {
                    i.msg = "invalid distance too far back", r.mode = et;
                    break e;
                  }
                  if (v >>>= w, b -= w, w = l - o, R > w) {
                    if (w = R - w, w > g && r.sane) {
                      i.msg = "invalid distance too far back", r.mode = et;
                      break e;
                    }
                    if (T = 0, y = u, _ === 0) {
                      if (T += h - w, w < k) {
                        k -= w;
                        do
                          A[l++] = u[T++];
                        while (--w);
                        T = l - R, y = A;
                      }
                    } else if (_ < w) {
                      if (T += h + _ - w, w -= _, w < k) {
                        k -= w;
                        do
                          A[l++] = u[T++];
                        while (--w);
                        if (T = 0, _ < k) {
                          w = _, k -= w;
                          do
                            A[l++] = u[T++];
                          while (--w);
                          T = l - R, y = A;
                        }
                      }
                    } else if (T += _ - w, w < k) {
                      k -= w;
                      do
                        A[l++] = u[T++];
                      while (--w);
                      T = l - R, y = A;
                    }
                    for (; k > 2; )
                      A[l++] = y[T++], A[l++] = y[T++], A[l++] = y[T++], k -= 3;
                    k && (A[l++] = y[T++], k > 1 && (A[l++] = y[T++]));
                  } else {
                    T = l - R;
                    do
                      A[l++] = A[T++], A[l++] = A[T++], A[l++] = A[T++], k -= 3;
                    while (k > 2);
                    k && (A[l++] = A[T++], k > 1 && (A[l++] = A[T++]));
                  }
                } else if (w & 64) {
                  i.msg = "invalid distance code", r.mode = et;
                  break e;
                } else {
                  m = p[(m & 65535) + (v & (1 << w) - 1)];
                  continue r;
                }
                break;
              }
          } else if (w & 64)
            if (w & 32) {
              r.mode = xa;
              break e;
            } else {
              i.msg = "invalid literal/length code", r.mode = et;
              break e;
            }
          else {
            m = E[(m & 65535) + (v & (1 << w) - 1)];
            continue t;
          }
          break;
        }
    } while (a2 < n && l < d);
  k = b >> 3, a2 -= k, b -= k << 3, v &= (1 << b) - 1, i.next_in = a2, i.next_out = l, i.avail_in = a2 < n ? 5 + (n - a2) : 5 - (a2 - n), i.avail_out = l < d ? 257 + (d - l) : 257 - (l - d), r.hold = v, r.bits = b;
}, ar = Ye, Ae = 15, nr = 852, fr = 592, lr = 0, St = 1, or = 2, Fa = [
  /* Length codes 257..285 base */
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
], Oa = [
  /* Length codes 257..285 extra */
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  72,
  78
], Ua = [
  /* Distance codes 0..29 base */
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
], Ba = [
  /* Distance codes 0..29 extra */
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
], Pa = function(i, t, r, a2, n, l, o, d) {
  var f = d.bits, h = 0, g = 0, _ = 0, u = 0, v = 0, b = 0, E = 0, p = 0, S2 = 0, I = 0, m, w, k, R, T, y = null, D = 0, A, s = new ar.Buf16(Ae + 1), c = new ar.Buf16(Ae + 1), L = null, z = 0, O, U, x;
  for (h = 0; h <= Ae; h++)
    s[h] = 0;
  for (g = 0; g < a2; g++)
    s[t[r + g]]++;
  for (v = f, u = Ae; u >= 1 && s[u] === 0; u--)
    ;
  if (v > u && (v = u), u === 0)
    return n[l++] = 1 << 24 | 64 << 16 | 0, n[l++] = 1 << 24 | 64 << 16 | 0, d.bits = 1, 0;
  for (_ = 1; _ < u && s[_] === 0; _++)
    ;
  for (v < _ && (v = _), p = 1, h = 1; h <= Ae; h++)
    if (p <<= 1, p -= s[h], p < 0)
      return -1;
  if (p > 0 && (i === lr || u !== 1))
    return -1;
  for (c[1] = 0, h = 1; h < Ae; h++)
    c[h + 1] = c[h] + s[h];
  for (g = 0; g < a2; g++)
    t[r + g] !== 0 && (o[c[t[r + g]]++] = g);
  if (i === lr ? (y = L = o, A = 19) : i === St ? (y = Fa, D -= 257, L = Oa, z -= 257, A = 256) : (y = Ua, L = Ba, A = -1), I = 0, g = 0, h = _, T = l, b = v, E = 0, k = -1, S2 = 1 << v, R = S2 - 1, i === St && S2 > nr || i === or && S2 > fr)
    return 1;
  for (; ; ) {
    O = h - E, o[g] < A ? (U = 0, x = o[g]) : o[g] > A ? (U = L[z + o[g]], x = y[D + o[g]]) : (U = 32 + 64, x = 0), m = 1 << h - E, w = 1 << b, _ = w;
    do
      w -= m, n[T + (I >> E) + w] = O << 24 | U << 16 | x | 0;
    while (w !== 0);
    for (m = 1 << h - 1; I & m; )
      m >>= 1;
    if (m !== 0 ? (I &= m - 1, I += m) : I = 0, g++, --s[h] === 0) {
      if (h === u)
        break;
      h = t[r + o[g]];
    }
    if (h > v && (I & R) !== k) {
      for (E === 0 && (E = v), T += _, b = h - E, p = 1 << b; b + E < u && (p -= s[b + E], !(p <= 0)); )
        b++, p <<= 1;
      if (S2 += 1 << b, i === St && S2 > nr || i === or && S2 > fr)
        return 1;
      k = I & R, n[k] = v << 24 | b << 16 | T - l | 0;
    }
  }
  return I !== 0 && (n[T + I] = h - E << 24 | 64 << 16 | 0), d.bits = v, 0;
}, K = Ye, Ot = qr, ie = ei, Ca = Da, Ce = Pa, Ma = 0, fi = 1, li = 2, hr = 4, Ha = 5, tt = 6, Te = 0, $a = 1, Wa = 2, j = -2, oi = -3, hi = -4, Ga = -5, sr = 8, si = 1, ur = 2, dr = 3, _r = 4, cr = 5, vr = 6, wr = 7, gr = 8, br = 9, Er = 10, st = 11, se = 12, Rt = 13, pr = 14, Lt = 15, mr = 16, yr = 17, kr = 18, Tr = 19, rt = 20, it = 21, Sr = 22, Rr = 23, Lr = 24, Ar = 25, Ir = 26, At = 27, Zr = 28, Nr = 29, F = 30, ui = 31, Ka = 32, Xa = 852, Ya = 592, Va = 15, ja = Va;
function zr(e) {
  return (e >>> 24 & 255) + (e >>> 8 & 65280) + ((e & 65280) << 8) + ((e & 255) << 24);
}
function Ja() {
  this.mode = 0, this.last = false, this.wrap = 0, this.havedict = false, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new K.Buf16(320), this.work = new K.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
}
function di(e) {
  var i;
  return !e || !e.state ? j : (i = e.state, e.total_in = e.total_out = i.total = 0, e.msg = "", i.wrap && (e.adler = i.wrap & 1), i.mode = si, i.last = 0, i.havedict = 0, i.dmax = 32768, i.head = null, i.hold = 0, i.bits = 0, i.lencode = i.lendyn = new K.Buf32(Xa), i.distcode = i.distdyn = new K.Buf32(Ya), i.sane = 1, i.back = -1, Te);
}
function _i(e) {
  var i;
  return !e || !e.state ? j : (i = e.state, i.wsize = 0, i.whave = 0, i.wnext = 0, di(e));
}
function ci(e, i) {
  var t, r;
  return !e || !e.state || (r = e.state, i < 0 ? (t = 0, i = -i) : (t = (i >> 4) + 1, i < 48 && (i &= 15)), i && (i < 8 || i > 15)) ? j : (r.window !== null && r.wbits !== i && (r.window = null), r.wrap = t, r.wbits = i, _i(e));
}
function vi(e, i) {
  var t, r;
  return e ? (r = new Ja(), e.state = r, r.window = null, t = ci(e, i), t !== Te && (e.state = null), t) : j;
}
function Qa(e) {
  return vi(e, ja);
}
var xr = true, It, Zt;
function qa(e) {
  if (xr) {
    var i;
    for (It = new K.Buf32(512), Zt = new K.Buf32(32), i = 0; i < 144; )
      e.lens[i++] = 8;
    for (; i < 256; )
      e.lens[i++] = 9;
    for (; i < 280; )
      e.lens[i++] = 7;
    for (; i < 288; )
      e.lens[i++] = 8;
    for (Ce(fi, e.lens, 0, 288, It, 0, e.work, { bits: 9 }), i = 0; i < 32; )
      e.lens[i++] = 5;
    Ce(li, e.lens, 0, 32, Zt, 0, e.work, { bits: 5 }), xr = false;
  }
  e.lencode = It, e.lenbits = 9, e.distcode = Zt, e.distbits = 5;
}
function wi(e, i, t, r) {
  var a2, n = e.state;
  return n.window === null && (n.wsize = 1 << n.wbits, n.wnext = 0, n.whave = 0, n.window = new K.Buf8(n.wsize)), r >= n.wsize ? (K.arraySet(n.window, i, t - n.wsize, n.wsize, 0), n.wnext = 0, n.whave = n.wsize) : (a2 = n.wsize - n.wnext, a2 > r && (a2 = r), K.arraySet(n.window, i, t - r, a2, n.wnext), r -= a2, r ? (K.arraySet(n.window, i, t - r, r, 0), n.wnext = r, n.whave = n.wsize) : (n.wnext += a2, n.wnext === n.wsize && (n.wnext = 0), n.whave < n.wsize && (n.whave += a2))), 0;
}
function en(e, i) {
  var t, r, a2, n, l, o, d, f, h, g, _, u, v, b, E = 0, p, S2, I, m, w, k, R, T, y = new K.Buf8(4), D, A, s = (
    /* permutation of code lengths */
    [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
  );
  if (!e || !e.state || !e.output || !e.input && e.avail_in !== 0)
    return j;
  t = e.state, t.mode === se && (t.mode = Rt), l = e.next_out, a2 = e.output, d = e.avail_out, n = e.next_in, r = e.input, o = e.avail_in, f = t.hold, h = t.bits, g = o, _ = d, T = Te;
  e:
    for (; ; )
      switch (t.mode) {
        case si:
          if (t.wrap === 0) {
            t.mode = Rt;
            break;
          }
          for (; h < 16; ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          if (t.wrap & 2 && f === 35615) {
            t.check = 0, y[0] = f & 255, y[1] = f >>> 8 & 255, t.check = ie(t.check, y, 2, 0), f = 0, h = 0, t.mode = ur;
            break;
          }
          if (t.flags = 0, t.head && (t.head.done = false), !(t.wrap & 1) || /* check if zlib header allowed */
          (((f & 255) << 8) + (f >> 8)) % 31) {
            e.msg = "incorrect header check", t.mode = F;
            break;
          }
          if ((f & 15) !== sr) {
            e.msg = "unknown compression method", t.mode = F;
            break;
          }
          if (f >>>= 4, h -= 4, R = (f & 15) + 8, t.wbits === 0)
            t.wbits = R;
          else if (R > t.wbits) {
            e.msg = "invalid window size", t.mode = F;
            break;
          }
          t.dmax = 1 << R, e.adler = t.check = 1, t.mode = f & 512 ? Er : se, f = 0, h = 0;
          break;
        case ur:
          for (; h < 16; ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          if (t.flags = f, (t.flags & 255) !== sr) {
            e.msg = "unknown compression method", t.mode = F;
            break;
          }
          if (t.flags & 57344) {
            e.msg = "unknown header flags set", t.mode = F;
            break;
          }
          t.head && (t.head.text = f >> 8 & 1), t.flags & 512 && (y[0] = f & 255, y[1] = f >>> 8 & 255, t.check = ie(t.check, y, 2, 0)), f = 0, h = 0, t.mode = dr;
        case dr:
          for (; h < 32; ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          t.head && (t.head.time = f), t.flags & 512 && (y[0] = f & 255, y[1] = f >>> 8 & 255, y[2] = f >>> 16 & 255, y[3] = f >>> 24 & 255, t.check = ie(t.check, y, 4, 0)), f = 0, h = 0, t.mode = _r;
        case _r:
          for (; h < 16; ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          t.head && (t.head.xflags = f & 255, t.head.os = f >> 8), t.flags & 512 && (y[0] = f & 255, y[1] = f >>> 8 & 255, t.check = ie(t.check, y, 2, 0)), f = 0, h = 0, t.mode = cr;
        case cr:
          if (t.flags & 1024) {
            for (; h < 16; ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            t.length = f, t.head && (t.head.extra_len = f), t.flags & 512 && (y[0] = f & 255, y[1] = f >>> 8 & 255, t.check = ie(t.check, y, 2, 0)), f = 0, h = 0;
          } else
            t.head && (t.head.extra = null);
          t.mode = vr;
        case vr:
          if (t.flags & 1024 && (u = t.length, u > o && (u = o), u && (t.head && (R = t.head.extra_len - t.length, t.head.extra || (t.head.extra = new Array(t.head.extra_len)), K.arraySet(
            t.head.extra,
            r,
            n,
            // extra field is limited to 65536 bytes
            // - no need for additional size check
            u,
            /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
            R
          )), t.flags & 512 && (t.check = ie(t.check, r, u, n)), o -= u, n += u, t.length -= u), t.length))
            break e;
          t.length = 0, t.mode = wr;
        case wr:
          if (t.flags & 2048) {
            if (o === 0)
              break e;
            u = 0;
            do
              R = r[n + u++], t.head && R && t.length < 65536 && (t.head.name += String.fromCharCode(R));
            while (R && u < o);
            if (t.flags & 512 && (t.check = ie(t.check, r, u, n)), o -= u, n += u, R)
              break e;
          } else
            t.head && (t.head.name = null);
          t.length = 0, t.mode = gr;
        case gr:
          if (t.flags & 4096) {
            if (o === 0)
              break e;
            u = 0;
            do
              R = r[n + u++], t.head && R && t.length < 65536 && (t.head.comment += String.fromCharCode(R));
            while (R && u < o);
            if (t.flags & 512 && (t.check = ie(t.check, r, u, n)), o -= u, n += u, R)
              break e;
          } else
            t.head && (t.head.comment = null);
          t.mode = br;
        case br:
          if (t.flags & 512) {
            for (; h < 16; ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            if (f !== (t.check & 65535)) {
              e.msg = "header crc mismatch", t.mode = F;
              break;
            }
            f = 0, h = 0;
          }
          t.head && (t.head.hcrc = t.flags >> 9 & 1, t.head.done = true), e.adler = t.check = 0, t.mode = se;
          break;
        case Er:
          for (; h < 32; ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          e.adler = t.check = zr(f), f = 0, h = 0, t.mode = st;
        case st:
          if (t.havedict === 0)
            return e.next_out = l, e.avail_out = d, e.next_in = n, e.avail_in = o, t.hold = f, t.bits = h, Wa;
          e.adler = t.check = 1, t.mode = se;
        case se:
          if (i === Ha || i === tt)
            break e;
        case Rt:
          if (t.last) {
            f >>>= h & 7, h -= h & 7, t.mode = At;
            break;
          }
          for (; h < 3; ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          switch (t.last = f & 1, f >>>= 1, h -= 1, f & 3) {
            case 0:
              t.mode = pr;
              break;
            case 1:
              if (qa(t), t.mode = rt, i === tt) {
                f >>>= 2, h -= 2;
                break e;
              }
              break;
            case 2:
              t.mode = yr;
              break;
            case 3:
              e.msg = "invalid block type", t.mode = F;
          }
          f >>>= 2, h -= 2;
          break;
        case pr:
          for (f >>>= h & 7, h -= h & 7; h < 32; ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          if ((f & 65535) !== (f >>> 16 ^ 65535)) {
            e.msg = "invalid stored block lengths", t.mode = F;
            break;
          }
          if (t.length = f & 65535, f = 0, h = 0, t.mode = Lt, i === tt)
            break e;
        case Lt:
          t.mode = mr;
        case mr:
          if (u = t.length, u) {
            if (u > o && (u = o), u > d && (u = d), u === 0)
              break e;
            K.arraySet(a2, r, n, u, l), o -= u, n += u, d -= u, l += u, t.length -= u;
            break;
          }
          t.mode = se;
          break;
        case yr:
          for (; h < 14; ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          if (t.nlen = (f & 31) + 257, f >>>= 5, h -= 5, t.ndist = (f & 31) + 1, f >>>= 5, h -= 5, t.ncode = (f & 15) + 4, f >>>= 4, h -= 4, t.nlen > 286 || t.ndist > 30) {
            e.msg = "too many length or distance symbols", t.mode = F;
            break;
          }
          t.have = 0, t.mode = kr;
        case kr:
          for (; t.have < t.ncode; ) {
            for (; h < 3; ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            t.lens[s[t.have++]] = f & 7, f >>>= 3, h -= 3;
          }
          for (; t.have < 19; )
            t.lens[s[t.have++]] = 0;
          if (t.lencode = t.lendyn, t.lenbits = 7, D = { bits: t.lenbits }, T = Ce(Ma, t.lens, 0, 19, t.lencode, 0, t.work, D), t.lenbits = D.bits, T) {
            e.msg = "invalid code lengths set", t.mode = F;
            break;
          }
          t.have = 0, t.mode = Tr;
        case Tr:
          for (; t.have < t.nlen + t.ndist; ) {
            for (; E = t.lencode[f & (1 << t.lenbits) - 1], p = E >>> 24, S2 = E >>> 16 & 255, I = E & 65535, !(p <= h); ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            if (I < 16)
              f >>>= p, h -= p, t.lens[t.have++] = I;
            else {
              if (I === 16) {
                for (A = p + 2; h < A; ) {
                  if (o === 0)
                    break e;
                  o--, f += r[n++] << h, h += 8;
                }
                if (f >>>= p, h -= p, t.have === 0) {
                  e.msg = "invalid bit length repeat", t.mode = F;
                  break;
                }
                R = t.lens[t.have - 1], u = 3 + (f & 3), f >>>= 2, h -= 2;
              } else if (I === 17) {
                for (A = p + 3; h < A; ) {
                  if (o === 0)
                    break e;
                  o--, f += r[n++] << h, h += 8;
                }
                f >>>= p, h -= p, R = 0, u = 3 + (f & 7), f >>>= 3, h -= 3;
              } else {
                for (A = p + 7; h < A; ) {
                  if (o === 0)
                    break e;
                  o--, f += r[n++] << h, h += 8;
                }
                f >>>= p, h -= p, R = 0, u = 11 + (f & 127), f >>>= 7, h -= 7;
              }
              if (t.have + u > t.nlen + t.ndist) {
                e.msg = "invalid bit length repeat", t.mode = F;
                break;
              }
              for (; u--; )
                t.lens[t.have++] = R;
            }
          }
          if (t.mode === F)
            break;
          if (t.lens[256] === 0) {
            e.msg = "invalid code -- missing end-of-block", t.mode = F;
            break;
          }
          if (t.lenbits = 9, D = { bits: t.lenbits }, T = Ce(fi, t.lens, 0, t.nlen, t.lencode, 0, t.work, D), t.lenbits = D.bits, T) {
            e.msg = "invalid literal/lengths set", t.mode = F;
            break;
          }
          if (t.distbits = 6, t.distcode = t.distdyn, D = { bits: t.distbits }, T = Ce(li, t.lens, t.nlen, t.ndist, t.distcode, 0, t.work, D), t.distbits = D.bits, T) {
            e.msg = "invalid distances set", t.mode = F;
            break;
          }
          if (t.mode = rt, i === tt)
            break e;
        case rt:
          t.mode = it;
        case it:
          if (o >= 6 && d >= 258) {
            e.next_out = l, e.avail_out = d, e.next_in = n, e.avail_in = o, t.hold = f, t.bits = h, Ca(e, _), l = e.next_out, a2 = e.output, d = e.avail_out, n = e.next_in, r = e.input, o = e.avail_in, f = t.hold, h = t.bits, t.mode === se && (t.back = -1);
            break;
          }
          for (t.back = 0; E = t.lencode[f & (1 << t.lenbits) - 1], p = E >>> 24, S2 = E >>> 16 & 255, I = E & 65535, !(p <= h); ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          if (S2 && !(S2 & 240)) {
            for (m = p, w = S2, k = I; E = t.lencode[k + ((f & (1 << m + w) - 1) >> m)], p = E >>> 24, S2 = E >>> 16 & 255, I = E & 65535, !(m + p <= h); ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            f >>>= m, h -= m, t.back += m;
          }
          if (f >>>= p, h -= p, t.back += p, t.length = I, S2 === 0) {
            t.mode = Ir;
            break;
          }
          if (S2 & 32) {
            t.back = -1, t.mode = se;
            break;
          }
          if (S2 & 64) {
            e.msg = "invalid literal/length code", t.mode = F;
            break;
          }
          t.extra = S2 & 15, t.mode = Sr;
        case Sr:
          if (t.extra) {
            for (A = t.extra; h < A; ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            t.length += f & (1 << t.extra) - 1, f >>>= t.extra, h -= t.extra, t.back += t.extra;
          }
          t.was = t.length, t.mode = Rr;
        case Rr:
          for (; E = t.distcode[f & (1 << t.distbits) - 1], p = E >>> 24, S2 = E >>> 16 & 255, I = E & 65535, !(p <= h); ) {
            if (o === 0)
              break e;
            o--, f += r[n++] << h, h += 8;
          }
          if (!(S2 & 240)) {
            for (m = p, w = S2, k = I; E = t.distcode[k + ((f & (1 << m + w) - 1) >> m)], p = E >>> 24, S2 = E >>> 16 & 255, I = E & 65535, !(m + p <= h); ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            f >>>= m, h -= m, t.back += m;
          }
          if (f >>>= p, h -= p, t.back += p, S2 & 64) {
            e.msg = "invalid distance code", t.mode = F;
            break;
          }
          t.offset = I, t.extra = S2 & 15, t.mode = Lr;
        case Lr:
          if (t.extra) {
            for (A = t.extra; h < A; ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            t.offset += f & (1 << t.extra) - 1, f >>>= t.extra, h -= t.extra, t.back += t.extra;
          }
          if (t.offset > t.dmax) {
            e.msg = "invalid distance too far back", t.mode = F;
            break;
          }
          t.mode = Ar;
        case Ar:
          if (d === 0)
            break e;
          if (u = _ - d, t.offset > u) {
            if (u = t.offset - u, u > t.whave && t.sane) {
              e.msg = "invalid distance too far back", t.mode = F;
              break;
            }
            u > t.wnext ? (u -= t.wnext, v = t.wsize - u) : v = t.wnext - u, u > t.length && (u = t.length), b = t.window;
          } else
            b = a2, v = l - t.offset, u = t.length;
          u > d && (u = d), d -= u, t.length -= u;
          do
            a2[l++] = b[v++];
          while (--u);
          t.length === 0 && (t.mode = it);
          break;
        case Ir:
          if (d === 0)
            break e;
          a2[l++] = t.length, d--, t.mode = it;
          break;
        case At:
          if (t.wrap) {
            for (; h < 32; ) {
              if (o === 0)
                break e;
              o--, f |= r[n++] << h, h += 8;
            }
            if (_ -= d, e.total_out += _, t.total += _, _ && (e.adler = t.check = /*UPDATE(state.check, put - _out, _out);*/
            t.flags ? ie(t.check, a2, _, l - _) : Ot(t.check, a2, _, l - _)), _ = d, (t.flags ? f : zr(f)) !== t.check) {
              e.msg = "incorrect data check", t.mode = F;
              break;
            }
            f = 0, h = 0;
          }
          t.mode = Zr;
        case Zr:
          if (t.wrap && t.flags) {
            for (; h < 32; ) {
              if (o === 0)
                break e;
              o--, f += r[n++] << h, h += 8;
            }
            if (f !== (t.total & 4294967295)) {
              e.msg = "incorrect length check", t.mode = F;
              break;
            }
            f = 0, h = 0;
          }
          t.mode = Nr;
        case Nr:
          T = $a;
          break e;
        case F:
          T = oi;
          break e;
        case ui:
          return hi;
        case Ka:
        default:
          return j;
      }
  return e.next_out = l, e.avail_out = d, e.next_in = n, e.avail_in = o, t.hold = f, t.bits = h, (t.wsize || _ !== e.avail_out && t.mode < F && (t.mode < At || i !== hr)) && wi(e, e.output, e.next_out, _ - e.avail_out), g -= e.avail_in, _ -= e.avail_out, e.total_in += g, e.total_out += _, t.total += _, t.wrap && _ && (e.adler = t.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
  t.flags ? ie(t.check, a2, _, e.next_out - _) : Ot(t.check, a2, _, e.next_out - _)), e.data_type = t.bits + (t.last ? 64 : 0) + (t.mode === se ? 128 : 0) + (t.mode === rt || t.mode === Lt ? 256 : 0), (g === 0 && _ === 0 || i === hr) && T === Te && (T = Ga), T;
}
function tn(e) {
  if (!e || !e.state)
    return j;
  var i = e.state;
  return i.window && (i.window = null), e.state = null, Te;
}
function rn(e, i) {
  var t;
  return !e || !e.state || (t = e.state, !(t.wrap & 2)) ? j : (t.head = i, i.done = false, Te);
}
function an(e, i) {
  var t = i.length, r, a2, n;
  return !e || !e.state || (r = e.state, r.wrap !== 0 && r.mode !== st) ? j : r.mode === st && (a2 = 1, a2 = Ot(a2, i, t, 0), a2 !== r.check) ? oi : (n = wi(e, i, t, t), n ? (r.mode = ui, hi) : (r.havedict = 1, Te));
}
ee.inflateReset = _i;
ee.inflateReset2 = ci;
ee.inflateResetKeep = di;
ee.inflateInit = Qa;
ee.inflateInit2 = vi;
ee.inflate = en;
ee.inflateEnd = tn;
ee.inflateGetHeader = rn;
ee.inflateSetDictionary = an;
ee.inflateInfo = "pako inflate (from Nodeca project)";
var nn = {
  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  //Z_MEM_ERROR:     -4,
  Z_BUF_ERROR: -5,
  //Z_VERSION_ERROR: -6,
  /* compression levels */
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY: 0,
  Z_TEXT: 1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN: 2,
  /* The deflate compression method */
  Z_DEFLATED: 8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};
(function(e) {
  var i = tt$1(), t = Ai, r = he, a2 = ee, n = nn;
  for (var l in n)
    e[l] = n[l];
  e.NONE = 0, e.DEFLATE = 1, e.INFLATE = 2, e.GZIP = 3, e.GUNZIP = 4, e.DEFLATERAW = 5, e.INFLATERAW = 6, e.UNZIP = 7;
  var o = 31, d = 139;
  function f(h) {
    if (typeof h != "number" || h < e.DEFLATE || h > e.UNZIP)
      throw new TypeError("Bad argument");
    this.dictionary = null, this.err = 0, this.flush = 0, this.init_done = false, this.level = 0, this.memLevel = 0, this.mode = h, this.strategy = 0, this.windowBits = 0, this.write_in_progress = false, this.pending_close = false, this.gzip_id_bytes_read = 0;
  }
  f.prototype.close = function() {
    if (this.write_in_progress) {
      this.pending_close = true;
      return;
    }
    this.pending_close = false, i(this.init_done, "close before init"), i(this.mode <= e.UNZIP), this.mode === e.DEFLATE || this.mode === e.GZIP || this.mode === e.DEFLATERAW ? r.deflateEnd(this.strm) : (this.mode === e.INFLATE || this.mode === e.GUNZIP || this.mode === e.INFLATERAW || this.mode === e.UNZIP) && a2.inflateEnd(this.strm), this.mode = e.NONE, this.dictionary = null;
  }, f.prototype.write = function(h, g, _, u, v, b, E) {
    return this._write(true, h, g, _, u, v, b, E);
  }, f.prototype.writeSync = function(h, g, _, u, v, b, E) {
    return this._write(false, h, g, _, u, v, b, E);
  }, f.prototype._write = function(h, g, _, u, v, b, E, p) {
    if (i.equal(arguments.length, 8), i(this.init_done, "write before init"), i(this.mode !== e.NONE, "already finalized"), i.equal(false, this.write_in_progress, "write already in progress"), i.equal(false, this.pending_close, "close is pending"), this.write_in_progress = true, i.equal(false, g === void 0, "must provide flush value"), this.write_in_progress = true, g !== e.Z_NO_FLUSH && g !== e.Z_PARTIAL_FLUSH && g !== e.Z_SYNC_FLUSH && g !== e.Z_FULL_FLUSH && g !== e.Z_FINISH && g !== e.Z_BLOCK)
      throw new Error("Invalid flush value");
    if (_ == null && (_ = sc.alloc(0), v = 0, u = 0), this.strm.avail_in = v, this.strm.input = _, this.strm.next_in = u, this.strm.avail_out = p, this.strm.output = b, this.strm.next_out = E, this.flush = g, !h)
      return this._process(), this._checkError() ? this._afterSync() : void 0;
    var S2 = this;
    return Oe$1.nextTick(function() {
      S2._process(), S2._after();
    }), this;
  }, f.prototype._afterSync = function() {
    var h = this.strm.avail_out, g = this.strm.avail_in;
    return this.write_in_progress = false, [g, h];
  }, f.prototype._process = function() {
    var h = null;
    switch (this.mode) {
      case e.DEFLATE:
      case e.GZIP:
      case e.DEFLATERAW:
        this.err = r.deflate(this.strm, this.flush);
        break;
      case e.UNZIP:
        switch (this.strm.avail_in > 0 && (h = this.strm.next_in), this.gzip_id_bytes_read) {
          case 0:
            if (h === null)
              break;
            if (this.strm.input[h] === o) {
              if (this.gzip_id_bytes_read = 1, h++, this.strm.avail_in === 1)
                break;
            } else {
              this.mode = e.INFLATE;
              break;
            }
          case 1:
            if (h === null)
              break;
            this.strm.input[h] === d ? (this.gzip_id_bytes_read = 2, this.mode = e.GUNZIP) : this.mode = e.INFLATE;
            break;
          default:
            throw new Error("invalid number of gzip magic number bytes read");
        }
      case e.INFLATE:
      case e.GUNZIP:
      case e.INFLATERAW:
        for (this.err = a2.inflate(
          this.strm,
          this.flush
          // If data was encoded with dictionary
        ), this.err === e.Z_NEED_DICT && this.dictionary && (this.err = a2.inflateSetDictionary(this.strm, this.dictionary), this.err === e.Z_OK ? this.err = a2.inflate(this.strm, this.flush) : this.err === e.Z_DATA_ERROR && (this.err = e.Z_NEED_DICT)); this.strm.avail_in > 0 && this.mode === e.GUNZIP && this.err === e.Z_STREAM_END && this.strm.next_in[0] !== 0; )
          this.reset(), this.err = a2.inflate(this.strm, this.flush);
        break;
      default:
        throw new Error("Unknown mode " + this.mode);
    }
  }, f.prototype._checkError = function() {
    switch (this.err) {
      case e.Z_OK:
      case e.Z_BUF_ERROR:
        if (this.strm.avail_out !== 0 && this.flush === e.Z_FINISH)
          return this._error("unexpected end of file"), false;
        break;
      case e.Z_STREAM_END:
        break;
      case e.Z_NEED_DICT:
        return this.dictionary == null ? this._error("Missing dictionary") : this._error("Bad dictionary"), false;
      default:
        return this._error("Zlib error"), false;
    }
    return true;
  }, f.prototype._after = function() {
    if (this._checkError()) {
      var h = this.strm.avail_out, g = this.strm.avail_in;
      this.write_in_progress = false, this.callback(g, h), this.pending_close && this.close();
    }
  }, f.prototype._error = function(h) {
    this.strm.msg && (h = this.strm.msg), this.onerror(
      h,
      this.err
      // no hope of rescue.
    ), this.write_in_progress = false, this.pending_close && this.close();
  }, f.prototype.init = function(h, g, _, u, v) {
    i(arguments.length === 4 || arguments.length === 5, "init(windowBits, level, memLevel, strategy, [dictionary])"), i(h >= 8 && h <= 15, "invalid windowBits"), i(g >= -1 && g <= 9, "invalid compression level"), i(_ >= 1 && _ <= 9, "invalid memlevel"), i(u === e.Z_FILTERED || u === e.Z_HUFFMAN_ONLY || u === e.Z_RLE || u === e.Z_FIXED || u === e.Z_DEFAULT_STRATEGY, "invalid strategy"), this._init(g, h, _, u, v), this._setDictionary();
  }, f.prototype.params = function() {
    throw new Error("deflateParams Not supported");
  }, f.prototype.reset = function() {
    this._reset(), this._setDictionary();
  }, f.prototype._init = function(h, g, _, u, v) {
    switch (this.level = h, this.windowBits = g, this.memLevel = _, this.strategy = u, this.flush = e.Z_NO_FLUSH, this.err = e.Z_OK, (this.mode === e.GZIP || this.mode === e.GUNZIP) && (this.windowBits += 16), this.mode === e.UNZIP && (this.windowBits += 32), (this.mode === e.DEFLATERAW || this.mode === e.INFLATERAW) && (this.windowBits = -1 * this.windowBits), this.strm = new t(), this.mode) {
      case e.DEFLATE:
      case e.GZIP:
      case e.DEFLATERAW:
        this.err = r.deflateInit2(this.strm, this.level, e.Z_DEFLATED, this.windowBits, this.memLevel, this.strategy);
        break;
      case e.INFLATE:
      case e.GUNZIP:
      case e.INFLATERAW:
      case e.UNZIP:
        this.err = a2.inflateInit2(this.strm, this.windowBits);
        break;
      default:
        throw new Error("Unknown mode " + this.mode);
    }
    this.err !== e.Z_OK && this._error("Init error"), this.dictionary = v, this.write_in_progress = false, this.init_done = true;
  }, f.prototype._setDictionary = function() {
    if (this.dictionary != null) {
      switch (this.err = e.Z_OK, this.mode) {
        case e.DEFLATE:
        case e.DEFLATERAW:
          this.err = r.deflateSetDictionary(this.strm, this.dictionary);
          break;
      }
      this.err !== e.Z_OK && this._error("Failed to set dictionary");
    }
  }, f.prototype._reset = function() {
    switch (this.err = e.Z_OK, this.mode) {
      case e.DEFLATE:
      case e.DEFLATERAW:
      case e.GZIP:
        this.err = r.deflateReset(this.strm);
        break;
      case e.INFLATE:
      case e.INFLATERAW:
      case e.GUNZIP:
        this.err = a2.inflateReset(this.strm);
        break;
    }
    this.err !== e.Z_OK && this._error("Failed to reset stream");
  }, e.Zlib = f;
})(Ur);
(function(e) {
  var i = Xn.Buffer, t = S.Transform, r = Ur, a2 = zs, n = tt$1().ok, l = Xn.kMaxLength || Xn.Buffer && Xn.Buffer.kMaxLength || 2147483647, o = "Cannot create final Buffer. It would be larger than 0x" + l.toString(16) + " bytes";
  r.Z_MIN_WINDOWBITS = 8, r.Z_MAX_WINDOWBITS = 15, r.Z_DEFAULT_WINDOWBITS = 15, r.Z_MIN_CHUNK = 64, r.Z_MAX_CHUNK = 1 / 0, r.Z_DEFAULT_CHUNK = 16 * 1024, r.Z_MIN_MEMLEVEL = 1, r.Z_MAX_MEMLEVEL = 9, r.Z_DEFAULT_MEMLEVEL = 8, r.Z_MIN_LEVEL = -1, r.Z_MAX_LEVEL = 9, r.Z_DEFAULT_LEVEL = r.Z_DEFAULT_COMPRESSION;
  for (var d = Object.keys(r), f = 0; f < d.length; f++) {
    var h = d[f];
    h.match(/^Z/) && Object.defineProperty(e, h, {
      enumerable: true,
      value: r[h],
      writable: false
    });
  }
  for (var g = {
    Z_OK: r.Z_OK,
    Z_STREAM_END: r.Z_STREAM_END,
    Z_NEED_DICT: r.Z_NEED_DICT,
    Z_ERRNO: r.Z_ERRNO,
    Z_STREAM_ERROR: r.Z_STREAM_ERROR,
    Z_DATA_ERROR: r.Z_DATA_ERROR,
    Z_MEM_ERROR: r.Z_MEM_ERROR,
    Z_BUF_ERROR: r.Z_BUF_ERROR,
    Z_VERSION_ERROR: r.Z_VERSION_ERROR
  }, _ = Object.keys(g), u = 0; u < _.length; u++) {
    var v = _[u];
    g[g[v]] = v;
  }
  Object.defineProperty(e, "codes", {
    enumerable: true,
    value: Object.freeze(g),
    writable: false
  }), e.Deflate = p, e.Inflate = S$1, e.Gzip = I, e.Gunzip = m, e.DeflateRaw = w, e.InflateRaw = k, e.Unzip = R, e.createDeflate = function(s) {
    return new p(s);
  }, e.createInflate = function(s) {
    return new S$1(s);
  }, e.createDeflateRaw = function(s) {
    return new w(s);
  }, e.createInflateRaw = function(s) {
    return new k(s);
  }, e.createGzip = function(s) {
    return new I(s);
  }, e.createGunzip = function(s) {
    return new m(s);
  }, e.createUnzip = function(s) {
    return new R(s);
  }, e.deflate = function(s, c, L) {
    return typeof c == "function" && (L = c, c = {}), b(new p(c), s, L);
  }, e.deflateSync = function(s, c) {
    return E(new p(c), s);
  }, e.gzip = function(s, c, L) {
    return typeof c == "function" && (L = c, c = {}), b(new I(c), s, L);
  }, e.gzipSync = function(s, c) {
    return E(new I(c), s);
  }, e.deflateRaw = function(s, c, L) {
    return typeof c == "function" && (L = c, c = {}), b(new w(c), s, L);
  }, e.deflateRawSync = function(s, c) {
    return E(new w(c), s);
  }, e.unzip = function(s, c, L) {
    return typeof c == "function" && (L = c, c = {}), b(new R(c), s, L);
  }, e.unzipSync = function(s, c) {
    return E(new R(c), s);
  }, e.inflate = function(s, c, L) {
    return typeof c == "function" && (L = c, c = {}), b(new S$1(c), s, L);
  }, e.inflateSync = function(s, c) {
    return E(new S$1(c), s);
  }, e.gunzip = function(s, c, L) {
    return typeof c == "function" && (L = c, c = {}), b(new m(c), s, L);
  }, e.gunzipSync = function(s, c) {
    return E(new m(c), s);
  }, e.inflateRaw = function(s, c, L) {
    return typeof c == "function" && (L = c, c = {}), b(new k(c), s, L);
  }, e.inflateRawSync = function(s, c) {
    return E(new k(c), s);
  };
  function b(s, c, L) {
    var z = [], O = 0;
    s.on("error", x), s.on("end", te), s.end(c), U();
    function U() {
      for (var H; (H = s.read()) !== null; )
        z.push(H), O += H.length;
      s.once("readable", U);
    }
    function x(H) {
      s.removeListener("end", te), s.removeListener("readable", U), L(H);
    }
    function te() {
      var H, Re = null;
      O >= l ? Re = new RangeError(o) : H = i.concat(z, O), z = [], s.close(), L(Re, H);
    }
  }
  function E(s, c) {
    if (typeof c == "string" && (c = i.from(c)), !i.isBuffer(c))
      throw new TypeError("Not a string or buffer");
    var L = s._finishFlushFlag;
    return s._processChunk(c, L);
  }
  function p(s) {
    if (!(this instanceof p))
      return new p(s);
    y.call(this, s, r.DEFLATE);
  }
  function S$1(s) {
    if (!(this instanceof S$1))
      return new S$1(s);
    y.call(this, s, r.INFLATE);
  }
  function I(s) {
    if (!(this instanceof I))
      return new I(s);
    y.call(this, s, r.GZIP);
  }
  function m(s) {
    if (!(this instanceof m))
      return new m(s);
    y.call(this, s, r.GUNZIP);
  }
  function w(s) {
    if (!(this instanceof w))
      return new w(s);
    y.call(this, s, r.DEFLATERAW);
  }
  function k(s) {
    if (!(this instanceof k))
      return new k(s);
    y.call(this, s, r.INFLATERAW);
  }
  function R(s) {
    if (!(this instanceof R))
      return new R(s);
    y.call(this, s, r.UNZIP);
  }
  function T(s) {
    return s === r.Z_NO_FLUSH || s === r.Z_PARTIAL_FLUSH || s === r.Z_SYNC_FLUSH || s === r.Z_FULL_FLUSH || s === r.Z_FINISH || s === r.Z_BLOCK;
  }
  function y(s, c) {
    var L = this;
    if (this._opts = s = s || {}, this._chunkSize = s.chunkSize || e.Z_DEFAULT_CHUNK, t.call(this, s), s.flush && !T(s.flush))
      throw new Error("Invalid flush flag: " + s.flush);
    if (s.finishFlush && !T(s.finishFlush))
      throw new Error("Invalid flush flag: " + s.finishFlush);
    if (this._flushFlag = s.flush || r.Z_NO_FLUSH, this._finishFlushFlag = typeof s.finishFlush < "u" ? s.finishFlush : r.Z_FINISH, s.chunkSize && (s.chunkSize < e.Z_MIN_CHUNK || s.chunkSize > e.Z_MAX_CHUNK))
      throw new Error("Invalid chunk size: " + s.chunkSize);
    if (s.windowBits && (s.windowBits < e.Z_MIN_WINDOWBITS || s.windowBits > e.Z_MAX_WINDOWBITS))
      throw new Error("Invalid windowBits: " + s.windowBits);
    if (s.level && (s.level < e.Z_MIN_LEVEL || s.level > e.Z_MAX_LEVEL))
      throw new Error("Invalid compression level: " + s.level);
    if (s.memLevel && (s.memLevel < e.Z_MIN_MEMLEVEL || s.memLevel > e.Z_MAX_MEMLEVEL))
      throw new Error("Invalid memLevel: " + s.memLevel);
    if (s.strategy && s.strategy != e.Z_FILTERED && s.strategy != e.Z_HUFFMAN_ONLY && s.strategy != e.Z_RLE && s.strategy != e.Z_FIXED && s.strategy != e.Z_DEFAULT_STRATEGY)
      throw new Error("Invalid strategy: " + s.strategy);
    if (s.dictionary && !i.isBuffer(s.dictionary))
      throw new Error("Invalid dictionary: it should be a Buffer instance");
    this._handle = new r.Zlib(c);
    var z = this;
    this._hadError = false, this._handle.onerror = function(x, te) {
      D(z), z._hadError = true;
      var H = new Error(x);
      H.errno = te, H.code = e.codes[te], z.emit("error", H);
    };
    var O = e.Z_DEFAULT_COMPRESSION;
    typeof s.level == "number" && (O = s.level);
    var U = e.Z_DEFAULT_STRATEGY;
    typeof s.strategy == "number" && (U = s.strategy), this._handle.init(s.windowBits || e.Z_DEFAULT_WINDOWBITS, O, s.memLevel || e.Z_DEFAULT_MEMLEVEL, U, s.dictionary), this._buffer = i.allocUnsafe(this._chunkSize), this._offset = 0, this._level = O, this._strategy = U, this.once("end", this.close), Object.defineProperty(this, "_closed", {
      get: function() {
        return !L._handle;
      },
      configurable: true,
      enumerable: true
    });
  }
  a2.inherits(y, t), y.prototype.params = function(s, c, L) {
    if (s < e.Z_MIN_LEVEL || s > e.Z_MAX_LEVEL)
      throw new RangeError("Invalid compression level: " + s);
    if (c != e.Z_FILTERED && c != e.Z_HUFFMAN_ONLY && c != e.Z_RLE && c != e.Z_FIXED && c != e.Z_DEFAULT_STRATEGY)
      throw new TypeError("Invalid strategy: " + c);
    if (this._level !== s || this._strategy !== c) {
      var z = this;
      this.flush(r.Z_SYNC_FLUSH, function() {
        n(z._handle, "zlib binding closed"), z._handle.params(s, c), z._hadError || (z._level = s, z._strategy = c, L && L());
      });
    } else
      Oe$1.nextTick(L);
  }, y.prototype.reset = function() {
    return n(this._handle, "zlib binding closed"), this._handle.reset();
  }, y.prototype._flush = function(s) {
    this._transform(i.alloc(0), "", s);
  }, y.prototype.flush = function(s, c) {
    var L = this, z = this._writableState;
    (typeof s == "function" || s === void 0 && !c) && (c = s, s = r.Z_FULL_FLUSH), z.ended ? c && Oe$1.nextTick(c) : z.ending ? c && this.once("end", c) : z.needDrain ? c && this.once("drain", function() {
      return L.flush(s, c);
    }) : (this._flushFlag = s, this.write(i.alloc(0), "", c));
  }, y.prototype.close = function(s) {
    D(this, s), Oe$1.nextTick(A, this);
  };
  function D(s, c) {
    c && Oe$1.nextTick(c), s._handle && (s._handle.close(), s._handle = null);
  }
  function A(s) {
    s.emit("close");
  }
  y.prototype._transform = function(s, c, L) {
    var z, O = this._writableState, U = O.ending || O.ended, x = U && (!s || O.length === s.length);
    if (s !== null && !i.isBuffer(s))
      return L(new Error("invalid input"));
    if (!this._handle)
      return L(new Error("zlib binding closed"));
    x ? z = this._finishFlushFlag : (z = this._flushFlag, s.length >= O.length && (this._flushFlag = this._opts.flush || r.Z_NO_FLUSH)), this._processChunk(s, z, L);
  }, y.prototype._processChunk = function(s, c, L) {
    var z = s && s.length, O = this._chunkSize - this._offset, U = 0, x = this, te = typeof L == "function";
    if (!te) {
      var H = [], Re = 0, $t;
      this.on("error", function(Je) {
        $t = Je;
      }), n(this._handle, "zlib binding closed");
      do
        var Wt = this._handle.writeSync(
          c,
          s,
          // in
          U,
          // in_off
          z,
          // in_len
          this._buffer,
          // out
          this._offset,
          //out_off
          O
        );
      while (!this._hadError && wt(Wt[0], Wt[1]));
      if (this._hadError)
        throw $t;
      if (Re >= l)
        throw D(this), new RangeError(o);
      var mi = i.concat(H, Re);
      return D(this), mi;
    }
    n(this._handle, "zlib binding closed");
    var Gt = this._handle.write(
      c,
      s,
      // in
      U,
      // in_off
      z,
      // in_len
      this._buffer,
      // out
      this._offset,
      //out_off
      O
    );
    Gt.buffer = s, Gt.callback = wt;
    function wt(Je, gt) {
      if (this && (this.buffer = null, this.callback = null), !x._hadError) {
        var Qe = O - gt;
        if (n(Qe >= 0, "have should not go down"), Qe > 0) {
          var bt = x._buffer.slice(x._offset, x._offset + Qe);
          x._offset += Qe, te ? x.push(bt) : (H.push(bt), Re += bt.length);
        }
        if ((gt === 0 || x._offset >= x._chunkSize) && (O = x._chunkSize, x._offset = 0, x._buffer = i.allocUnsafe(x._chunkSize)), gt === 0) {
          if (U += z - Je, z = Je, !te)
            return true;
          var Kt = x._handle.write(c, s, U, z, x._buffer, x._offset, x._chunkSize);
          Kt.callback = wt, Kt.buffer = s;
          return;
        }
        if (!te)
          return false;
        L();
      }
    }
  }, a2.inherits(p, y), a2.inherits(S$1, y), a2.inherits(I, y), a2.inherits(m, y), a2.inherits(w, y), a2.inherits(k, y), a2.inherits(R, y);
})(Or);
const Ie = /* @__PURE__ */ fl(Or);
class vt extends Error {
  constructor(i, t) {
    super(i), Error.captureStackTrace(this, this.constructor), this.type = t;
  }
  get name() {
    return this.constructor.name;
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
}
class fe extends vt {
  /**
   * @param  {string} message -      Error message for human
   * @param  {string} [type] -        Error type for machine
   * @param  {SystemError} [systemError] - For Node.js system error
   */
  constructor(i, t, r) {
    super(i, t), r && (this.code = this.errno = r.code, this.erroredSysCall = r.syscall);
  }
}
const ut = Symbol.toStringTag, gi = (e) => typeof e == "object" && typeof e.append == "function" && typeof e.delete == "function" && typeof e.get == "function" && typeof e.getAll == "function" && typeof e.has == "function" && typeof e.set == "function" && typeof e.sort == "function" && e[ut] === "URLSearchParams", dt = (e) => e && typeof e == "object" && typeof e.arrayBuffer == "function" && typeof e.type == "string" && typeof e.stream == "function" && typeof e.constructor == "function" && /^(Blob|File)$/.test(e[ut]), fn = (e) => typeof e == "object" && (e[ut] === "AbortSignal" || e[ut] === "EventTarget"), ln = (e, i) => {
  const t = new URL(i).hostname, r = new URL(e).hostname;
  return t === r || t.endsWith(`.${r}`);
}, on = (e, i) => {
  const t = new URL(i).protocol, r = new URL(e).protocol;
  return t === r;
}, hn = zs.promisify(C$1.pipeline), G = /* @__PURE__ */ Symbol("Body internals");
class Ke {
  constructor(i, { size: t = 0 } = {}) {
    let r = null;
    i === null ? i = null : gi(i) ? i = Uf.from(i.toString()) : dt(i) || Uf.isBuffer(i) || (zs.types.isAnyArrayBuffer(i) ? i = Uf.from(i) : ArrayBuffer.isView(i) ? i = Uf.from(i.buffer, i.byteOffset, i.byteLength) : i instanceof C$1 || (i = Uf.from(String(i))));
    let a2 = i;
    Uf.isBuffer(i) ? a2 = C$1.Readable.from(i) : dt(i) && (a2 = C$1.Readable.from(i.stream())), this[G] = {
      body: i,
      stream: a2,
      boundary: r,
      disturbed: false,
      error: null
    }, this.size = t, i instanceof C$1 && i.on("error", (n) => {
      const l = n instanceof vt ? n : new fe(`Invalid response body while trying to fetch ${this.url}: ${n.message}`, "system", n);
      this[G].error = l;
    });
  }
  get body() {
    return this[G].stream;
  }
  get bodyUsed() {
    return this[G].disturbed;
  }
  /**
   * Decode response as ArrayBuffer
   *
   * @return  Promise
   */
  async arrayBuffer() {
    const { buffer: i, byteOffset: t, byteLength: r } = await Nt(this);
    return i.slice(t, t + r);
  }
  /*async formData() {
          const ct = this.headers.get('content-type');
  
          if (ct.startsWith('application/x-www-form-urlencoded')) {
              const formData = new FormData();
              const parameters = new URLSearchParams(await this.text());
  
              for (const [name, value] of parameters) {
                  formData.append(name, value);
              }
  
              return formData;
          }
  
          const {toFormData} = await import('./utils/multipart-parser.js');
          return toFormData(this.body, ct);
      }*/
  /**
   * Return raw response as Blob
   *
   * @return Promise
   */
  async blob() {
    const i = this.headers && this.headers.get("content-type") || this[G].body && this[G].body.type || "", t = await this.arrayBuffer();
    return new Blob([t], {
      type: i
    });
  }
  /**
   * Decode response as json
   *
   * @return  Promise
   */
  async json() {
    const i = await this.text();
    return JSON.parse(i);
  }
  /**
   * Decode response as text
   *
   * @return  Promise
   */
  async text() {
    const i = await Nt(this);
    return new TextDecoder().decode(i);
  }
  /**
   * Decode response as buffer (non-spec api)
   *
   * @return  Promise
   */
  buffer() {
    return Nt(this);
  }
}
Ke.prototype.buffer = zs.deprecate(Ke.prototype.buffer, "Please use 'response.arrayBuffer()' instead of 'response.buffer()'", "node-fetch#buffer");
Object.defineProperties(Ke.prototype, {
  body: { enumerable: true },
  bodyUsed: { enumerable: true },
  arrayBuffer: { enumerable: true },
  blob: { enumerable: true },
  json: { enumerable: true },
  text: { enumerable: true },
  data: { get: zs.deprecate(() => {
  }, "data doesn't exist, use json(), text(), arrayBuffer(), or body instead", "https://github.com/node-fetch/node-fetch/issues/1000 (response)") }
});
async function Nt(e) {
  if (e[G].disturbed)
    throw new TypeError(`body used already for: ${e.url}`);
  if (e[G].disturbed = true, e[G].error)
    throw e[G].error;
  const { body: i } = e;
  if (i === null)
    return Uf.alloc(0);
  if (!(i instanceof C$1))
    return Uf.alloc(0);
  const t = [];
  let r = 0;
  try {
    for await (const a2 of i) {
      if (e.size > 0 && r + a2.length > e.size) {
        const n = new fe(`content size at ${e.url} over limit: ${e.size}`, "max-size");
        throw i.destroy(n), n;
      }
      r += a2.length, t.push(a2);
    }
  } catch (a2) {
    throw a2 instanceof vt ? a2 : new fe(`Invalid response body while trying to fetch ${e.url}: ${a2.message}`, "system", a2);
  }
  if (i.readableEnded === true || i._readableState.ended === true)
    try {
      return t.every((a2) => typeof a2 == "string") ? Uf.from(t.join("")) : Uf.concat(t, r);
    } catch (a2) {
      throw new fe(`Could not create Buffer from response body for ${e.url}: ${a2.message}`, "system", a2);
    }
  else
    throw new fe(`Premature close of server response while trying to fetch ${e.url}`);
}
const Ht = (e, i) => {
  let t, r, { body: a2 } = e[G];
  if (e.bodyUsed)
    throw new Error("cannot clone body after it is used");
  return a2 instanceof C$1 && typeof a2.getBoundary != "function" && (t = new S.PassThrough({ highWaterMark: i }), r = new S.PassThrough({ highWaterMark: i }), a2.pipe(t), a2.pipe(r), e[G].stream = t, a2 = r), a2;
}, sn = zs.deprecate((e) => e.getBoundary(), "form-data doesn't follow the spec and requires special treatment. Use alternative package", "https://github.com/node-fetch/node-fetch/issues/1167"), bi = (e, i) => e === null ? null : typeof e == "string" ? "text/plain;charset=UTF-8" : gi(e) ? "application/x-www-form-urlencoded;charset=UTF-8" : dt(e) ? e.type || null : Uf.isBuffer(e) || zs.types.isAnyArrayBuffer(e) || ArrayBuffer.isView(e) ? null : e && typeof e.getBoundary == "function" ? `multipart/form-data;boundary=${sn(e)}` : e instanceof C$1 ? null : "text/plain;charset=UTF-8", un = (e) => {
  const { body: i } = e[G];
  return i === null ? 0 : dt(i) ? i.size : Uf.isBuffer(i) ? i.length : i && typeof i.getLengthSync == "function" && i.hasKnownLength && i.hasKnownLength() ? i.getLengthSync() : null;
}, dn = async (e, { body: i }) => {
  i === null ? e.end() : await hn(i, e);
}, ot = typeof cr$1.validateHeaderName == "function" ? cr$1.validateHeaderName : (e) => {
  if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(e)) {
    const i = new TypeError(`Header name must be a valid HTTP token [${e}]`);
    throw Object.defineProperty(i, "code", { value: "ERR_INVALID_HTTP_TOKEN" }), i;
  }
}, Ut = typeof cr$1.validateHeaderValue == "function" ? cr$1.validateHeaderValue : (e, i) => {
  if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(i)) {
    const t = new TypeError(`Invalid character in header content ["${e}"]`);
    throw Object.defineProperty(t, "code", { value: "ERR_INVALID_CHAR" }), t;
  }
};
class de extends URLSearchParams {
  /**
   * Headers class
   *
   * @constructor
   * @param {HeadersInit} [init] - Response headers
   */
  constructor(i) {
    let t = [];
    if (i instanceof de) {
      const r = i.raw();
      for (const [a2, n] of Object.entries(r))
        t.push(...n.map((l) => [a2, l]));
    } else if (i != null)
      if (typeof i == "object" && !zs.types.isBoxedPrimitive(i)) {
        const r = i[Symbol.iterator];
        if (r == null)
          t.push(...Object.entries(i));
        else {
          if (typeof r != "function")
            throw new TypeError("Header pairs must be iterable");
          t = [...i].map((a2) => {
            if (typeof a2 != "object" || zs.types.isBoxedPrimitive(a2))
              throw new TypeError("Each header pair must be an iterable object");
            return [...a2];
          }).map((a2) => {
            if (a2.length !== 2)
              throw new TypeError("Each header pair must be a name/value tuple");
            return [...a2];
          });
        }
      } else
        throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
    return t = t.length > 0 ? t.map(([r, a2]) => (ot(r), Ut(r, String(a2)), [String(r).toLowerCase(), String(a2)])) : void 0, super(t), new Proxy(this, {
      get(r, a2, n) {
        switch (a2) {
          case "append":
          case "set":
            return (l, o) => (ot(l), Ut(l, String(o)), URLSearchParams.prototype[a2].call(r, String(l).toLowerCase(), String(o)));
          case "delete":
          case "has":
          case "getAll":
            return (l) => (ot(l), URLSearchParams.prototype[a2].call(r, String(l).toLowerCase()));
          case "keys":
            return () => (r.sort(), new Set(URLSearchParams.prototype.keys.call(r)).keys());
          default:
            return Reflect.get(r, a2, n);
        }
      }
    });
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  toString() {
    return Object.prototype.toString.call(this);
  }
  get(i) {
    const t = this.getAll(i);
    if (t.length === 0)
      return null;
    let r = t.join(", ");
    return /^content-encoding$/i.test(i) && (r = r.toLowerCase()), r;
  }
  forEach(i, t = void 0) {
    for (const r of this.keys())
      Reflect.apply(i, t, [this.get(r), r, this]);
  }
  *values() {
    for (const i of this.keys())
      yield this.get(i);
  }
  /**
   * @type {() => IterableIterator<[string, string]>}
   */
  *entries() {
    for (const i of this.keys())
      yield [i, this.get(i)];
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * Node-fetch non-spec method
   * returning all headers and their values as array
   * @returns {Record<string, string[]>}
   */
  raw() {
    return [...this.keys()].reduce((i, t) => (i[t] = this.getAll(t), i), {});
  }
  /**
   * For better console.log(headers) and also to convert Headers into Node.js Request compatible format
   */
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this.keys()].reduce((i, t) => {
      const r = this.getAll(t);
      return t === "host" ? i[t] = r[0] : i[t] = r.length > 1 ? r : r[0], i;
    }, {});
  }
}
Object.defineProperties(de.prototype, ["get", "entries", "forEach", "values"].reduce((e, i) => (e[i] = { enumerable: true }, e), {}));
function _n(e = []) {
  return new de(e.reduce((i, t, r, a2) => (r % 2 === 0 && i.push(a2.slice(r, r + 2)), i), []).filter(([i, t]) => {
    try {
      return ot(i), Ut(i, String(t)), true;
    } catch {
      return false;
    }
  }));
}
const cn = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]), Ei = (e) => cn.has(e), J = /* @__PURE__ */ Symbol("Response internals");
class X extends Ke {
  constructor(i = null, t = {}) {
    super(i, t);
    const r = t.status != null ? t.status : 200, a2 = new de(t.headers);
    if (i !== null && !a2.has("Content-Type")) {
      const n = bi(i);
      n && a2.append("Content-Type", n);
    }
    this[J] = {
      type: "default",
      url: t.url,
      status: r,
      statusText: t.statusText || "",
      headers: a2,
      counter: t.counter,
      highWaterMark: t.highWaterMark
    };
  }
  get type() {
    return this[J].type;
  }
  get url() {
    return this[J].url || "";
  }
  get status() {
    return this[J].status;
  }
  /**
   * Convenience property representing if the request ended normally
   */
  get ok() {
    return this[J].status >= 200 && this[J].status < 300;
  }
  get redirected() {
    return this[J].counter > 0;
  }
  get statusText() {
    return this[J].statusText;
  }
  get headers() {
    return this[J].headers;
  }
  get highWaterMark() {
    return this[J].highWaterMark;
  }
  /**
   * Clone this response
   *
   * @return  Response
   */
  clone() {
    return new X(Ht(this, this.highWaterMark), {
      type: this.type,
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      ok: this.ok,
      redirected: this.redirected,
      size: this.size,
      highWaterMark: this.highWaterMark
    });
  }
  /**
   * @param {string} url    The URL that the new response is to originate from.
   * @param {number} status An optional status code for the response (e.g., 302.)
   * @returns {Response}    A Response object.
   */
  static redirect(i, t = 302) {
    if (!Ei(t))
      throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
    return new X(null, {
      headers: {
        location: new URL(i).toString()
      },
      status: t
    });
  }
  static error() {
    const i = new X(null, { status: 0, statusText: "" });
    return i[J].type = "error", i;
  }
  static json(i = void 0, t = {}) {
    const r = JSON.stringify(i);
    if (r === void 0)
      throw new TypeError("data is not JSON serializable");
    const a2 = new de(t && t.headers);
    return a2.has("content-type") || a2.set("content-type", "application/json"), new X(r, {
      ...t,
      headers: a2
    });
  }
  get [Symbol.toStringTag]() {
    return "Response";
  }
}
Object.defineProperties(X.prototype, {
  type: { enumerable: true },
  url: { enumerable: true },
  status: { enumerable: true },
  ok: { enumerable: true },
  redirected: { enumerable: true },
  statusText: { enumerable: true },
  headers: { enumerable: true },
  clone: { enumerable: true }
});
const vn = (e) => {
  if (e.search)
    return e.search;
  const i = e.href.length - 1, t = e.hash || (e.href[i] === "#" ? "#" : "");
  return e.href[i - t.length] === "?" ? "?" : "";
};
function Dr(e, i = false) {
  return e == null || (e = new URL(e), /^(about|blob|data):$/.test(e.protocol)) ? "no-referrer" : (e.username = "", e.password = "", e.hash = "", i && (e.pathname = "", e.search = ""), e);
}
const pi = /* @__PURE__ */ new Set([
  "",
  "no-referrer",
  "no-referrer-when-downgrade",
  "same-origin",
  "origin",
  "strict-origin",
  "origin-when-cross-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url"
]), wn = "strict-origin-when-cross-origin";
function gn(e) {
  if (!pi.has(e))
    throw new TypeError(`Invalid referrerPolicy: ${e}`);
  return e;
}
function bn(e) {
  if (/^(http|ws)s:$/.test(e.protocol))
    return true;
  const i = e.host.replace(/(^\[)|(]$)/g, ""), t = a$1.isIP(i);
  return t === 4 && /^127\./.test(i) || t === 6 && /^(((0+:){7})|(::(0+:){0,6}))0*1$/.test(i) ? true : e.host === "localhost" || e.host.endsWith(".localhost") ? false : e.protocol === "file:";
}
function Ze(e) {
  return /^about:(blank|srcdoc)$/.test(e) || e.protocol === "data:" || /^(blob|filesystem):$/.test(e.protocol) ? true : bn(e);
}
function En(e, { referrerURLCallback: i, referrerOriginCallback: t } = {}) {
  if (e.referrer === "no-referrer" || e.referrerPolicy === "")
    return null;
  const r = e.referrerPolicy;
  if (e.referrer === "about:client")
    return "no-referrer";
  const a2 = e.referrer;
  let n = Dr(a2), l = Dr(a2, true);
  n.toString().length > 4096 && (n = l), i && (n = i(n)), t && (l = t(l));
  const o = new URL(e.url);
  switch (r) {
    case "no-referrer":
      return "no-referrer";
    case "origin":
      return l;
    case "unsafe-url":
      return n;
    case "strict-origin":
      return Ze(n) && !Ze(o) ? "no-referrer" : l.toString();
    case "strict-origin-when-cross-origin":
      return n.origin === o.origin ? n : Ze(n) && !Ze(o) ? "no-referrer" : l;
    case "same-origin":
      return n.origin === o.origin ? n : "no-referrer";
    case "origin-when-cross-origin":
      return n.origin === o.origin ? n : l;
    case "no-referrer-when-downgrade":
      return Ze(n) && !Ze(o) ? "no-referrer" : n;
    default:
      throw new TypeError(`Invalid referrerPolicy: ${r}`);
  }
}
function pn(e) {
  const i = (e.get("referrer-policy") || "").split(/[,\s]+/);
  let t = "";
  for (const r of i)
    r && pi.has(r) && (t = r);
  return t;
}
const P = /* @__PURE__ */ Symbol("Request internals"), Ue = (e) => typeof e == "object" && typeof e[P] == "object", mn = zs.deprecate(() => {
}, ".data is not a valid RequestInit property, use .body instead", "https://github.com/node-fetch/node-fetch/issues/1000 (request)");
class Xe extends Ke {
  constructor(i, t = {}) {
    let r;
    if (Ue(i) ? r = new URL(i.url) : (r = new URL(i), i = {}), r.username !== "" || r.password !== "")
      throw new TypeError(`${r} is an url with embedded credentials.`);
    let a2 = t.method || i.method || "GET";
    if (/^(delete|get|head|options|post|put)$/i.test(a2) && (a2 = a2.toUpperCase()), !Ue(t) && "data" in t && mn(), (t.body != null || Ue(i) && i.body !== null) && (a2 === "GET" || a2 === "HEAD"))
      throw new TypeError("Request with GET/HEAD method cannot have body");
    const n = t.body ? t.body : Ue(i) && i.body !== null ? Ht(i) : null;
    super(n, {
      size: t.size || i.size || 0
    });
    const l = new de(t.headers || i.headers || {});
    if (n !== null && !l.has("Content-Type")) {
      const f = bi(n);
      f && l.set("Content-Type", f);
    }
    let o = Ue(i) ? i.signal : null;
    if ("signal" in t && (o = t.signal), o != null && !fn(o))
      throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
    let d = t.referrer == null ? i.referrer : t.referrer;
    if (d === "")
      d = "no-referrer";
    else if (d) {
      const f = new URL(d);
      d = /^about:(\/\/)?client$/.test(f) ? "client" : f;
    } else
      d = void 0;
    this[P] = {
      method: a2,
      redirect: t.redirect || i.redirect || "follow",
      headers: l,
      parsedURL: r,
      signal: o,
      referrer: d
    }, this.follow = t.follow === void 0 ? i.follow === void 0 ? 20 : i.follow : t.follow, this.compress = t.compress === void 0 ? i.compress === void 0 ? true : i.compress : t.compress, this.counter = t.counter || i.counter || 0, this.agent = t.agent || i.agent, this.highWaterMark = t.highWaterMark || i.highWaterMark || 16384, this.insecureHTTPParser = t.insecureHTTPParser || i.insecureHTTPParser || false, this.referrerPolicy = t.referrerPolicy || i.referrerPolicy || "";
  }
  /** @returns {string} */
  get method() {
    return this[P].method;
  }
  /** @returns {string} */
  get url() {
    return rt$1.format(this[P].parsedURL);
  }
  /** @returns {Headers} */
  get headers() {
    return this[P].headers;
  }
  get redirect() {
    return this[P].redirect;
  }
  /** @returns {AbortSignal} */
  get signal() {
    return this[P].signal;
  }
  // https://fetch.spec.whatwg.org/#dom-request-referrer
  get referrer() {
    if (this[P].referrer === "no-referrer")
      return "";
    if (this[P].referrer === "client")
      return "about:client";
    if (this[P].referrer)
      return this[P].referrer.toString();
  }
  get referrerPolicy() {
    return this[P].referrerPolicy;
  }
  set referrerPolicy(i) {
    this[P].referrerPolicy = gn(i);
  }
  /**
   * Clone this request
   *
   * @return  Request
   */
  clone() {
    return new Xe(this);
  }
  get [Symbol.toStringTag]() {
    return "Request";
  }
}
Object.defineProperties(Xe.prototype, {
  method: { enumerable: true },
  url: { enumerable: true },
  headers: { enumerable: true },
  redirect: { enumerable: true },
  clone: { enumerable: true },
  signal: { enumerable: true },
  referrer: { enumerable: true },
  referrerPolicy: { enumerable: true }
});
const yn = (e) => {
  const { parsedURL: i } = e[P], t = new de(e[P].headers);
  t.has("Accept") || t.set("Accept", "*/*");
  let r = null;
  if (e.body === null && /^(post|put)$/i.test(e.method) && (r = "0"), e.body !== null) {
    const o = un(e);
    typeof o == "number" && !Number.isNaN(o) && (r = String(o));
  }
  r && t.set("Content-Length", r), e.referrerPolicy === "" && (e.referrerPolicy = wn), e.referrer && e.referrer !== "no-referrer" ? e[P].referrer = En(e) : e[P].referrer = "no-referrer", e[P].referrer instanceof URL && t.set("Referer", e.referrer), t.has("User-Agent") || t.set("User-Agent", "node-fetch"), e.compress && !t.has("Accept-Encoding") && t.set("Accept-Encoding", "gzip, deflate, br");
  let { agent: a2 } = e;
  typeof a2 == "function" && (a2 = a2(i)), !t.has("Connection") && !a2 && t.set("Connection", "close");
  const n = vn(i), l = {
    // Overwrite search to retain trailing ? (issue #776)
    path: i.pathname + n,
    // The following options are not expressed in the URL
    method: e.method,
    headers: t[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")](),
    insecureHTTPParser: e.insecureHTTPParser,
    agent: a2
  };
  return {
    /** @type {URL} */
    parsedURL: i,
    options: l
  };
};
class kn extends vt {
  constructor(i, t = "aborted") {
    super(i, t);
  }
}
const Tn = /* @__PURE__ */ new Set(["data:", "http:", "https:"]);
async function Sn(e, i) {
  return new Promise((t, r) => {
    const a$12 = new Xe(e, i), { parsedURL: n, options: l } = yn(a$12);
    if (!Tn.has(n.protocol))
      throw new TypeError(`node-fetch cannot load ${e}. URL scheme "${n.protocol.replace(/:$/, "")}" is not supported.`);
    const o = (n.protocol === "https:" ? a : cr$1).request, { signal: d } = a$12;
    let f = null;
    const h = () => {
      const v = new kn("The operation was aborted.");
      r(v), a$12.body && a$12.body instanceof C$1.Readable && a$12.body.destroy(v), !(!f || !f.body) && f.body.emit("error", v);
    };
    if (d && d.aborted) {
      h();
      return;
    }
    const g = () => {
      h(), u();
    }, _ = o(n.toString(), l);
    d && d.addEventListener("abort", g);
    const u = () => {
      _.abort(), d && d.removeEventListener("abort", g);
    };
    _.on("error", (v) => {
      r(new fe(`request to ${a$12.url} failed, reason: ${v.message}`, "system", v)), u();
    }), Rn(_, (v) => {
      f && f.body && f.body.destroy(v);
    }), Oe$1.version < "v14" && _.on("socket", (v) => {
      let b;
      v.prependListener("end", () => {
        b = v._eventsCount;
      }), v.prependListener("close", (E) => {
        if (f && b < v._eventsCount && !E) {
          const p = new Error("Premature close");
          p.code = "ERR_STREAM_PREMATURE_CLOSE", f.body.emit("error", p);
        }
      });
    }), _.on("response", (v) => {
      _.setTimeout(0);
      const b = _n(v.rawHeaders);
      if (Ei(v.statusCode)) {
        const m = b.get("Location");
        let w = null;
        try {
          w = m === null ? null : new URL(m, a$12.url);
        } catch {
          if (a$12.redirect !== "manual") {
            r(new fe(`uri requested responds with an invalid redirect URL: ${m}`, "invalid-redirect")), u();
            return;
          }
        }
        switch (a$12.redirect) {
          case "error":
            r(new fe(`uri requested responds with a redirect, redirect mode is set to error: ${a$12.url}`, "no-redirect")), u();
            return;
          case "manual":
            break;
          case "follow": {
            if (w === null)
              break;
            if (a$12.counter >= a$12.follow) {
              r(new fe(`maximum redirect reached at: ${a$12.url}`, "max-redirect")), u();
              return;
            }
            const k = {
              headers: new de(a$12.headers),
              follow: a$12.follow,
              counter: a$12.counter + 1,
              agent: a$12.agent,
              compress: a$12.compress,
              method: a$12.method,
              body: Ht(a$12),
              signal: a$12.signal,
              size: a$12.size,
              referrer: a$12.referrer,
              referrerPolicy: a$12.referrerPolicy
            };
            if (!ln(a$12.url, w) || !on(a$12.url, w))
              for (const T of ["authorization", "www-authenticate", "cookie", "cookie2"])
                k.headers.delete(T);
            if (v.statusCode !== 303 && a$12.body && i.body instanceof C$1.Readable) {
              r(new fe("Cannot follow redirect with body being a readable stream", "unsupported-redirect")), u();
              return;
            }
            (v.statusCode === 303 || (v.statusCode === 301 || v.statusCode === 302) && a$12.method === "POST") && (k.method = "GET", k.body = void 0, k.headers.delete("content-length"));
            const R = pn(b);
            R && (k.referrerPolicy = R), t(Sn(new Xe(w, k))), u();
            return;
          }
          default:
            return r(new TypeError(`Redirect option '${a$12.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      d && v.once("end", () => {
        d.removeEventListener("abort", g);
      });
      let E = S.pipeline(v, new S.PassThrough(), (m) => {
        m && r(m);
      });
      Oe$1.version < "v12.10" && v.on("aborted", g);
      const p = {
        url: a$12.url,
        status: v.statusCode,
        statusText: v.statusMessage,
        headers: b,
        size: a$12.size,
        counter: a$12.counter,
        highWaterMark: a$12.highWaterMark
      }, S$1 = b.get("Content-Encoding");
      if (!a$12.compress || a$12.method === "HEAD" || S$1 === null || v.statusCode === 204 || v.statusCode === 304) {
        f = new X(E, p), t(f);
        return;
      }
      const I = {
        flush: Ie.Z_SYNC_FLUSH,
        finishFlush: Ie.Z_SYNC_FLUSH
      };
      if (S$1 === "gzip" || S$1 === "x-gzip") {
        E = S.pipeline(E, Ie.createGunzip(I), (m) => {
          m && r(m);
        }), f = new X(E, p), t(f);
        return;
      }
      if (S$1 === "deflate" || S$1 === "x-deflate") {
        const m = S.pipeline(v, new S.PassThrough(), (w) => {
          w && r(w);
        });
        m.once("data", (w) => {
          (w[0] & 15) === 8 ? E = S.pipeline(E, Ie.createInflate(), (k) => {
            k && r(k);
          }) : E = S.pipeline(E, Ie.createInflateRaw(), (k) => {
            k && r(k);
          }), f = new X(E, p), t(f);
        }), m.once("end", () => {
          f || (f = new X(E, p), t(f));
        });
        return;
      }
      if (S$1 === "br") {
        E = S.pipeline(E, Ie.createBrotliDecompress(), (m) => {
          m && r(m);
        }), f = new X(E, p), t(f);
        return;
      }
      f = new X(E, p), t(f);
    }), dn(_, a$12).catch(r);
  });
}
function Rn(e, i) {
  const t = Uf.from(`0\r
\r
`);
  let r = false, a2 = false, n;
  e.on("response", (l) => {
    const { headers: o } = l;
    r = o["transfer-encoding"] === "chunked" && !o["content-length"];
  }), e.on("socket", (l) => {
    const o = () => {
      if (r && !a2) {
        const f = new Error("Premature close");
        f.code = "ERR_STREAM_PREMATURE_CLOSE", i(f);
      }
    }, d = (f) => {
      a2 = Uf.compare(f.slice(-5), t) === 0, !a2 && n && (a2 = Uf.compare(n.slice(-3), t.slice(0, 3)) === 0 && Uf.compare(f.slice(-2), t.slice(3)) === 0), n = f;
    };
    l.prependListener("close", o), l.on("data", d), e.on("close", () => {
      l.removeListener("close", o), l.removeListener("data", d);
    });
  });
}
export {
  kn as AbortError,
  fe as FetchError,
  de as Headers,
  Xe as Request,
  X as Response,
  Sn as default,
  Ei as isRedirect
};
