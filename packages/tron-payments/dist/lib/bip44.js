import { HDPrivateKey, HDPublicKey } from 'bitcore-lib';
import { keccak256 } from 'js-sha3';
import jsSHA from 'jssha';
import { ec as EC } from 'elliptic';
import { encode58 } from './base58';
var ec = new EC('secp256k1');
export var derivationPath = "m/44'/195'/0";
var derivationPathParts = derivationPath.split('/').slice(1);
export function deriveAddress(xpub, index) {
    var key = new HDPublicKey(xpub);
    var derived = deriveBasePath(key).derive(index);
    return hdPublicKeyToAddress(derived);
}
export function derivePrivateKey(xprv, index) {
    var key = new HDPrivateKey(xprv);
    var derived = deriveBasePath(key).derive(index);
    return hdPrivateKeyToPrivateKey(derived);
}
export function xprvToXpub(xprv) {
    var key = xprv instanceof HDPrivateKey ? xprv : new HDPrivateKey(xprv);
    var derivedPubKey = deriveBasePath(key).hdPublicKey;
    return derivedPubKey.toString();
}
function deriveBasePath(key) {
    var parts = derivationPathParts.slice(key.depth);
    if (parts.length > 0) {
        return key.derive("m/" + parts.join('/'));
    }
    return key;
}
function hdPublicKeyToAddress(key) {
    return addressBytesToB58CheckAddress(pubBytesToTronBytes(bip32PublicToTronPublic(key.publicKey.toBuffer())));
}
function hdPrivateKeyToPrivateKey(key) {
    return bip32PrivateToTronPrivate(key.privateKey.toBuffer());
}
function bip32PublicToTronPublic(pubKey) {
    var pubkey = ec.keyFromPublic(pubKey).getPublic();
    var x = pubkey.x;
    var y = pubkey.y;
    var xHex = x.toString('hex');
    while (xHex.length < 64) {
        xHex = "0" + xHex;
    }
    var yHex = y.toString('hex');
    while (yHex.length < 64) {
        yHex = "0" + yHex;
    }
    var pubkeyHex = "04" + xHex + yHex;
    var pubkeyBytes = hexStr2byteArray(pubkeyHex);
    return pubkeyBytes;
}
function bip32PrivateToTronPrivate(priKeyBytes) {
    var key = ec.keyFromPrivate(priKeyBytes, 'bytes');
    var privkey = key.getPrivate();
    var priKeyHex = privkey.toString('hex');
    while (priKeyHex.length < 64) {
        priKeyHex = "0" + priKeyHex;
    }
    var privArray = hexStr2byteArray(priKeyHex);
    return byteArray2hexStr(privArray);
}
var ADDRESS_PREFIX = '41';
function byte2hexStr(byte) {
    var hexByteMap = '0123456789ABCDEF';
    var str = '';
    str += hexByteMap.charAt(byte >> 4);
    str += hexByteMap.charAt(byte & 0x0f);
    return str;
}
function hexStr2byteArray(str) {
    var byteArray = Array();
    var d = 0;
    var j = 0;
    var k = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i);
        if (isHexChar(c)) {
            d <<= 4;
            d += hexChar2byte(c);
            j++;
            if (0 === j % 2) {
                byteArray[k++] = d;
                d = 0;
            }
        }
    }
    return byteArray;
}
function isHexChar(c) {
    return (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f') || (c >= '0' && c <= '9');
}
function hexChar2byte(c) {
    var d = 0;
    if (c >= 'A' && c <= 'F') {
        d = c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    }
    else if (c >= 'a' && c <= 'f') {
        d = c.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
    }
    else if (c >= '0' && c <= '9') {
        d = c.charCodeAt(0) - '0'.charCodeAt(0);
    }
    return d;
}
function byteArray2hexStr(byteArray) {
    var str = '';
    for (var i = 0; i < byteArray.length; i++) {
        str += byte2hexStr(byteArray[i]);
    }
    return str;
}
function pubBytesToTronBytes(pubBytes) {
    if (pubBytes.length === 65) {
        pubBytes = pubBytes.slice(1);
    }
    var hash = keccak256(pubBytes).toString();
    var addressHex = ADDRESS_PREFIX + hash.substring(24);
    return hexStr2byteArray(addressHex);
}
function addressBytesToB58CheckAddress(addressBytes) {
    var hash0 = SHA256(addressBytes);
    var hash1 = SHA256(hash0);
    var checkSum = hash1.slice(0, 4);
    checkSum = addressBytes.concat(checkSum);
    return encode58(checkSum);
}
function SHA256(msgBytes) {
    var shaObj = new jsSHA('SHA-256', 'HEX');
    var msgHex = byteArray2hexStr(msgBytes);
    shaObj.update(msgHex);
    var hashHex = shaObj.getHash('HEX');
    return hexStr2byteArray(hashHex);
}
//# sourceMappingURL=bip44.js.map