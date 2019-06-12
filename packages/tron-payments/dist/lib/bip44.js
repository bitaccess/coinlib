import { HDPrivateKey, HDPublicKey } from 'bitcore-lib';
import { keccak256 } from 'js-sha3';
import jsSHA from 'jssha';
import { ec as EC } from 'elliptic';
import { encode58 } from './base58';
const ec = new EC('secp256k1');
export const derivationPath = "m/44'/195'/0'";
const derivationPathParts = derivationPath.split('/').slice(1);
export function deriveAddress(xpub, index) {
    const key = new HDPublicKey(xpub);
    const derived = deriveBasePath(key)
        .derive(0)
        .derive(index);
    return hdPublicKeyToAddress(derived);
}
export function derivePrivateKey(xprv, index) {
    const key = new HDPrivateKey(xprv);
    const derived = deriveBasePath(key)
        .derive(0)
        .derive(index);
    return hdPrivateKeyToPrivateKey(derived);
}
export function xprvToXpub(xprv) {
    const key = xprv instanceof HDPrivateKey ? xprv : new HDPrivateKey(xprv);
    const derivedPubKey = deriveBasePath(key).hdPublicKey;
    return derivedPubKey.toString();
}
function deriveBasePath(key) {
    const parts = derivationPathParts.slice(key.depth);
    if (parts.length > 0) {
        return key.derive(`m/${parts.join('/')}`);
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
    const pubkey = ec.keyFromPublic(pubKey).getPublic();
    const x = pubkey.x;
    const y = pubkey.y;
    let xHex = x.toString('hex');
    while (xHex.length < 64) {
        xHex = `0${xHex}`;
    }
    let yHex = y.toString('hex');
    while (yHex.length < 64) {
        yHex = `0${yHex}`;
    }
    const pubkeyHex = `04${xHex}${yHex}`;
    const pubkeyBytes = hexStr2byteArray(pubkeyHex);
    return pubkeyBytes;
}
function bip32PrivateToTronPrivate(priKeyBytes) {
    const key = ec.keyFromPrivate(priKeyBytes, 'bytes');
    const privkey = key.getPrivate();
    let priKeyHex = privkey.toString('hex');
    while (priKeyHex.length < 64) {
        priKeyHex = `0${priKeyHex}`;
    }
    let privArray = hexStr2byteArray(priKeyHex);
    return byteArray2hexStr(privArray);
}
const ADDRESS_PREFIX = '41';
function byte2hexStr(byte) {
    const hexByteMap = '0123456789ABCDEF';
    let str = '';
    str += hexByteMap.charAt(byte >> 4);
    str += hexByteMap.charAt(byte & 0x0f);
    return str;
}
function hexStr2byteArray(str) {
    const byteArray = Array();
    let d = 0;
    let j = 0;
    let k = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charAt(i);
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
    let d = 0;
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
    let str = '';
    for (let i = 0; i < byteArray.length; i++) {
        str += byte2hexStr(byteArray[i]);
    }
    return str;
}
function pubBytesToTronBytes(pubBytes) {
    if (pubBytes.length === 65) {
        pubBytes = pubBytes.slice(1);
    }
    const hash = keccak256(pubBytes).toString();
    const addressHex = ADDRESS_PREFIX + hash.substring(24);
    return hexStr2byteArray(addressHex);
}
function addressBytesToB58CheckAddress(addressBytes) {
    const hash0 = SHA256(addressBytes);
    const hash1 = SHA256(hash0);
    let checkSum = hash1.slice(0, 4);
    checkSum = addressBytes.concat(checkSum);
    return encode58(checkSum);
}
function SHA256(msgBytes) {
    const shaObj = new jsSHA('SHA-256', 'HEX');
    const msgHex = byteArray2hexStr(msgBytes);
    shaObj.update(msgHex);
    const hashHex = shaObj.getHash('HEX');
    return hexStr2byteArray(hashHex);
}
//# sourceMappingURL=bip44.js.map