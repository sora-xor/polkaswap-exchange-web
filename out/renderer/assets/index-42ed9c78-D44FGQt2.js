import { X as Xn, U as Ue$1, S as Ss, s as sc } from "./CedeStore-DfpiZiOO.js";
import { a } from "./empty-73bf2089-BEzbM0NJ.js";
import { S } from "./index-08f6a6bd-CvLoXr4d.js";
import { s as Ie$1 } from "./index-7d1bf759-DyVxwjav.js";
import { a as c } from "./index-8f43ecdf-vRKU5WRJ.js";
import { N } from "./browser-8396eed5-IB_ubhyz.js";
import { r as rt } from "./url-6cb53b95-DWjpptWm.js";
import "./index-73GArslZ.js";
function Ie(t, e) {
  for (var n = 0; n < e.length; n++) {
    const a2 = e[n];
    if (typeof a2 != "string" && !Array.isArray(a2)) {
      for (const h in a2)
        if (h !== "default" && !(h in t)) {
          const S2 = Object.getOwnPropertyDescriptor(a2, h);
          S2 && Object.defineProperty(t, h, S2.get ? S2 : {
            enumerable: true,
            get: () => a2[h]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(t, Symbol.toStringTag, { value: "Module" }));
}
var U = {}, Y = {}, X = {}, Q = {}, B = {};
B.endianness = function() {
  return "LE";
};
B.hostname = function() {
  return typeof location < "u" ? location.hostname : "";
};
B.loadavg = function() {
  return [];
};
B.uptime = function() {
  return 0;
};
B.freemem = function() {
  return Number.MAX_VALUE;
};
B.totalmem = function() {
  return Number.MAX_VALUE;
};
B.cpus = function() {
  return [];
};
B.type = function() {
  return "Browser";
};
B.release = function() {
  return typeof navigator < "u" ? navigator.appVersion : "";
};
B.networkInterfaces = B.getNetworkInterfaces = function() {
  return {};
};
B.arch = function() {
  return "javascript";
};
B.platform = function() {
  return "browser";
};
B.tmpdir = B.tmpDir = function() {
  return "/tmp";
};
B.EOL = `
`;
B.homedir = function() {
  return "/";
};
(function(t) {
  const e = t, { Buffer: n } = Xn, a2 = B;
  e.toBuffer = function(s, f, u) {
    u = ~~u;
    let c2;
    if (this.isV4Format(s))
      c2 = f || n.alloc(u + 4), s.split(/\./g).map((l) => {
        c2[u++] = parseInt(l, 10) & 255;
      });
    else if (this.isV6Format(s)) {
      const l = s.split(":", 8);
      let r;
      for (r = 0; r < l.length; r++) {
        const o = this.isV4Format(l[r]);
        let d;
        o && (d = this.toBuffer(l[r]), l[r] = d.slice(0, 2).toString("hex")), d && ++r < 8 && l.splice(r, 0, d.slice(2, 4).toString("hex"));
      }
      if (l[0] === "")
        for (; l.length < 8; )
          l.unshift("0");
      else if (l[l.length - 1] === "")
        for (; l.length < 8; )
          l.push("0");
      else if (l.length < 8) {
        for (r = 0; r < l.length && l[r] !== ""; r++)
          ;
        const o = [r, 1];
        for (r = 9 - l.length; r > 0; r--)
          o.push("0");
        l.splice(...o);
      }
      for (c2 = f || n.alloc(u + 16), r = 0; r < l.length; r++) {
        const o = parseInt(l[r], 16);
        c2[u++] = o >> 8 & 255, c2[u++] = o & 255;
      }
    }
    if (!c2)
      throw Error(`Invalid ip address: ${s}`);
    return c2;
  }, e.toString = function(s, f, u) {
    f = ~~f, u = u || s.length - f;
    let c2 = [];
    if (u === 4) {
      for (let l = 0; l < u; l++)
        c2.push(s[f + l]);
      c2 = c2.join(".");
    } else if (u === 16) {
      for (let l = 0; l < u; l += 2)
        c2.push(s.readUInt16BE(f + l).toString(16));
      c2 = c2.join(":"), c2 = c2.replace(/(^|:)0(:0)*:0(:|$)/, "$1::$3"), c2 = c2.replace(/:{3,4}/, "::");
    }
    return c2;
  };
  const h = /^(\d{1,3}\.){3,3}\d{1,3}$/, S2 = /^(::)?(((\d{1,3}\.){3}(\d{1,3}){1})?([0-9a-f]){0,4}:{0,2}){1,8}(::)?$/i;
  e.isV4Format = function(s) {
    return h.test(s);
  }, e.isV6Format = function(s) {
    return S2.test(s);
  };
  function i(s) {
    return s === 4 ? "ipv4" : s === 6 ? "ipv6" : s ? s.toLowerCase() : "ipv4";
  }
  e.fromPrefixLen = function(s, f) {
    s > 32 ? f = "ipv6" : f = i(f);
    let u = 4;
    f === "ipv6" && (u = 16);
    const c2 = n.alloc(u);
    for (let l = 0, r = c2.length; l < r; ++l) {
      let o = 8;
      s < 8 && (o = s), s -= o, c2[l] = ~(255 >> o) & 255;
    }
    return e.toString(c2);
  }, e.mask = function(s, f) {
    s = e.toBuffer(s), f = e.toBuffer(f);
    const u = n.alloc(Math.max(s.length, f.length));
    let c2;
    if (s.length === f.length)
      for (c2 = 0; c2 < s.length; c2++)
        u[c2] = s[c2] & f[c2];
    else if (f.length === 4)
      for (c2 = 0; c2 < f.length; c2++)
        u[c2] = s[s.length - 4 + c2] & f[c2];
    else {
      for (c2 = 0; c2 < u.length - 6; c2++)
        u[c2] = 0;
      for (u[10] = 255, u[11] = 255, c2 = 0; c2 < s.length; c2++)
        u[c2 + 12] = s[c2] & f[c2 + 12];
      c2 += 12;
    }
    for (; c2 < u.length; c2++)
      u[c2] = 0;
    return e.toString(u);
  }, e.cidr = function(s) {
    const f = s.split("/"), u = f[0];
    if (f.length !== 2)
      throw new Error(`invalid CIDR subnet: ${u}`);
    const c2 = e.fromPrefixLen(parseInt(f[1], 10));
    return e.mask(u, c2);
  }, e.subnet = function(s, f) {
    const u = e.toLong(e.mask(s, f)), c2 = e.toBuffer(f);
    let l = 0;
    for (let o = 0; o < c2.length; o++)
      if (c2[o] === 255)
        l += 8;
      else {
        let d = c2[o] & 255;
        for (; d; )
          d = d << 1 & 255, l++;
      }
    const r = 2 ** (32 - l);
    return {
      networkAddress: e.fromLong(u),
      firstAddress: r <= 2 ? e.fromLong(u) : e.fromLong(u + 1),
      lastAddress: r <= 2 ? e.fromLong(u + r - 1) : e.fromLong(u + r - 2),
      broadcastAddress: e.fromLong(u + r - 1),
      subnetMask: f,
      subnetMaskLength: l,
      numHosts: r <= 2 ? r : r - 2,
      length: r,
      contains(o) {
        return u === e.toLong(e.mask(o, f));
      }
    };
  }, e.cidrSubnet = function(s) {
    const f = s.split("/"), u = f[0];
    if (f.length !== 2)
      throw new Error(`invalid CIDR subnet: ${u}`);
    const c2 = e.fromPrefixLen(parseInt(f[1], 10));
    return e.subnet(u, c2);
  }, e.not = function(s) {
    const f = e.toBuffer(s);
    for (let u = 0; u < f.length; u++)
      f[u] = 255 ^ f[u];
    return e.toString(f);
  }, e.or = function(s, f) {
    if (s = e.toBuffer(s), f = e.toBuffer(f), s.length === f.length) {
      for (let r = 0; r < s.length; ++r)
        s[r] |= f[r];
      return e.toString(s);
    }
    let u = s, c2 = f;
    f.length > s.length && (u = f, c2 = s);
    const l = u.length - c2.length;
    for (let r = l; r < u.length; ++r)
      u[r] |= c2[r - l];
    return e.toString(u);
  }, e.isEqual = function(s, f) {
    if (s = e.toBuffer(s), f = e.toBuffer(f), s.length === f.length) {
      for (let c2 = 0; c2 < s.length; c2++)
        if (s[c2] !== f[c2])
          return false;
      return true;
    }
    if (f.length === 4) {
      const c2 = f;
      f = s, s = c2;
    }
    for (let c2 = 0; c2 < 10; c2++)
      if (f[c2] !== 0)
        return false;
    const u = f.readUInt16BE(10);
    if (u !== 0 && u !== 65535)
      return false;
    for (let c2 = 0; c2 < 4; c2++)
      if (s[c2] !== f[c2 + 12])
        return false;
    return true;
  }, e.isPrivate = function(s) {
    return /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(s) || /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(s) || /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(s) || /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(s) || /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(s) || /^f[cd][0-9a-f]{2}:/i.test(s) || /^fe80:/i.test(s) || /^::1$/.test(s) || /^::$/.test(s);
  }, e.isPublic = function(s) {
    return !e.isPrivate(s);
  }, e.isLoopback = function(s) {
    return /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/.test(s) || /^fe80::1$/.test(s) || /^::1$/.test(s) || /^::$/.test(s);
  }, e.loopback = function(s) {
    if (s = i(s), s !== "ipv4" && s !== "ipv6")
      throw new Error("family must be ipv4 or ipv6");
    return s === "ipv4" ? "127.0.0.1" : "fe80::1";
  }, e.address = function(s, f) {
    const u = a2.networkInterfaces();
    if (f = i(f), s && s !== "private" && s !== "public") {
      const l = u[s].filter((r) => i(r.family) === f);
      return l.length === 0 ? void 0 : l[0].address;
    }
    const c2 = Object.keys(u).map((l) => {
      const r = u[l].filter((o) => (o.family = i(o.family), o.family !== f || e.isLoopback(o.address) ? false : s ? s === "public" ? e.isPrivate(o.address) : e.isPublic(o.address) : true));
      return r.length ? r[0].address : void 0;
    }).filter(Boolean);
    return c2.length ? c2[0] : e.loopback(f);
  }, e.toLong = function(s) {
    let f = 0;
    return s.split(".").forEach((u) => {
      f <<= 8, f += parseInt(u);
    }), f >>> 0;
  }, e.fromLong = function(s) {
    return `${s >>> 24}.${s >> 16 & 255}.${s >> 8 & 255}.${s & 255}`;
  };
})(Q);
var G = {}, O = {};
Object.defineProperty(O, "__esModule", { value: true });
const ee = Xn, C = {
  INVALID_ENCODING: "Invalid encoding provided. Please specify a valid encoding the internal Node.js Buffer supports.",
  INVALID_SMARTBUFFER_SIZE: "Invalid size provided. Size must be a valid integer greater than zero.",
  INVALID_SMARTBUFFER_BUFFER: "Invalid Buffer provided in SmartBufferOptions.",
  INVALID_SMARTBUFFER_OBJECT: "Invalid SmartBufferOptions object supplied to SmartBuffer constructor or factory methods.",
  INVALID_OFFSET: "An invalid offset value was provided.",
  INVALID_OFFSET_NON_NUMBER: "An invalid offset value was provided. A numeric value is required.",
  INVALID_LENGTH: "An invalid length value was provided.",
  INVALID_LENGTH_NON_NUMBER: "An invalid length value was provived. A numeric value is required.",
  INVALID_TARGET_OFFSET: "Target offset is beyond the bounds of the internal SmartBuffer data.",
  INVALID_TARGET_LENGTH: "Specified length value moves cursor beyong the bounds of the internal SmartBuffer data.",
  INVALID_READ_BEYOND_BOUNDS: "Attempted to read beyond the bounds of the managed data.",
  INVALID_WRITE_BEYOND_BOUNDS: "Attempted to write beyond the bounds of the managed data."
};
O.ERRORS = C;
function me(t) {
  if (!ee.Buffer.isEncoding(t))
    throw new Error(C.INVALID_ENCODING);
}
O.checkEncoding = me;
function te(t) {
  return typeof t == "number" && isFinite(t) && we(t);
}
O.isFiniteInteger = te;
function ne(t, e) {
  if (typeof t == "number") {
    if (!te(t) || t < 0)
      throw new Error(e ? C.INVALID_OFFSET : C.INVALID_LENGTH);
  } else
    throw new Error(e ? C.INVALID_OFFSET_NON_NUMBER : C.INVALID_LENGTH_NON_NUMBER);
}
function ke(t) {
  ne(t, false);
}
O.checkLengthValue = ke;
function ge(t) {
  ne(t, true);
}
O.checkOffsetValue = ge;
function Ee(t, e) {
  if (t < 0 || t > e.length)
    throw new Error(C.INVALID_TARGET_OFFSET);
}
O.checkTargetOffset = Ee;
function we(t) {
  return typeof t == "number" && isFinite(t) && Math.floor(t) === t;
}
function Be(t) {
  if (typeof BigInt > "u")
    throw new Error("Platform does not support JS BigInt type.");
  if (typeof ee.Buffer.prototype[t] > "u")
    throw new Error(`Platform does not support Buffer.prototype.${t}.`);
}
O.bigIntAndBufferInt64Check = Be;
Object.defineProperty(G, "__esModule", { value: true });
const I = O, Z = 4096, be = "utf8";
class q {
  /**
   * Creates a new SmartBuffer instance.
   *
   * @param options { SmartBufferOptions } The SmartBufferOptions to apply to this instance.
   */
  constructor(e) {
    if (this.length = 0, this._encoding = be, this._writeOffset = 0, this._readOffset = 0, q.isSmartBufferOptions(e))
      if (e.encoding && (I.checkEncoding(e.encoding), this._encoding = e.encoding), e.size)
        if (I.isFiniteInteger(e.size) && e.size > 0)
          this._buff = sc.allocUnsafe(e.size);
        else
          throw new Error(I.ERRORS.INVALID_SMARTBUFFER_SIZE);
      else if (e.buff)
        if (sc.isBuffer(e.buff))
          this._buff = e.buff, this.length = e.buff.length;
        else
          throw new Error(I.ERRORS.INVALID_SMARTBUFFER_BUFFER);
      else
        this._buff = sc.allocUnsafe(Z);
    else {
      if (typeof e < "u")
        throw new Error(I.ERRORS.INVALID_SMARTBUFFER_OBJECT);
      this._buff = sc.allocUnsafe(Z);
    }
  }
  /**
   * Creates a new SmartBuffer instance with the provided internal Buffer size and optional encoding.
   *
   * @param size { Number } The size of the internal Buffer.
   * @param encoding { String } The BufferEncoding to use for strings.
   *
   * @return { SmartBuffer }
   */
  static fromSize(e, n) {
    return new this({
      size: e,
      encoding: n
    });
  }
  /**
   * Creates a new SmartBuffer instance with the provided Buffer and optional encoding.
   *
   * @param buffer { Buffer } The Buffer to use as the internal Buffer value.
   * @param encoding { String } The BufferEncoding to use for strings.
   *
   * @return { SmartBuffer }
   */
  static fromBuffer(e, n) {
    return new this({
      buff: e,
      encoding: n
    });
  }
  /**
   * Creates a new SmartBuffer instance with the provided SmartBufferOptions options.
   *
   * @param options { SmartBufferOptions } The options to use when creating the SmartBuffer instance.
   */
  static fromOptions(e) {
    return new this(e);
  }
  /**
   * Type checking function that determines if an object is a SmartBufferOptions object.
   */
  static isSmartBufferOptions(e) {
    const n = e;
    return n && (n.encoding !== void 0 || n.size !== void 0 || n.buff !== void 0);
  }
  // Signed integers
  /**
   * Reads an Int8 value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readInt8(e) {
    return this._readNumberValue(sc.prototype.readInt8, 1, e);
  }
  /**
   * Reads an Int16BE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readInt16BE(e) {
    return this._readNumberValue(sc.prototype.readInt16BE, 2, e);
  }
  /**
   * Reads an Int16LE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readInt16LE(e) {
    return this._readNumberValue(sc.prototype.readInt16LE, 2, e);
  }
  /**
   * Reads an Int32BE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readInt32BE(e) {
    return this._readNumberValue(sc.prototype.readInt32BE, 4, e);
  }
  /**
   * Reads an Int32LE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readInt32LE(e) {
    return this._readNumberValue(sc.prototype.readInt32LE, 4, e);
  }
  /**
   * Reads a BigInt64BE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { BigInt }
   */
  readBigInt64BE(e) {
    return I.bigIntAndBufferInt64Check("readBigInt64BE"), this._readNumberValue(sc.prototype.readBigInt64BE, 8, e);
  }
  /**
   * Reads a BigInt64LE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { BigInt }
   */
  readBigInt64LE(e) {
    return I.bigIntAndBufferInt64Check("readBigInt64LE"), this._readNumberValue(sc.prototype.readBigInt64LE, 8, e);
  }
  /**
   * Writes an Int8 value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeInt8(e, n) {
    return this._writeNumberValue(sc.prototype.writeInt8, 1, e, n), this;
  }
  /**
   * Inserts an Int8 value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertInt8(e, n) {
    return this._insertNumberValue(sc.prototype.writeInt8, 1, e, n);
  }
  /**
   * Writes an Int16BE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeInt16BE(e, n) {
    return this._writeNumberValue(sc.prototype.writeInt16BE, 2, e, n);
  }
  /**
   * Inserts an Int16BE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertInt16BE(e, n) {
    return this._insertNumberValue(sc.prototype.writeInt16BE, 2, e, n);
  }
  /**
   * Writes an Int16LE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeInt16LE(e, n) {
    return this._writeNumberValue(sc.prototype.writeInt16LE, 2, e, n);
  }
  /**
   * Inserts an Int16LE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertInt16LE(e, n) {
    return this._insertNumberValue(sc.prototype.writeInt16LE, 2, e, n);
  }
  /**
   * Writes an Int32BE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeInt32BE(e, n) {
    return this._writeNumberValue(sc.prototype.writeInt32BE, 4, e, n);
  }
  /**
   * Inserts an Int32BE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertInt32BE(e, n) {
    return this._insertNumberValue(sc.prototype.writeInt32BE, 4, e, n);
  }
  /**
   * Writes an Int32LE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeInt32LE(e, n) {
    return this._writeNumberValue(sc.prototype.writeInt32LE, 4, e, n);
  }
  /**
   * Inserts an Int32LE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertInt32LE(e, n) {
    return this._insertNumberValue(sc.prototype.writeInt32LE, 4, e, n);
  }
  /**
   * Writes a BigInt64BE value to the current write position (or at optional offset).
   *
   * @param value { BigInt } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeBigInt64BE(e, n) {
    return I.bigIntAndBufferInt64Check("writeBigInt64BE"), this._writeNumberValue(sc.prototype.writeBigInt64BE, 8, e, n);
  }
  /**
   * Inserts a BigInt64BE value at the given offset value.
   *
   * @param value { BigInt } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertBigInt64BE(e, n) {
    return I.bigIntAndBufferInt64Check("writeBigInt64BE"), this._insertNumberValue(sc.prototype.writeBigInt64BE, 8, e, n);
  }
  /**
   * Writes a BigInt64LE value to the current write position (or at optional offset).
   *
   * @param value { BigInt } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeBigInt64LE(e, n) {
    return I.bigIntAndBufferInt64Check("writeBigInt64LE"), this._writeNumberValue(sc.prototype.writeBigInt64LE, 8, e, n);
  }
  /**
   * Inserts a Int64LE value at the given offset value.
   *
   * @param value { BigInt } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertBigInt64LE(e, n) {
    return I.bigIntAndBufferInt64Check("writeBigInt64LE"), this._insertNumberValue(sc.prototype.writeBigInt64LE, 8, e, n);
  }
  // Unsigned Integers
  /**
   * Reads an UInt8 value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readUInt8(e) {
    return this._readNumberValue(sc.prototype.readUInt8, 1, e);
  }
  /**
   * Reads an UInt16BE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readUInt16BE(e) {
    return this._readNumberValue(sc.prototype.readUInt16BE, 2, e);
  }
  /**
   * Reads an UInt16LE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readUInt16LE(e) {
    return this._readNumberValue(sc.prototype.readUInt16LE, 2, e);
  }
  /**
   * Reads an UInt32BE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readUInt32BE(e) {
    return this._readNumberValue(sc.prototype.readUInt32BE, 4, e);
  }
  /**
   * Reads an UInt32LE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readUInt32LE(e) {
    return this._readNumberValue(sc.prototype.readUInt32LE, 4, e);
  }
  /**
   * Reads a BigUInt64BE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { BigInt }
   */
  readBigUInt64BE(e) {
    return I.bigIntAndBufferInt64Check("readBigUInt64BE"), this._readNumberValue(sc.prototype.readBigUInt64BE, 8, e);
  }
  /**
   * Reads a BigUInt64LE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { BigInt }
   */
  readBigUInt64LE(e) {
    return I.bigIntAndBufferInt64Check("readBigUInt64LE"), this._readNumberValue(sc.prototype.readBigUInt64LE, 8, e);
  }
  /**
   * Writes an UInt8 value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeUInt8(e, n) {
    return this._writeNumberValue(sc.prototype.writeUInt8, 1, e, n);
  }
  /**
   * Inserts an UInt8 value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertUInt8(e, n) {
    return this._insertNumberValue(sc.prototype.writeUInt8, 1, e, n);
  }
  /**
   * Writes an UInt16BE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeUInt16BE(e, n) {
    return this._writeNumberValue(sc.prototype.writeUInt16BE, 2, e, n);
  }
  /**
   * Inserts an UInt16BE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertUInt16BE(e, n) {
    return this._insertNumberValue(sc.prototype.writeUInt16BE, 2, e, n);
  }
  /**
   * Writes an UInt16LE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeUInt16LE(e, n) {
    return this._writeNumberValue(sc.prototype.writeUInt16LE, 2, e, n);
  }
  /**
   * Inserts an UInt16LE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertUInt16LE(e, n) {
    return this._insertNumberValue(sc.prototype.writeUInt16LE, 2, e, n);
  }
  /**
   * Writes an UInt32BE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeUInt32BE(e, n) {
    return this._writeNumberValue(sc.prototype.writeUInt32BE, 4, e, n);
  }
  /**
   * Inserts an UInt32BE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertUInt32BE(e, n) {
    return this._insertNumberValue(sc.prototype.writeUInt32BE, 4, e, n);
  }
  /**
   * Writes an UInt32LE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeUInt32LE(e, n) {
    return this._writeNumberValue(sc.prototype.writeUInt32LE, 4, e, n);
  }
  /**
   * Inserts an UInt32LE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertUInt32LE(e, n) {
    return this._insertNumberValue(sc.prototype.writeUInt32LE, 4, e, n);
  }
  /**
   * Writes a BigUInt64BE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeBigUInt64BE(e, n) {
    return I.bigIntAndBufferInt64Check("writeBigUInt64BE"), this._writeNumberValue(sc.prototype.writeBigUInt64BE, 8, e, n);
  }
  /**
   * Inserts a BigUInt64BE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertBigUInt64BE(e, n) {
    return I.bigIntAndBufferInt64Check("writeBigUInt64BE"), this._insertNumberValue(sc.prototype.writeBigUInt64BE, 8, e, n);
  }
  /**
   * Writes a BigUInt64LE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeBigUInt64LE(e, n) {
    return I.bigIntAndBufferInt64Check("writeBigUInt64LE"), this._writeNumberValue(sc.prototype.writeBigUInt64LE, 8, e, n);
  }
  /**
   * Inserts a BigUInt64LE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertBigUInt64LE(e, n) {
    return I.bigIntAndBufferInt64Check("writeBigUInt64LE"), this._insertNumberValue(sc.prototype.writeBigUInt64LE, 8, e, n);
  }
  // Floating Point
  /**
   * Reads an FloatBE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readFloatBE(e) {
    return this._readNumberValue(sc.prototype.readFloatBE, 4, e);
  }
  /**
   * Reads an FloatLE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readFloatLE(e) {
    return this._readNumberValue(sc.prototype.readFloatLE, 4, e);
  }
  /**
   * Writes a FloatBE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeFloatBE(e, n) {
    return this._writeNumberValue(sc.prototype.writeFloatBE, 4, e, n);
  }
  /**
   * Inserts a FloatBE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertFloatBE(e, n) {
    return this._insertNumberValue(sc.prototype.writeFloatBE, 4, e, n);
  }
  /**
   * Writes a FloatLE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeFloatLE(e, n) {
    return this._writeNumberValue(sc.prototype.writeFloatLE, 4, e, n);
  }
  /**
   * Inserts a FloatLE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertFloatLE(e, n) {
    return this._insertNumberValue(sc.prototype.writeFloatLE, 4, e, n);
  }
  // Double Floating Point
  /**
   * Reads an DoublEBE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readDoubleBE(e) {
    return this._readNumberValue(sc.prototype.readDoubleBE, 8, e);
  }
  /**
   * Reads an DoubleLE value from the current read position or an optionally provided offset.
   *
   * @param offset { Number } The offset to read data from (optional)
   * @return { Number }
   */
  readDoubleLE(e) {
    return this._readNumberValue(sc.prototype.readDoubleLE, 8, e);
  }
  /**
   * Writes a DoubleBE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeDoubleBE(e, n) {
    return this._writeNumberValue(sc.prototype.writeDoubleBE, 8, e, n);
  }
  /**
   * Inserts a DoubleBE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertDoubleBE(e, n) {
    return this._insertNumberValue(sc.prototype.writeDoubleBE, 8, e, n);
  }
  /**
   * Writes a DoubleLE value to the current write position (or at optional offset).
   *
   * @param value { Number } The value to write.
   * @param offset { Number } The offset to write the value at.
   *
   * @return this
   */
  writeDoubleLE(e, n) {
    return this._writeNumberValue(sc.prototype.writeDoubleLE, 8, e, n);
  }
  /**
   * Inserts a DoubleLE value at the given offset value.
   *
   * @param value { Number } The value to insert.
   * @param offset { Number } The offset to insert the value at.
   *
   * @return this
   */
  insertDoubleLE(e, n) {
    return this._insertNumberValue(sc.prototype.writeDoubleLE, 8, e, n);
  }
  // Strings
  /**
   * Reads a String from the current read position.
   *
   * @param arg1 { Number | String } The number of bytes to read as a String, or the BufferEncoding to use for
   *             the string (Defaults to instance level encoding).
   * @param encoding { String } The BufferEncoding to use for the string (Defaults to instance level encoding).
   *
   * @return { String }
   */
  readString(e, n) {
    let a2;
    typeof e == "number" ? (I.checkLengthValue(e), a2 = Math.min(e, this.length - this._readOffset)) : (n = e, a2 = this.length - this._readOffset), typeof n < "u" && I.checkEncoding(n);
    const h = this._buff.slice(this._readOffset, this._readOffset + a2).toString(n || this._encoding);
    return this._readOffset += a2, h;
  }
  /**
   * Inserts a String
   *
   * @param value { String } The String value to insert.
   * @param offset { Number } The offset to insert the string at.
   * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
   *
   * @return this
   */
  insertString(e, n, a2) {
    return I.checkOffsetValue(n), this._handleString(e, true, n, a2);
  }
  /**
   * Writes a String
   *
   * @param value { String } The String value to write.
   * @param arg2 { Number | String } The offset to write the string at, or the BufferEncoding to use.
   * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
   *
   * @return this
   */
  writeString(e, n, a2) {
    return this._handleString(e, false, n, a2);
  }
  /**
   * Reads a null-terminated String from the current read position.
   *
   * @param encoding { String } The BufferEncoding to use for the string (Defaults to instance level encoding).
   *
   * @return { String }
   */
  readStringNT(e) {
    typeof e < "u" && I.checkEncoding(e);
    let n = this.length;
    for (let h = this._readOffset; h < this.length; h++)
      if (this._buff[h] === 0) {
        n = h;
        break;
      }
    const a2 = this._buff.slice(this._readOffset, n);
    return this._readOffset = n + 1, a2.toString(e || this._encoding);
  }
  /**
   * Inserts a null-terminated String.
   *
   * @param value { String } The String value to write.
   * @param arg2 { Number | String } The offset to write the string to, or the BufferEncoding to use.
   * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
   *
   * @return this
   */
  insertStringNT(e, n, a2) {
    return I.checkOffsetValue(n), this.insertString(e, n, a2), this.insertUInt8(0, n + e.length), this;
  }
  /**
   * Writes a null-terminated String.
   *
   * @param value { String } The String value to write.
   * @param arg2 { Number | String } The offset to write the string to, or the BufferEncoding to use.
   * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
   *
   * @return this
   */
  writeStringNT(e, n, a2) {
    return this.writeString(e, n, a2), this.writeUInt8(0, typeof n == "number" ? n + e.length : this.writeOffset), this;
  }
  // Buffers
  /**
   * Reads a Buffer from the internal read position.
   *
   * @param length { Number } The length of data to read as a Buffer.
   *
   * @return { Buffer }
   */
  readBuffer(e) {
    typeof e < "u" && I.checkLengthValue(e);
    const n = typeof e == "number" ? e : this.length, a2 = Math.min(this.length, this._readOffset + n), h = this._buff.slice(this._readOffset, a2);
    return this._readOffset = a2, h;
  }
  /**
   * Writes a Buffer to the current write position.
   *
   * @param value { Buffer } The Buffer to write.
   * @param offset { Number } The offset to write the Buffer to.
   *
   * @return this
   */
  insertBuffer(e, n) {
    return I.checkOffsetValue(n), this._handleBuffer(e, true, n);
  }
  /**
   * Writes a Buffer to the current write position.
   *
   * @param value { Buffer } The Buffer to write.
   * @param offset { Number } The offset to write the Buffer to.
   *
   * @return this
   */
  writeBuffer(e, n) {
    return this._handleBuffer(e, false, n);
  }
  /**
   * Reads a null-terminated Buffer from the current read poisiton.
   *
   * @return { Buffer }
   */
  readBufferNT() {
    let e = this.length;
    for (let a2 = this._readOffset; a2 < this.length; a2++)
      if (this._buff[a2] === 0) {
        e = a2;
        break;
      }
    const n = this._buff.slice(this._readOffset, e);
    return this._readOffset = e + 1, n;
  }
  /**
   * Inserts a null-terminated Buffer.
   *
   * @param value { Buffer } The Buffer to write.
   * @param offset { Number } The offset to write the Buffer to.
   *
   * @return this
   */
  insertBufferNT(e, n) {
    return I.checkOffsetValue(n), this.insertBuffer(e, n), this.insertUInt8(0, n + e.length), this;
  }
  /**
   * Writes a null-terminated Buffer.
   *
   * @param value { Buffer } The Buffer to write.
   * @param offset { Number } The offset to write the Buffer to.
   *
   * @return this
   */
  writeBufferNT(e, n) {
    return typeof n < "u" && I.checkOffsetValue(n), this.writeBuffer(e, n), this.writeUInt8(0, typeof n == "number" ? n + e.length : this._writeOffset), this;
  }
  /**
   * Clears the SmartBuffer instance to its original empty state.
   */
  clear() {
    return this._writeOffset = 0, this._readOffset = 0, this.length = 0, this;
  }
  /**
   * Gets the remaining data left to be read from the SmartBuffer instance.
   *
   * @return { Number }
   */
  remaining() {
    return this.length - this._readOffset;
  }
  /**
   * Gets the current read offset value of the SmartBuffer instance.
   *
   * @return { Number }
   */
  get readOffset() {
    return this._readOffset;
  }
  /**
   * Sets the read offset value of the SmartBuffer instance.
   *
   * @param offset { Number } - The offset value to set.
   */
  set readOffset(e) {
    I.checkOffsetValue(e), I.checkTargetOffset(e, this), this._readOffset = e;
  }
  /**
   * Gets the current write offset value of the SmartBuffer instance.
   *
   * @return { Number }
   */
  get writeOffset() {
    return this._writeOffset;
  }
  /**
   * Sets the write offset value of the SmartBuffer instance.
   *
   * @param offset { Number } - The offset value to set.
   */
  set writeOffset(e) {
    I.checkOffsetValue(e), I.checkTargetOffset(e, this), this._writeOffset = e;
  }
  /**
   * Gets the currently set string encoding of the SmartBuffer instance.
   *
   * @return { BufferEncoding } The string Buffer encoding currently set.
   */
  get encoding() {
    return this._encoding;
  }
  /**
   * Sets the string encoding of the SmartBuffer instance.
   *
   * @param encoding { BufferEncoding } The string Buffer encoding to set.
   */
  set encoding(e) {
    I.checkEncoding(e), this._encoding = e;
  }
  /**
   * Gets the underlying internal Buffer. (This includes unmanaged data in the Buffer)
   *
   * @return { Buffer } The Buffer value.
   */
  get internalBuffer() {
    return this._buff;
  }
  /**
   * Gets the value of the internal managed Buffer (Includes managed data only)
   *
   * @param { Buffer }
   */
  toBuffer() {
    return this._buff.slice(0, this.length);
  }
  /**
   * Gets the String value of the internal managed Buffer
   *
   * @param encoding { String } The BufferEncoding to display the Buffer as (defaults to instance level encoding).
   */
  toString(e) {
    const n = typeof e == "string" ? e : this._encoding;
    return I.checkEncoding(n), this._buff.toString(n, 0, this.length);
  }
  /**
   * Destroys the SmartBuffer instance.
   */
  destroy() {
    return this.clear(), this;
  }
  /**
   * Handles inserting and writing strings.
   *
   * @param value { String } The String value to insert.
   * @param isInsert { Boolean } True if inserting a string, false if writing.
   * @param arg2 { Number | String } The offset to insert the string at, or the BufferEncoding to use.
   * @param encoding { String } The BufferEncoding to use for writing strings (defaults to instance encoding).
   */
  _handleString(e, n, a2, h) {
    let S2 = this._writeOffset, i = this._encoding;
    typeof a2 == "number" ? S2 = a2 : typeof a2 == "string" && (I.checkEncoding(a2), i = a2), typeof h == "string" && (I.checkEncoding(h), i = h);
    const s = sc.byteLength(e, i);
    return n ? this.ensureInsertable(s, S2) : this._ensureWriteable(s, S2), this._buff.write(e, S2, s, i), n ? this._writeOffset += s : typeof a2 == "number" ? this._writeOffset = Math.max(this._writeOffset, S2 + s) : this._writeOffset += s, this;
  }
  /**
   * Handles writing or insert of a Buffer.
   *
   * @param value { Buffer } The Buffer to write.
   * @param offset { Number } The offset to write the Buffer to.
   */
  _handleBuffer(e, n, a2) {
    const h = typeof a2 == "number" ? a2 : this._writeOffset;
    return n ? this.ensureInsertable(e.length, h) : this._ensureWriteable(e.length, h), e.copy(this._buff, h), n ? this._writeOffset += e.length : typeof a2 == "number" ? this._writeOffset = Math.max(this._writeOffset, h + e.length) : this._writeOffset += e.length, this;
  }
  /**
   * Ensures that the internal Buffer is large enough to read data.
   *
   * @param length { Number } The length of the data that needs to be read.
   * @param offset { Number } The offset of the data that needs to be read.
   */
  ensureReadable(e, n) {
    let a2 = this._readOffset;
    if (typeof n < "u" && (I.checkOffsetValue(n), a2 = n), a2 < 0 || a2 + e > this.length)
      throw new Error(I.ERRORS.INVALID_READ_BEYOND_BOUNDS);
  }
  /**
   * Ensures that the internal Buffer is large enough to insert data.
   *
   * @param dataLength { Number } The length of the data that needs to be written.
   * @param offset { Number } The offset of the data to be written.
   */
  ensureInsertable(e, n) {
    I.checkOffsetValue(n), this._ensureCapacity(this.length + e), n < this.length && this._buff.copy(this._buff, n + e, n, this._buff.length), n + e > this.length ? this.length = n + e : this.length += e;
  }
  /**
   * Ensures that the internal Buffer is large enough to write data.
   *
   * @param dataLength { Number } The length of the data that needs to be written.
   * @param offset { Number } The offset of the data to be written (defaults to writeOffset).
   */
  _ensureWriteable(e, n) {
    const a2 = typeof n == "number" ? n : this._writeOffset;
    this._ensureCapacity(a2 + e), a2 + e > this.length && (this.length = a2 + e);
  }
  /**
   * Ensures that the internal Buffer is large enough to write at least the given amount of data.
   *
   * @param minLength { Number } The minimum length of the data needs to be written.
   */
  _ensureCapacity(e) {
    const n = this._buff.length;
    if (e > n) {
      let a2 = this._buff, h = n * 3 / 2 + 1;
      h < e && (h = e), this._buff = sc.allocUnsafe(h), a2.copy(this._buff, 0, 0, n);
    }
  }
  /**
   * Reads a numeric number value using the provided function.
   *
   * @typeparam T { number | bigint } The type of the value to be read
   *
   * @param func { Function(offset: number) => number } The function to read data on the internal Buffer with.
   * @param byteSize { Number } The number of bytes read.
   * @param offset { Number } The offset to read from (optional). When this is not provided, the managed readOffset is used instead.
   *
   * @returns { T } the number value
   */
  _readNumberValue(e, n, a2) {
    this.ensureReadable(n, a2);
    const h = e.call(this._buff, typeof a2 == "number" ? a2 : this._readOffset);
    return typeof a2 > "u" && (this._readOffset += n), h;
  }
  /**
   * Inserts a numeric number value based on the given offset and value.
   *
   * @typeparam T { number | bigint } The type of the value to be written
   *
   * @param func { Function(offset: T, offset?) => number} The function to write data on the internal Buffer with.
   * @param byteSize { Number } The number of bytes written.
   * @param value { T } The number value to write.
   * @param offset { Number } the offset to write the number at (REQUIRED).
   *
   * @returns SmartBuffer this buffer
   */
  _insertNumberValue(e, n, a2, h) {
    return I.checkOffsetValue(h), this.ensureInsertable(n, h), e.call(this._buff, a2, h), this._writeOffset += n, this;
  }
  /**
   * Writes a numeric number value based on the given offset and value.
   *
   * @typeparam T { number | bigint } The type of the value to be written
   *
   * @param func { Function(offset: T, offset?) => number} The function to write data on the internal Buffer with.
   * @param byteSize { Number } The number of bytes written.
   * @param value { T } The number value to write.
   * @param offset { Number } the offset to write the number at (REQUIRED).
   *
   * @returns SmartBuffer this buffer
   */
  _writeNumberValue(e, n, a2, h) {
    if (typeof h == "number") {
      if (h < 0)
        throw new Error(I.ERRORS.INVALID_WRITE_BEYOND_BOUNDS);
      I.checkOffsetValue(h);
    }
    const S2 = typeof h == "number" ? h : this._writeOffset;
    return this._ensureWriteable(n, S2), e.call(this._buff, a2, S2), typeof h == "number" ? this._writeOffset = Math.max(this._writeOffset, S2 + n) : this._writeOffset += n, this;
  }
}
G.SmartBuffer = q;
var E = {};
Object.defineProperty(E, "__esModule", { value: true });
E.SOCKS5_NO_ACCEPTABLE_AUTH = E.SOCKS5_CUSTOM_AUTH_END = E.SOCKS5_CUSTOM_AUTH_START = E.SOCKS_INCOMING_PACKET_SIZES = E.SocksClientState = E.Socks5Response = E.Socks5HostType = E.Socks5Auth = E.Socks4Response = E.SocksCommand = E.ERRORS = E.DEFAULT_TIMEOUT = void 0;
const Oe = 3e4;
E.DEFAULT_TIMEOUT = Oe;
const ve = {
  InvalidSocksCommand: "An invalid SOCKS command was provided. Valid options are connect, bind, and associate.",
  InvalidSocksCommandForOperation: "An invalid SOCKS command was provided. Only a subset of commands are supported for this operation.",
  InvalidSocksCommandChain: "An invalid SOCKS command was provided. Chaining currently only supports the connect command.",
  InvalidSocksClientOptionsDestination: "An invalid destination host was provided.",
  InvalidSocksClientOptionsExistingSocket: "An invalid existing socket was provided. This should be an instance of stream.Duplex.",
  InvalidSocksClientOptionsProxy: "Invalid SOCKS proxy details were provided.",
  InvalidSocksClientOptionsTimeout: "An invalid timeout value was provided. Please enter a value above 0 (in ms).",
  InvalidSocksClientOptionsProxiesLength: "At least two socks proxies must be provided for chaining.",
  InvalidSocksClientOptionsCustomAuthRange: "Custom auth must be a value between 0x80 and 0xFE.",
  InvalidSocksClientOptionsCustomAuthOptions: "When a custom_auth_method is provided, custom_auth_request_handler, custom_auth_response_size, and custom_auth_response_handler must also be provided and valid.",
  NegotiationError: "Negotiation error",
  SocketClosed: "Socket closed",
  ProxyConnectionTimedOut: "Proxy connection timed out",
  InternalError: "SocksClient internal error (this should not happen)",
  InvalidSocks4HandshakeResponse: "Received invalid Socks4 handshake response",
  Socks4ProxyRejectedConnection: "Socks4 Proxy rejected connection",
  InvalidSocks4IncomingConnectionResponse: "Socks4 invalid incoming connection response",
  Socks4ProxyRejectedIncomingBoundConnection: "Socks4 Proxy rejected incoming bound connection",
  InvalidSocks5InitialHandshakeResponse: "Received invalid Socks5 initial handshake response",
  InvalidSocks5IntiailHandshakeSocksVersion: "Received invalid Socks5 initial handshake (invalid socks version)",
  InvalidSocks5InitialHandshakeNoAcceptedAuthType: "Received invalid Socks5 initial handshake (no accepted authentication type)",
  InvalidSocks5InitialHandshakeUnknownAuthType: "Received invalid Socks5 initial handshake (unknown authentication type)",
  Socks5AuthenticationFailed: "Socks5 Authentication failed",
  InvalidSocks5FinalHandshake: "Received invalid Socks5 final handshake response",
  InvalidSocks5FinalHandshakeRejected: "Socks5 proxy rejected connection",
  InvalidSocks5IncomingConnectionResponse: "Received invalid Socks5 incoming connection response",
  Socks5ProxyRejectedIncomingBoundConnection: "Socks5 Proxy rejected incoming bound connection"
};
E.ERRORS = ve;
const ye = {
  Socks5InitialHandshakeResponse: 2,
  Socks5UserPassAuthenticationResponse: 2,
  // Command response + incoming connection (bind)
  Socks5ResponseHeader: 5,
  Socks5ResponseIPv4: 10,
  Socks5ResponseIPv6: 22,
  Socks5ResponseHostname: (t) => t + 7,
  // Command response + incoming connection (bind)
  Socks4Response: 8
  // 2 header + 2 port + 4 ip
};
E.SOCKS_INCOMING_PACKET_SIZES = ye;
var F;
(function(t) {
  t[t.connect = 1] = "connect", t[t.bind = 2] = "bind", t[t.associate = 3] = "associate";
})(F || (F = {}));
E.SocksCommand = F;
var D;
(function(t) {
  t[t.Granted = 90] = "Granted", t[t.Failed = 91] = "Failed", t[t.Rejected = 92] = "Rejected", t[t.RejectedIdent = 93] = "RejectedIdent";
})(D || (D = {}));
E.Socks4Response = D;
var M;
(function(t) {
  t[t.NoAuth = 0] = "NoAuth", t[t.GSSApi = 1] = "GSSApi", t[t.UserPass = 2] = "UserPass";
})(M || (M = {}));
E.Socks5Auth = M;
const Ce = 128;
E.SOCKS5_CUSTOM_AUTH_START = Ce;
const Re = 254;
E.SOCKS5_CUSTOM_AUTH_END = Re;
const Ae = 255;
E.SOCKS5_NO_ACCEPTABLE_AUTH = Ae;
var j;
(function(t) {
  t[t.Granted = 0] = "Granted", t[t.Failure = 1] = "Failure", t[t.NotAllowed = 2] = "NotAllowed", t[t.NetworkUnreachable = 3] = "NetworkUnreachable", t[t.HostUnreachable = 4] = "HostUnreachable", t[t.ConnectionRefused = 5] = "ConnectionRefused", t[t.TTLExpired = 6] = "TTLExpired", t[t.CommandNotSupported = 7] = "CommandNotSupported", t[t.AddressNotSupported = 8] = "AddressNotSupported";
})(j || (j = {}));
E.Socks5Response = j;
var K;
(function(t) {
  t[t.IPv4 = 1] = "IPv4", t[t.Hostname = 3] = "Hostname", t[t.IPv6 = 4] = "IPv6";
})(K || (K = {}));
E.Socks5HostType = K;
var $;
(function(t) {
  t[t.Created = 0] = "Created", t[t.Connecting = 1] = "Connecting", t[t.Connected = 2] = "Connected", t[t.SentInitialHandshake = 3] = "SentInitialHandshake", t[t.ReceivedInitialHandshakeResponse = 4] = "ReceivedInitialHandshakeResponse", t[t.SentAuthentication = 5] = "SentAuthentication", t[t.ReceivedAuthenticationResponse = 6] = "ReceivedAuthenticationResponse", t[t.SentFinalHandshake = 7] = "SentFinalHandshake", t[t.ReceivedFinalResponse = 8] = "ReceivedFinalResponse", t[t.BoundWaitingForConnection = 9] = "BoundWaitingForConnection", t[t.Established = 10] = "Established", t[t.Disconnected = 11] = "Disconnected", t[t.Error = 99] = "Error";
})($ || ($ = {}));
E.SocksClientState = $;
var A = {}, R = {};
Object.defineProperty(R, "__esModule", { value: true });
R.shuffleArray = R.SocksClientError = void 0;
class Ne extends Error {
  constructor(e, n) {
    super(e), this.options = n;
  }
}
R.SocksClientError = Ne;
function Ue(t) {
  for (let e = t.length - 1; e > 0; e--) {
    const n = Math.floor(Math.random() * (e + 1));
    [t[e], t[n]] = [t[n], t[e]];
  }
}
R.shuffleArray = Ue;
Object.defineProperty(A, "__esModule", { value: true });
A.validateSocksClientChainOptions = A.validateSocksClientOptions = void 0;
const b = R, w = E, Pe = S;
function Te(t, e = ["connect", "bind", "associate"]) {
  if (!w.SocksCommand[t.command])
    throw new b.SocksClientError(w.ERRORS.InvalidSocksCommand, t);
  if (e.indexOf(t.command) === -1)
    throw new b.SocksClientError(w.ERRORS.InvalidSocksCommandForOperation, t);
  if (!ie(t.destination))
    throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsDestination, t);
  if (!se(t.proxy))
    throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsProxy, t);
  if (re(t.proxy, t), t.timeout && !oe(t.timeout))
    throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsTimeout, t);
  if (t.existing_socket && !(t.existing_socket instanceof Pe.Duplex))
    throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsExistingSocket, t);
}
A.validateSocksClientOptions = Te;
function Le(t) {
  if (t.command !== "connect")
    throw new b.SocksClientError(w.ERRORS.InvalidSocksCommandChain, t);
  if (!ie(t.destination))
    throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsDestination, t);
  if (!(t.proxies && Array.isArray(t.proxies) && t.proxies.length >= 2))
    throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsProxiesLength, t);
  if (t.proxies.forEach((e) => {
    if (!se(e))
      throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsProxy, t);
    re(e, t);
  }), t.timeout && !oe(t.timeout))
    throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsTimeout, t);
}
A.validateSocksClientChainOptions = Le;
function re(t, e) {
  if (t.custom_auth_method !== void 0) {
    if (t.custom_auth_method < w.SOCKS5_CUSTOM_AUTH_START || t.custom_auth_method > w.SOCKS5_CUSTOM_AUTH_END)
      throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsCustomAuthRange, e);
    if (t.custom_auth_request_handler === void 0 || typeof t.custom_auth_request_handler != "function")
      throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsCustomAuthOptions, e);
    if (t.custom_auth_response_size === void 0)
      throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsCustomAuthOptions, e);
    if (t.custom_auth_response_handler === void 0 || typeof t.custom_auth_response_handler != "function")
      throw new b.SocksClientError(w.ERRORS.InvalidSocksClientOptionsCustomAuthOptions, e);
  }
}
function ie(t) {
  return t && typeof t.host == "string" && typeof t.port == "number" && t.port >= 0 && t.port <= 65535;
}
function se(t) {
  return t && (typeof t.host == "string" || typeof t.ipaddress == "string") && typeof t.port == "number" && t.port >= 0 && t.port <= 65535 && (t.type === 4 || t.type === 5);
}
function oe(t) {
  return typeof t == "number" && t > 0;
}
var L = {};
Object.defineProperty(L, "__esModule", { value: true });
L.ReceiveBuffer = void 0;
class xe {
  constructor(e = 4096) {
    this.buffer = sc.allocUnsafe(e), this.offset = 0, this.originalSize = e;
  }
  get length() {
    return this.offset;
  }
  append(e) {
    if (!sc.isBuffer(e))
      throw new Error("Attempted to append a non-buffer instance to ReceiveBuffer.");
    if (this.offset + e.length >= this.buffer.length) {
      const n = this.buffer;
      this.buffer = sc.allocUnsafe(Math.max(this.buffer.length + this.originalSize, this.buffer.length + e.length)), n.copy(this.buffer);
    }
    return e.copy(this.buffer, this.offset), this.offset += e.length;
  }
  peek(e) {
    if (e > this.offset)
      throw new Error("Attempted to read beyond the bounds of the managed internal data.");
    return this.buffer.slice(0, e);
  }
  get(e) {
    if (e > this.offset)
      throw new Error("Attempted to read beyond the bounds of the managed internal data.");
    const n = sc.allocUnsafe(e);
    return this.buffer.slice(0, e).copy(n), this.buffer.copyWithin(0, e, e + this.offset - e), this.offset -= e, n;
  }
}
L.ReceiveBuffer = xe;
(function(t) {
  var e = Ue$1 && Ue$1.__awaiter || function(l, r, o, d) {
    function m(_) {
      return _ instanceof o ? _ : new o(function(k) {
        k(_);
      });
    }
    return new (o || (o = Promise))(function(_, k) {
      function x(y) {
        try {
          N2(d.next(y));
        } catch (H) {
          k(H);
        }
      }
      function V(y) {
        try {
          N2(d.throw(y));
        } catch (H) {
          k(H);
        }
      }
      function N2(y) {
        y.done ? _(y.value) : m(y.value).then(x, V);
      }
      N2((d = d.apply(l, r || [])).next());
    });
  };
  Object.defineProperty(t, "__esModule", { value: true }), t.SocksClientError = t.SocksClient = void 0;
  const n = Ss, a$1 = a, h = Q, S2 = G, i = E, s = A, f = L, u = R;
  Object.defineProperty(t, "SocksClientError", { enumerable: true, get: function() {
    return u.SocksClientError;
  } });
  class c2 extends n.EventEmitter {
    constructor(r) {
      super(), this.options = Object.assign({}, r), (0, s.validateSocksClientOptions)(r), this.setState(i.SocksClientState.Created);
    }
    /**
     * Creates a new SOCKS connection.
     *
     * Note: Supports callbacks and promises. Only supports the connect command.
     * @param options { SocksClientOptions } Options.
     * @param callback { Function } An optional callback function.
     * @returns { Promise }
     */
    static createConnection(r, o) {
      return new Promise((d, m) => {
        try {
          (0, s.validateSocksClientOptions)(r, ["connect"]);
        } catch (k) {
          return typeof o == "function" ? (o(k), d(k)) : m(k);
        }
        const _ = new c2(r);
        _.connect(r.existing_socket), _.once("established", (k) => {
          _.removeAllListeners(), typeof o == "function" && o(null, k), d(k);
        }), _.once("error", (k) => {
          _.removeAllListeners(), typeof o == "function" ? (o(k), d(k)) : m(k);
        });
      });
    }
    /**
     * Creates a new SOCKS connection chain to a destination host through 2 or more SOCKS proxies.
     *
     * Note: Supports callbacks and promises. Only supports the connect method.
     * Note: Implemented via createConnection() factory function.
     * @param options { SocksClientChainOptions } Options
     * @param callback { Function } An optional callback function.
     * @returns { Promise }
     */
    static createConnectionChain(r, o) {
      return new Promise((d, m) => e(this, void 0, void 0, function* () {
        try {
          (0, s.validateSocksClientChainOptions)(r);
        } catch (_) {
          return typeof o == "function" ? (o(_), d(_)) : m(_);
        }
        r.randomizeChain && (0, u.shuffleArray)(r.proxies);
        try {
          let _;
          for (let k = 0; k < r.proxies.length; k++) {
            const x = r.proxies[k], V = k === r.proxies.length - 1 ? r.destination : {
              host: r.proxies[k + 1].host || r.proxies[k + 1].ipaddress,
              port: r.proxies[k + 1].port
            }, N2 = yield c2.createConnection({
              command: "connect",
              proxy: x,
              destination: V,
              existing_socket: _
            });
            _ = _ || N2.socket;
          }
          typeof o == "function" ? (o(null, { socket: _ }), d({ socket: _ })) : d({ socket: _ });
        } catch (_) {
          typeof o == "function" ? (o(_), d(_)) : m(_);
        }
      }));
    }
    /**
     * Creates a SOCKS UDP Frame.
     * @param options
     */
    static createUDPFrame(r) {
      const o = new S2.SmartBuffer();
      return o.writeUInt16BE(0), o.writeUInt8(r.frameNumber || 0), a$1.isIPv4(r.remoteHost.host) ? (o.writeUInt8(i.Socks5HostType.IPv4), o.writeUInt32BE(h.toLong(r.remoteHost.host))) : a$1.isIPv6(r.remoteHost.host) ? (o.writeUInt8(i.Socks5HostType.IPv6), o.writeBuffer(h.toBuffer(r.remoteHost.host))) : (o.writeUInt8(i.Socks5HostType.Hostname), o.writeUInt8(sc.byteLength(r.remoteHost.host)), o.writeString(r.remoteHost.host)), o.writeUInt16BE(r.remoteHost.port), o.writeBuffer(r.data), o.toBuffer();
    }
    /**
     * Parses a SOCKS UDP frame.
     * @param data
     */
    static parseUDPFrame(r) {
      const o = S2.SmartBuffer.fromBuffer(r);
      o.readOffset = 2;
      const d = o.readUInt8(), m = o.readUInt8();
      let _;
      m === i.Socks5HostType.IPv4 ? _ = h.fromLong(o.readUInt32BE()) : m === i.Socks5HostType.IPv6 ? _ = h.toString(o.readBuffer(16)) : _ = o.readString(o.readUInt8());
      const k = o.readUInt16BE();
      return {
        frameNumber: d,
        remoteHost: {
          host: _,
          port: k
        },
        data: o.readBuffer()
      };
    }
    /**
     * Internal state setter. If the SocksClient is in an error state, it cannot be changed to a non error state.
     */
    setState(r) {
      this.state !== i.SocksClientState.Error && (this.state = r);
    }
    /**
     * Starts the connection establishment to the proxy and destination.
     * @param existingSocket Connected socket to use instead of creating a new one (internal use).
     */
    connect(r) {
      this.onDataReceived = (d) => this.onDataReceivedHandler(d), this.onClose = () => this.onCloseHandler(), this.onError = (d) => this.onErrorHandler(d), this.onConnect = () => this.onConnectHandler();
      const o = setTimeout(() => this.onEstablishedTimeout(), this.options.timeout || i.DEFAULT_TIMEOUT);
      o.unref && typeof o.unref == "function" && o.unref(), r ? this.socket = r : this.socket = new a$1.Socket(), this.socket.once("close", this.onClose), this.socket.once("error", this.onError), this.socket.once("connect", this.onConnect), this.socket.on("data", this.onDataReceived), this.setState(i.SocksClientState.Connecting), this.receiveBuffer = new f.ReceiveBuffer(), r ? this.socket.emit("connect") : (this.socket.connect(this.getSocketOptions()), this.options.set_tcp_nodelay !== void 0 && this.options.set_tcp_nodelay !== null && this.socket.setNoDelay(!!this.options.set_tcp_nodelay)), this.prependOnceListener("established", (d) => {
        setImmediate(() => {
          if (this.receiveBuffer.length > 0) {
            const m = this.receiveBuffer.get(this.receiveBuffer.length);
            d.socket.emit("data", m);
          }
          d.socket.resume();
        });
      });
    }
    // Socket options (defaults host/port to options.proxy.host/options.proxy.port)
    getSocketOptions() {
      return Object.assign(Object.assign({}, this.options.socket_options), { host: this.options.proxy.host || this.options.proxy.ipaddress, port: this.options.proxy.port });
    }
    /**
     * Handles internal Socks timeout callback.
     * Note: If the Socks client is not BoundWaitingForConnection or Established, the connection will be closed.
     */
    onEstablishedTimeout() {
      this.state !== i.SocksClientState.Established && this.state !== i.SocksClientState.BoundWaitingForConnection && this.closeSocket(i.ERRORS.ProxyConnectionTimedOut);
    }
    /**
     * Handles Socket connect event.
     */
    onConnectHandler() {
      this.setState(i.SocksClientState.Connected), this.options.proxy.type === 4 ? this.sendSocks4InitialHandshake() : this.sendSocks5InitialHandshake(), this.setState(i.SocksClientState.SentInitialHandshake);
    }
    /**
     * Handles Socket data event.
     * @param data
     */
    onDataReceivedHandler(r) {
      this.receiveBuffer.append(r), this.processData();
    }
    /**
     * Handles processing of the data we have received.
     */
    processData() {
      for (; this.state !== i.SocksClientState.Established && this.state !== i.SocksClientState.Error && this.receiveBuffer.length >= this.nextRequiredPacketBufferSize; )
        if (this.state === i.SocksClientState.SentInitialHandshake)
          this.options.proxy.type === 4 ? this.handleSocks4FinalHandshakeResponse() : this.handleInitialSocks5HandshakeResponse();
        else if (this.state === i.SocksClientState.SentAuthentication)
          this.handleInitialSocks5AuthenticationHandshakeResponse();
        else if (this.state === i.SocksClientState.SentFinalHandshake)
          this.handleSocks5FinalHandshakeResponse();
        else if (this.state === i.SocksClientState.BoundWaitingForConnection)
          this.options.proxy.type === 4 ? this.handleSocks4IncomingConnectionResponse() : this.handleSocks5IncomingConnectionResponse();
        else {
          this.closeSocket(i.ERRORS.InternalError);
          break;
        }
    }
    /**
     * Handles Socket close event.
     * @param had_error
     */
    onCloseHandler() {
      this.closeSocket(i.ERRORS.SocketClosed);
    }
    /**
     * Handles Socket error event.
     * @param err
     */
    onErrorHandler(r) {
      this.closeSocket(r.message);
    }
    /**
     * Removes internal event listeners on the underlying Socket.
     */
    removeInternalSocketHandlers() {
      this.socket.pause(), this.socket.removeListener("data", this.onDataReceived), this.socket.removeListener("close", this.onClose), this.socket.removeListener("error", this.onError), this.socket.removeListener("connect", this.onConnect);
    }
    /**
     * Closes and destroys the underlying Socket. Emits an error event.
     * @param err { String } An error string to include in error event.
     */
    closeSocket(r) {
      this.state !== i.SocksClientState.Error && (this.setState(i.SocksClientState.Error), this.socket.destroy(), this.removeInternalSocketHandlers(), this.emit("error", new u.SocksClientError(r, this.options)));
    }
    /**
     * Sends initial Socks v4 handshake request.
     */
    sendSocks4InitialHandshake() {
      const r = this.options.proxy.userId || "", o = new S2.SmartBuffer();
      o.writeUInt8(4), o.writeUInt8(i.SocksCommand[this.options.command]), o.writeUInt16BE(this.options.destination.port), a$1.isIPv4(this.options.destination.host) ? (o.writeBuffer(h.toBuffer(this.options.destination.host)), o.writeStringNT(r)) : (o.writeUInt8(0), o.writeUInt8(0), o.writeUInt8(0), o.writeUInt8(1), o.writeStringNT(r), o.writeStringNT(this.options.destination.host)), this.nextRequiredPacketBufferSize = i.SOCKS_INCOMING_PACKET_SIZES.Socks4Response, this.socket.write(o.toBuffer());
    }
    /**
     * Handles Socks v4 handshake response.
     * @param data
     */
    handleSocks4FinalHandshakeResponse() {
      const r = this.receiveBuffer.get(8);
      if (r[1] !== i.Socks4Response.Granted)
        this.closeSocket(`${i.ERRORS.Socks4ProxyRejectedConnection} - (${i.Socks4Response[r[1]]})`);
      else if (i.SocksCommand[this.options.command] === i.SocksCommand.bind) {
        const o = S2.SmartBuffer.fromBuffer(r);
        o.readOffset = 2;
        const d = {
          port: o.readUInt16BE(),
          host: h.fromLong(o.readUInt32BE())
        };
        d.host === "0.0.0.0" && (d.host = this.options.proxy.ipaddress), this.setState(i.SocksClientState.BoundWaitingForConnection), this.emit("bound", { remoteHost: d, socket: this.socket });
      } else
        this.setState(i.SocksClientState.Established), this.removeInternalSocketHandlers(), this.emit("established", { socket: this.socket });
    }
    /**
     * Handles Socks v4 incoming connection request (BIND)
     * @param data
     */
    handleSocks4IncomingConnectionResponse() {
      const r = this.receiveBuffer.get(8);
      if (r[1] !== i.Socks4Response.Granted)
        this.closeSocket(`${i.ERRORS.Socks4ProxyRejectedIncomingBoundConnection} - (${i.Socks4Response[r[1]]})`);
      else {
        const o = S2.SmartBuffer.fromBuffer(r);
        o.readOffset = 2;
        const d = {
          port: o.readUInt16BE(),
          host: h.fromLong(o.readUInt32BE())
        };
        this.setState(i.SocksClientState.Established), this.removeInternalSocketHandlers(), this.emit("established", { remoteHost: d, socket: this.socket });
      }
    }
    /**
     * Sends initial Socks v5 handshake request.
     */
    sendSocks5InitialHandshake() {
      const r = new S2.SmartBuffer(), o = [i.Socks5Auth.NoAuth];
      (this.options.proxy.userId || this.options.proxy.password) && o.push(i.Socks5Auth.UserPass), this.options.proxy.custom_auth_method !== void 0 && o.push(this.options.proxy.custom_auth_method), r.writeUInt8(5), r.writeUInt8(o.length);
      for (const d of o)
        r.writeUInt8(d);
      this.nextRequiredPacketBufferSize = i.SOCKS_INCOMING_PACKET_SIZES.Socks5InitialHandshakeResponse, this.socket.write(r.toBuffer()), this.setState(i.SocksClientState.SentInitialHandshake);
    }
    /**
     * Handles initial Socks v5 handshake response.
     * @param data
     */
    handleInitialSocks5HandshakeResponse() {
      const r = this.receiveBuffer.get(2);
      r[0] !== 5 ? this.closeSocket(i.ERRORS.InvalidSocks5IntiailHandshakeSocksVersion) : r[1] === i.SOCKS5_NO_ACCEPTABLE_AUTH ? this.closeSocket(i.ERRORS.InvalidSocks5InitialHandshakeNoAcceptedAuthType) : r[1] === i.Socks5Auth.NoAuth ? (this.socks5ChosenAuthType = i.Socks5Auth.NoAuth, this.sendSocks5CommandRequest()) : r[1] === i.Socks5Auth.UserPass ? (this.socks5ChosenAuthType = i.Socks5Auth.UserPass, this.sendSocks5UserPassAuthentication()) : r[1] === this.options.proxy.custom_auth_method ? (this.socks5ChosenAuthType = this.options.proxy.custom_auth_method, this.sendSocks5CustomAuthentication()) : this.closeSocket(i.ERRORS.InvalidSocks5InitialHandshakeUnknownAuthType);
    }
    /**
     * Sends Socks v5 user & password auth handshake.
     *
     * Note: No auth and user/pass are currently supported.
     */
    sendSocks5UserPassAuthentication() {
      const r = this.options.proxy.userId || "", o = this.options.proxy.password || "", d = new S2.SmartBuffer();
      d.writeUInt8(1), d.writeUInt8(sc.byteLength(r)), d.writeString(r), d.writeUInt8(sc.byteLength(o)), d.writeString(o), this.nextRequiredPacketBufferSize = i.SOCKS_INCOMING_PACKET_SIZES.Socks5UserPassAuthenticationResponse, this.socket.write(d.toBuffer()), this.setState(i.SocksClientState.SentAuthentication);
    }
    sendSocks5CustomAuthentication() {
      return e(this, void 0, void 0, function* () {
        this.nextRequiredPacketBufferSize = this.options.proxy.custom_auth_response_size, this.socket.write(yield this.options.proxy.custom_auth_request_handler()), this.setState(i.SocksClientState.SentAuthentication);
      });
    }
    handleSocks5CustomAuthHandshakeResponse(r) {
      return e(this, void 0, void 0, function* () {
        return yield this.options.proxy.custom_auth_response_handler(r);
      });
    }
    handleSocks5AuthenticationNoAuthHandshakeResponse(r) {
      return e(this, void 0, void 0, function* () {
        return r[1] === 0;
      });
    }
    handleSocks5AuthenticationUserPassHandshakeResponse(r) {
      return e(this, void 0, void 0, function* () {
        return r[1] === 0;
      });
    }
    /**
     * Handles Socks v5 auth handshake response.
     * @param data
     */
    handleInitialSocks5AuthenticationHandshakeResponse() {
      return e(this, void 0, void 0, function* () {
        this.setState(i.SocksClientState.ReceivedAuthenticationResponse);
        let r = false;
        this.socks5ChosenAuthType === i.Socks5Auth.NoAuth ? r = yield this.handleSocks5AuthenticationNoAuthHandshakeResponse(this.receiveBuffer.get(2)) : this.socks5ChosenAuthType === i.Socks5Auth.UserPass ? r = yield this.handleSocks5AuthenticationUserPassHandshakeResponse(this.receiveBuffer.get(2)) : this.socks5ChosenAuthType === this.options.proxy.custom_auth_method && (r = yield this.handleSocks5CustomAuthHandshakeResponse(this.receiveBuffer.get(this.options.proxy.custom_auth_response_size))), r ? this.sendSocks5CommandRequest() : this.closeSocket(i.ERRORS.Socks5AuthenticationFailed);
      });
    }
    /**
     * Sends Socks v5 final handshake request.
     */
    sendSocks5CommandRequest() {
      const r = new S2.SmartBuffer();
      r.writeUInt8(5), r.writeUInt8(i.SocksCommand[this.options.command]), r.writeUInt8(0), a$1.isIPv4(this.options.destination.host) ? (r.writeUInt8(i.Socks5HostType.IPv4), r.writeBuffer(h.toBuffer(this.options.destination.host))) : a$1.isIPv6(this.options.destination.host) ? (r.writeUInt8(i.Socks5HostType.IPv6), r.writeBuffer(h.toBuffer(this.options.destination.host))) : (r.writeUInt8(i.Socks5HostType.Hostname), r.writeUInt8(this.options.destination.host.length), r.writeString(this.options.destination.host)), r.writeUInt16BE(this.options.destination.port), this.nextRequiredPacketBufferSize = i.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseHeader, this.socket.write(r.toBuffer()), this.setState(i.SocksClientState.SentFinalHandshake);
    }
    /**
     * Handles Socks v5 final handshake response.
     * @param data
     */
    handleSocks5FinalHandshakeResponse() {
      const r = this.receiveBuffer.peek(5);
      if (r[0] !== 5 || r[1] !== i.Socks5Response.Granted)
        this.closeSocket(`${i.ERRORS.InvalidSocks5FinalHandshakeRejected} - ${i.Socks5Response[r[1]]}`);
      else {
        const o = r[3];
        let d, m;
        if (o === i.Socks5HostType.IPv4) {
          const _ = i.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseIPv4;
          if (this.receiveBuffer.length < _) {
            this.nextRequiredPacketBufferSize = _;
            return;
          }
          m = S2.SmartBuffer.fromBuffer(this.receiveBuffer.get(_).slice(4)), d = {
            host: h.fromLong(m.readUInt32BE()),
            port: m.readUInt16BE()
          }, d.host === "0.0.0.0" && (d.host = this.options.proxy.ipaddress);
        } else if (o === i.Socks5HostType.Hostname) {
          const _ = r[4], k = i.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseHostname(_);
          if (this.receiveBuffer.length < k) {
            this.nextRequiredPacketBufferSize = k;
            return;
          }
          m = S2.SmartBuffer.fromBuffer(this.receiveBuffer.get(k).slice(5)), d = {
            host: m.readString(_),
            port: m.readUInt16BE()
          };
        } else if (o === i.Socks5HostType.IPv6) {
          const _ = i.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseIPv6;
          if (this.receiveBuffer.length < _) {
            this.nextRequiredPacketBufferSize = _;
            return;
          }
          m = S2.SmartBuffer.fromBuffer(this.receiveBuffer.get(_).slice(4)), d = {
            host: h.toString(m.readBuffer(16)),
            port: m.readUInt16BE()
          };
        }
        this.setState(i.SocksClientState.ReceivedFinalResponse), i.SocksCommand[this.options.command] === i.SocksCommand.connect ? (this.setState(i.SocksClientState.Established), this.removeInternalSocketHandlers(), this.emit("established", { remoteHost: d, socket: this.socket })) : i.SocksCommand[this.options.command] === i.SocksCommand.bind ? (this.setState(i.SocksClientState.BoundWaitingForConnection), this.nextRequiredPacketBufferSize = i.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseHeader, this.emit("bound", { remoteHost: d, socket: this.socket })) : i.SocksCommand[this.options.command] === i.SocksCommand.associate && (this.setState(i.SocksClientState.Established), this.removeInternalSocketHandlers(), this.emit("established", {
          remoteHost: d,
          socket: this.socket
        }));
      }
    }
    /**
     * Handles Socks v5 incoming connection request (BIND).
     */
    handleSocks5IncomingConnectionResponse() {
      const r = this.receiveBuffer.peek(5);
      if (r[0] !== 5 || r[1] !== i.Socks5Response.Granted)
        this.closeSocket(`${i.ERRORS.Socks5ProxyRejectedIncomingBoundConnection} - ${i.Socks5Response[r[1]]}`);
      else {
        const o = r[3];
        let d, m;
        if (o === i.Socks5HostType.IPv4) {
          const _ = i.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseIPv4;
          if (this.receiveBuffer.length < _) {
            this.nextRequiredPacketBufferSize = _;
            return;
          }
          m = S2.SmartBuffer.fromBuffer(this.receiveBuffer.get(_).slice(4)), d = {
            host: h.fromLong(m.readUInt32BE()),
            port: m.readUInt16BE()
          }, d.host === "0.0.0.0" && (d.host = this.options.proxy.ipaddress);
        } else if (o === i.Socks5HostType.Hostname) {
          const _ = r[4], k = i.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseHostname(_);
          if (this.receiveBuffer.length < k) {
            this.nextRequiredPacketBufferSize = k;
            return;
          }
          m = S2.SmartBuffer.fromBuffer(this.receiveBuffer.get(k).slice(5)), d = {
            host: m.readString(_),
            port: m.readUInt16BE()
          };
        } else if (o === i.Socks5HostType.IPv6) {
          const _ = i.SOCKS_INCOMING_PACKET_SIZES.Socks5ResponseIPv6;
          if (this.receiveBuffer.length < _) {
            this.nextRequiredPacketBufferSize = _;
            return;
          }
          m = S2.SmartBuffer.fromBuffer(this.receiveBuffer.get(_).slice(4)), d = {
            host: h.toString(m.readBuffer(16)),
            port: m.readUInt16BE()
          };
        }
        this.setState(i.SocksClientState.Established), this.removeInternalSocketHandlers(), this.emit("established", { remoteHost: d, socket: this.socket });
      }
    }
    get socksClientOptions() {
      return Object.assign({}, this.options);
    }
  }
  t.SocksClient = c2;
})(X);
(function(t) {
  var e = Ue$1 && Ue$1.__createBinding || (Object.create ? function(a2, h, S2, i) {
    i === void 0 && (i = S2);
    var s = Object.getOwnPropertyDescriptor(h, S2);
    (!s || ("get" in s ? !h.__esModule : s.writable || s.configurable)) && (s = { enumerable: true, get: function() {
      return h[S2];
    } }), Object.defineProperty(a2, i, s);
  } : function(a2, h, S2, i) {
    i === void 0 && (i = S2), a2[i] = h[S2];
  }), n = Ue$1 && Ue$1.__exportStar || function(a2, h) {
    for (var S2 in a2)
      S2 !== "default" && !Object.prototype.hasOwnProperty.call(h, S2) && e(h, a2, S2);
  };
  Object.defineProperty(t, "__esModule", { value: true }), n(X, t);
})(Y);
var ae = {}, v = {}, Ve = Ue$1 && Ue$1.__createBinding || (Object.create ? function(t, e, n, a2) {
  a2 === void 0 && (a2 = n);
  var h = Object.getOwnPropertyDescriptor(e, n);
  (!h || ("get" in h ? !e.__esModule : h.writable || h.configurable)) && (h = { enumerable: true, get: function() {
    return e[n];
  } }), Object.defineProperty(t, a2, h);
} : function(t, e, n, a2) {
  a2 === void 0 && (a2 = n), t[a2] = e[n];
}), He = Ue$1 && Ue$1.__setModuleDefault || (Object.create ? function(t, e) {
  Object.defineProperty(t, "default", { enumerable: true, value: e });
} : function(t, e) {
  t.default = e;
}), ce = Ue$1 && Ue$1.__importStar || function(t) {
  if (t && t.__esModule)
    return t;
  var e = {};
  if (t != null)
    for (var n in t)
      n !== "default" && Object.prototype.hasOwnProperty.call(t, n) && Ve(e, t, n);
  return He(e, t), e;
};
Object.defineProperty(v, "__esModule", { value: true });
v.req = v.json = v.toBuffer = void 0;
const Fe = ce(Ie$1), De = ce(c);
async function ue(t) {
  let e = 0;
  const n = [];
  for await (const a2 of t)
    e += a2.length, n.push(a2);
  return sc.concat(n, e);
}
v.toBuffer = ue;
async function Me(t) {
  const n = (await ue(t)).toString("utf8");
  try {
    return JSON.parse(n);
  } catch (a2) {
    const h = a2;
    throw h.message += ` (input: ${n})`, h;
  }
}
v.json = Me;
function je(t, e = {}) {
  const a2 = ((typeof t == "string" ? t : t.href).startsWith("https:") ? De : Fe).request(t, e), h = new Promise((S2, i) => {
    a2.once("response", S2).once("error", i).end();
  });
  return a2.then = h.then.bind(h), a2;
}
v.req = je;
(function(t) {
  var e = Ue$1 && Ue$1.__createBinding || (Object.create ? function(f, u, c2, l) {
    l === void 0 && (l = c2);
    var r = Object.getOwnPropertyDescriptor(u, c2);
    (!r || ("get" in r ? !u.__esModule : r.writable || r.configurable)) && (r = { enumerable: true, get: function() {
      return u[c2];
    } }), Object.defineProperty(f, l, r);
  } : function(f, u, c2, l) {
    l === void 0 && (l = c2), f[l] = u[c2];
  }), n = Ue$1 && Ue$1.__setModuleDefault || (Object.create ? function(f, u) {
    Object.defineProperty(f, "default", { enumerable: true, value: u });
  } : function(f, u) {
    f.default = u;
  }), a2 = Ue$1 && Ue$1.__importStar || function(f) {
    if (f && f.__esModule)
      return f;
    var u = {};
    if (f != null)
      for (var c2 in f)
        c2 !== "default" && Object.prototype.hasOwnProperty.call(f, c2) && e(u, f, c2);
    return n(u, f), u;
  }, h = Ue$1 && Ue$1.__exportStar || function(f, u) {
    for (var c2 in f)
      c2 !== "default" && !Object.prototype.hasOwnProperty.call(u, c2) && e(u, f, c2);
  };
  Object.defineProperty(t, "__esModule", { value: true }), t.Agent = void 0;
  const S2 = a2(Ie$1);
  h(v, t);
  const i = /* @__PURE__ */ Symbol("AgentBaseInternalState");
  class s extends S2.Agent {
    constructor(u) {
      super(u), this[i] = {};
    }
    /**
     * Determine whether this is an `http` or `https` request.
     */
    isSecureEndpoint(u) {
      if (u) {
        if (typeof u.secureEndpoint == "boolean")
          return u.secureEndpoint;
        if (typeof u.protocol == "string")
          return u.protocol === "https:";
      }
      const { stack: c2 } = new Error();
      return typeof c2 != "string" ? false : c2.split(`
`).some((l) => l.indexOf("(https.js:") !== -1 || l.indexOf("node:https:") !== -1);
    }
    createSocket(u, c2, l) {
      const r = {
        ...c2,
        secureEndpoint: this.isSecureEndpoint(c2)
      };
      Promise.resolve().then(() => this.connect(u, r)).then((o) => {
        if (o instanceof S2.Agent)
          return o.addRequest(u, r);
        this[i].currentSocket = o, super.createSocket(u, c2, l);
      }, l);
    }
    createConnection() {
      const u = this[i].currentSocket;
      if (this[i].currentSocket = void 0, !u)
        throw new Error("No socket was returned in the `connect()` function");
      return u;
    }
    get defaultPort() {
      return this[i].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
    }
    set defaultPort(u) {
      this[i] && (this[i].defaultPort = u);
    }
    get protocol() {
      return this[i].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
    }
    set protocol(u) {
      this[i] && (this[i].protocol = u);
    }
  }
  t.Agent = s;
})(ae);
var Ke = Ue$1 && Ue$1.__createBinding || (Object.create ? function(t, e, n, a2) {
  a2 === void 0 && (a2 = n);
  var h = Object.getOwnPropertyDescriptor(e, n);
  (!h || ("get" in h ? !e.__esModule : h.writable || h.configurable)) && (h = { enumerable: true, get: function() {
    return e[n];
  } }), Object.defineProperty(t, a2, h);
} : function(t, e, n, a2) {
  a2 === void 0 && (a2 = n), t[a2] = e[n];
}), $e = Ue$1 && Ue$1.__setModuleDefault || (Object.create ? function(t, e) {
  Object.defineProperty(t, "default", { enumerable: true, value: e });
} : function(t, e) {
  t.default = e;
}), z = Ue$1 && Ue$1.__importStar || function(t) {
  if (t && t.__esModule)
    return t;
  var e = {};
  if (t != null)
    for (var n in t)
      n !== "default" && Object.prototype.hasOwnProperty.call(t, n) && Ke(e, t, n);
  return $e(e, t), e;
}, Ge = Ue$1 && Ue$1.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
Object.defineProperty(U, "__esModule", { value: true });
var fe = U.SocksProxyAgent = void 0;
const qe = Y, ze = ae, Ze = Ge(N), We = z(a), Je = z(a), Ye = z(a), Xe = rt, P = (0, Ze.default)("socks-proxy-agent");
function Qe(t) {
  let e = false, n = 5;
  const a2 = t.hostname, h = parseInt(t.port, 10) || 1080;
  switch (t.protocol.replace(":", "")) {
    case "socks4":
      e = true, n = 4;
      break;
    case "socks4a":
      n = 4;
      break;
    case "socks5":
      e = true, n = 5;
      break;
    case "socks":
      n = 5;
      break;
    case "socks5h":
      n = 5;
      break;
    default:
      throw new TypeError(`A "socks" protocol must be specified! Got: ${String(t.protocol)}`);
  }
  const S2 = {
    host: a2,
    port: h,
    type: n
  };
  return t.username && Object.defineProperty(S2, "userId", {
    value: decodeURIComponent(t.username),
    enumerable: false
  }), t.password != null && Object.defineProperty(S2, "password", {
    value: decodeURIComponent(t.password),
    enumerable: false
  }), { lookup: e, proxy: S2 };
}
class he extends ze.Agent {
  constructor(e, n) {
    super(n);
    const a2 = typeof e == "string" ? new Xe.URL(e) : e, { proxy: h, lookup: S2 } = Qe(a2);
    this.shouldLookup = S2, this.proxy = h, this.timeout = (n == null ? void 0 : n.timeout) ?? null;
  }
  /**
   * Initiates a SOCKS connection to the specified SOCKS proxy server,
   * which in turn connects to the specified remote host and port.
   */
  async connect(e, n) {
    const { shouldLookup: a2, proxy: h, timeout: S2 } = this;
    if (!n.host)
      throw new Error("No `host` defined!");
    let { host: i } = n;
    const { port: s, lookup: f = We.lookup } = n;
    a2 && (i = await new Promise((r, o) => {
      f(i, {}, (d, m) => {
        d ? o(d) : r(m);
      });
    }));
    const u = {
      proxy: h,
      destination: {
        host: i,
        port: typeof s == "number" ? s : parseInt(s, 10)
      },
      command: "connect",
      timeout: S2 ?? void 0
    }, c2 = (r) => {
      e.destroy(), l.destroy(), r && r.destroy();
    };
    P("Creating socks proxy connection: %o", u);
    const { socket: l } = await qe.SocksClient.createConnection(u);
    if (P("Successfully created socks proxy connection"), S2 !== null && (l.setTimeout(S2), l.on("timeout", () => c2())), n.secureEndpoint) {
      P("Upgrading socket connection to TLS");
      const r = n.servername || n.host, o = Ye.connect({
        ...et(n, "host", "path", "port"),
        socket: l,
        servername: Je.isIP(r) ? void 0 : r
      });
      return o.once("error", (d) => {
        P("Socket TLS error", d.message), c2(o);
      }), o;
    }
    return l;
  }
}
he.protocols = [
  "socks",
  "socks4",
  "socks4a",
  "socks5",
  "socks5h"
];
fe = U.SocksProxyAgent = he;
function et(t, ...e) {
  const n = {};
  let a2;
  for (a2 in t)
    e.includes(a2) || (n[a2] = t[a2]);
  return n;
}
const ct = /* @__PURE__ */ Ie({
  __proto__: null,
  get SocksProxyAgent() {
    return fe;
  },
  default: U
}, [U]);
export {
  ct as i
};
