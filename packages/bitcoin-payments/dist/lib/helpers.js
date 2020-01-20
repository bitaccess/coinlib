import { createUnitConverters } from '@faast/payments-common';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip32 from 'bip32';
import { AddressType } from './types';
import { DECIMAL_PLACES } from './constants';
const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = createUnitConverters(DECIMAL_PLACES);
export { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, };
export function isValidXprv(xprv, network) {
    try {
        return !bip32.fromBase58(xprv, network).isNeutered();
    }
    catch (e) {
        return false;
    }
}
export function isValidXpub(xpub, network) {
    try {
        return bip32.fromBase58(xpub, network).isNeutered();
    }
    catch (e) {
        return false;
    }
}
export function validateHdKey(hdKey, network) {
    try {
        bip32.fromBase58(hdKey, network);
    }
    catch (e) {
        return e.toString();
    }
}
export function isValidAddress(address, network) {
    try {
        bitcoin.address.toOutputScript(address, network);
        return true;
    }
    catch (e) {
        return false;
    }
}
export function isValidExtraId(extraId) {
    return false;
}
export function publicKeyToAddress(publicKey, network, addressType) {
    let script;
    if (addressType === AddressType.Legacy) {
        script = bitcoin.payments.p2pkh({ network, pubkey: publicKey });
    }
    else {
        script = bitcoin.payments.p2wpkh({ network, pubkey: publicKey });
        if (addressType === AddressType.SegwitP2SH) {
            script = bitcoin.payments.p2sh({
                network,
                redeem: script
            });
        }
    }
    const { address } = script;
    if (!address) {
        throw new Error('bitcoinjs-lib address derivation returned falsy value');
    }
    return address;
}
function privateKeyToKeyPair(privateKey, network) {
    return bitcoin.ECPair.fromWIF(privateKey, network);
}
export function privateKeyToAddress(privateKey, network, addressType) {
    const keyPair = privateKeyToKeyPair(privateKey, network);
    return publicKeyToAddress(keyPair.publicKey, network, addressType);
}
export function isValidPrivateKey(privateKey, network) {
    try {
        privateKeyToKeyPair(privateKey, network);
        return true;
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=helpers.js.map