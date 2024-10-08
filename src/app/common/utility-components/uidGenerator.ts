// This is a typescript version of
// https://www.npmjs.com/package/uid-generator
// Uglify was breaking due to ES6 code, so rather than adding a(nother?) tranpiler it is recoded here as typescript
const randomBytes = require('randombytes');

export class UIDGenerator {
  static BASE16 = '0123456789abcdef';
  static BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  static BASE36L = '0123456789abcdefghijklmnopqrstuvwxyz';
  static BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  static BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  static BASE66 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._~';
  static BASE71 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!'()*-._~";
  _byteSize: number;

  uidLength: number;
  bitSize: number;
  baseEncoding: any;
  base: number;

  constructor(bitSize, baseEncoding, uidLength = null) {
    if (typeof bitSize === 'string') {
      uidLength = baseEncoding;
      baseEncoding = bitSize;
      bitSize = null;
    } else if (typeof baseEncoding === 'number') {
      uidLength = baseEncoding;
      baseEncoding = null;
    }

    baseEncoding = baseEncoding || UIDGenerator.BASE58;

    if (typeof baseEncoding !== 'string') {
      throw new TypeError('baseEncoding must be a string');
    }

    if (uidLength == null) {
      if (bitSize == null) {
        bitSize = 128;
      } else if (!Number.isInteger(bitSize) || bitSize <= 0 || bitSize % 8 !== 0) {
        throw new TypeError('bitSize must be a positive integer that is a multiple of 8');
      }

      uidLength = Math.ceil(bitSize / Math.log2(baseEncoding.length));
      this._byteSize = bitSize / 8;
    } else {
      if (bitSize != null) {
        throw new TypeError('uidLength may not be specified when bitSize is also specified');
      }
      if (!Number.isInteger(uidLength) || uidLength <= 0) {
        throw new TypeError('uidLength must be a positive integer');
      }

      bitSize = Math.ceil(uidLength * Math.log2(baseEncoding.length));
      this._byteSize = Math.ceil(bitSize / 8);
    }

    this.uidLength = uidLength;
    this.bitSize = bitSize;
    this.baseEncoding = baseEncoding;
    this.base = baseEncoding.length;
  }

  generate(cb) {
    if (!cb) {
      return new Promise((resolve, reject) => {
        randomBytes(this._byteSize, (err, buffer) => {
          if (err) {
            reject(err);
          } else {
            resolve(this._bufferToString(buffer));
          }
        });
      });
    }

    randomBytes(this._byteSize, (err, buffer) => {
      if (err) {
        cb(err);
      } else {
        cb(null, this._bufferToString(buffer));
      }
    });
  }

  generateSync() {
    return this._bufferToString(randomBytes(this._byteSize));
  }

  // Encoding algorithm based on the encode function in Daniel Cousens' base-x package
  // https://github.com/cryptocoinjs/base-x/blob/master/index.js
  _bufferToString(buffer) {
    const digits = [0];
    var i;
    var j;
    var carry;

    for (i = 0; i < buffer.length; ++i) {
      carry = buffer[i];

      for (j = 0; j < digits.length; ++j) {
        carry += digits[j] << 8;
        digits[j] = carry % this.base;
        carry = (carry / this.base) | 0;
      }

      while (carry > 0) {
        digits.push(carry % this.base);
        carry = (carry / this.base) | 0;
      }
    }

    // Convert digits to a string
    var str = '';

    if (digits.length > this.uidLength) {
      i = this.uidLength;
    } else {
      i = digits.length;
      if (digits.length < this.uidLength) { // Handle leading zeros
        str += this.baseEncoding[0].repeat(this.uidLength - digits.length);
      }
    }

    while (i--) {
      str += this.baseEncoding[digits[i]];
    }

    return str;
  }
}


