import { u8aToU8a } from '../u8a/toU8a.js';
import { isString } from './string.js';
/**
 * @name isUtf8
 * @summary Tests if the input is valid Utf8
 * @description
 * Checks to see if the input string or Uint8Array is valid Utf8
 */
export function isUtf8(value) {
  if (!value) {
    return isString(value);
  }
  const u8a = u8aToU8a(value);
  const len = u8a.length;
  let i = 0;
  while (i < len) {
    if (u8a[i] <= 0x7f) {
      /* 00..7F */ i += 1;
    } else if (u8a[i] >= 0xc2 && u8a[i] <= 0xdf) {
      /* C2..DF 80..BF */ if (i + 1 < len) {
        /* Expect a 2nd byte */ if (u8a[i + 1] < 0x80 || u8a[i + 1] > 0xbf) {
          // *message = "After a first byte between C2 and DF, expecting a 2nd byte between 80 and BF";
          // *faulty_bytes = 2;
          return false;
        }
      } else {
        // *message = "After a first byte between C2 and DF, expecting a 2nd byte.";
        // *faulty_bytes = 1;
        return false;
      }
      i += 2;
    } else if (u8a[i] === 0xe0) {
      /* E0 A0..BF 80..BF */ if (i + 2 < len) {
        /* Expect a 2nd and 3rd byte */ if (u8a[i + 1] < 0xa0 || u8a[i + 1] > 0xbf) {
          // *message = "After a first byte of E0, expecting a 2nd byte between A0 and BF.";
          // *faulty_bytes = 2;
          return false;
        }
        if (u8a[i + 2] < 0x80 || u8a[i + 2] > 0xbf) {
          // *message = "After a first byte of E0, expecting a 3nd byte between 80 and BF.";
          // *faulty_bytes = 3;
          return false;
        }
      } else {
        // *message = "After a first byte of E0, expecting two following bytes.";
        // *faulty_bytes = 1;
        return false;
      }
      i += 3;
    } else if (u8a[i] >= 0xe1 && u8a[i] <= 0xec) {
      /* E1..EC 80..BF 80..BF */ if (i + 2 < len) {
        /* Expect a 2nd and 3rd byte */ if (u8a[i + 1] < 0x80 || u8a[i + 1] > 0xbf) {
          // *message = "After a first byte between E1 and EC, expecting the 2nd byte between 80 and BF.";
          // *faulty_bytes = 2;
          return false;
        }
        if (u8a[i + 2] < 0x80 || u8a[i + 2] > 0xbf) {
          // *message = "After a first byte between E1 and EC, expecting the 3rd byte between 80 and BF.";
          // *faulty_bytes = 3;
          return false;
        }
      } else {
        // *message = "After a first byte between E1 and EC, expecting two following bytes.";
        // *faulty_bytes = 1;
        return false;
      }
      i += 3;
    } else if (u8a[i] === 0xed) {
      /* ED 80..9F 80..BF */ if (i + 2 < len) {
        /* Expect a 2nd and 3rd byte */ if (u8a[i + 1] < 0x80 || u8a[i + 1] > 0x9f) {
          // *message = "After a first byte of ED, expecting 2nd byte between 80 and 9F.";
          // *faulty_bytes = 2;
          return false;
        }
        if (u8a[i + 2] < 0x80 || u8a[i + 2] > 0xbf) {
          // *message = "After a first byte of ED, expecting 3rd byte between 80 and BF.";
          // *faulty_bytes = 3;
          return false;
        }
      } else {
        // *message = "After a first byte of ED, expecting two following bytes.";
        // *faulty_bytes = 1;
        return false;
      }
      i += 3;
    } else if (u8a[i] >= 0xee && u8a[i] <= 0xef) {
      /* EE..EF 80..BF 80..BF */ if (i + 2 < len) {
        /* Expect a 2nd and 3rd byte */ if (u8a[i + 1] < 0x80 || u8a[i + 1] > 0xbf) {
          // *message = "After a first byte between EE and EF, expecting 2nd byte between 80 and BF.";
          // *faulty_bytes = 2;
          return false;
        }
        if (u8a[i + 2] < 0x80 || u8a[i + 2] > 0xbf) {
          // *message = "After a first byte between EE and EF, expecting 3rd byte between 80 and BF.";
          // *faulty_bytes = 3;
          return false;
        }
      } else {
        // *message = "After a first byte between EE and EF, two following bytes.";
        // *faulty_bytes = 1;
        return false;
      }
      i += 3;
    } else if (u8a[i] === 0xf0) {
      /* F0 90..BF 80..BF 80..BF */ if (i + 3 < len) {
        /* Expect a 2nd, 3rd 3th byte */ if (u8a[i + 1] < 0x90 || u8a[i + 1] > 0xbf) {
          // *message = "After a first byte of F0, expecting 2nd byte between 90 and BF.";
          // *faulty_bytes = 2;
          return false;
        }
        if (u8a[i + 2] < 0x80 || u8a[i + 2] > 0xbf) {
          // *message = "After a first byte of F0, expecting 3rd byte between 80 and BF.";
          // *faulty_bytes = 3;
          return false;
        }
        if (u8a[i + 3] < 0x80 || u8a[i + 3] > 0xbf) {
          // *message = "After a first byte of F0, expecting 4th byte between 80 and BF.";
          // *faulty_bytes = 4;
          return false;
        }
      } else {
        // *message = "After a first byte of F0, expecting three following bytes.";
        // *faulty_bytes = 1;
        return false;
      }
      i += 4;
    } else if (u8a[i] >= 0xf1 && u8a[i] <= 0xf3) {
      /* F1..F3 80..BF 80..BF 80..BF */ if (i + 3 < len) {
        /* Expect a 2nd, 3rd 3th byte */ if (u8a[i + 1] < 0x80 || u8a[i + 1] > 0xbf) {
          // *message = "After a first byte of F1, F2, or F3, expecting a 2nd byte between 80 and BF.";
          // *faulty_bytes = 2;
          return false;
        }
        if (u8a[i + 2] < 0x80 || u8a[i + 2] > 0xbf) {
          // *message = "After a first byte of F1, F2, or F3, expecting a 3rd byte between 80 and BF.";
          // *faulty_bytes = 3;
          return false;
        }
        if (u8a[i + 3] < 0x80 || u8a[i + 3] > 0xbf) {
          // *message = "After a first byte of F1, F2, or F3, expecting a 4th byte between 80 and BF.";
          // *faulty_bytes = 4;
          return false;
        }
      } else {
        // *message = "After a first byte of F1, F2, or F3, expecting three following bytes.";
        // *faulty_bytes = 1;
        return false;
      }
      i += 4;
    } else if (u8a[i] === 0xf4) {
      /* F4 80..8F 80..BF 80..BF */ if (i + 3 < len) {
        /* Expect a 2nd, 3rd 3th byte */ if (u8a[i + 1] < 0x80 || u8a[i + 1] > 0x8f) {
          // *message = "After a first byte of F4, expecting 2nd byte between 80 and 8F.";
          // *faulty_bytes = 2;
          return false;
        }
        if (u8a[i + 2] < 0x80 || u8a[i + 2] > 0xbf) {
          // *message = "After a first byte of F4, expecting 3rd byte between 80 and BF.";
          // *faulty_bytes = 3;
          return false;
        }
        if (u8a[i + 3] < 0x80 || u8a[i + 3] > 0xbf) {
          // *message = "After a first byte of F4, expecting 4th byte between 80 and BF.";
          // *faulty_bytes = 4;
          return false;
        }
      } else {
        // *message = "After a first byte of F4, expecting three following bytes.";
        // *faulty_bytes = 1;
        return false;
      }
      i += 4;
    } else {
      // *message = "Expecting bytes in the following ranges: 00..7F C2..F4.";
      // *faulty_bytes = 1;
      return false;
    }
  }
  return true;
}
