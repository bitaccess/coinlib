var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
var ALPHABET_MAP = {};
for (var i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
}
var BASE = 58;
export function encode58(buffer) {
    if (buffer.length === 0) {
        return '';
    }
    var i;
    var j;
    var digits = [0];
    for (i = 0; i < buffer.length; i++) {
        for (j = 0; j < digits.length; j++) {
            digits[j] <<= 8;
        }
        digits[0] += buffer[i];
        var carry = 0;
        for (j = 0; j < digits.length; ++j) {
            digits[j] += carry;
            carry = (digits[j] / BASE) | 0;
            digits[j] %= BASE;
        }
        while (carry) {
            digits.push(carry % BASE);
            carry = (carry / BASE) | 0;
        }
    }
    for (i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
        digits.push(0);
    }
    return digits
        .reverse()
        .map(function (digit) { return ALPHABET[digit]; })
        .join('');
}
export function decode58(s) {
    if (s.length === 0) {
        return [];
    }
    var i;
    var j;
    var bytes = [0];
    for (i = 0; i < s.length; i++) {
        var c = s[i];
        if (!(c in ALPHABET_MAP)) {
            throw new Error('Non-base58 character');
        }
        for (j = 0; j < bytes.length; j++) {
            bytes[j] *= BASE;
        }
        bytes[0] += ALPHABET_MAP[c];
        var carry = 0;
        for (j = 0; j < bytes.length; ++j) {
            bytes[j] += carry;
            carry = bytes[j] >> 8;
            bytes[j] &= 0xff;
        }
        while (carry) {
            bytes.push(carry & 0xff);
            carry >>= 8;
        }
    }
    for (i = 0; s[i] === '1' && i < s.length - 1; i++) {
        bytes.push(0);
    }
    return bytes.reverse();
}
//# sourceMappingURL=base58.js.map