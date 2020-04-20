import { createUnitConverters } from '@faast/payments-common';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip32 from 'bip32';
import { AddressType } from './types';
import { DECIMAL_PLACES } from './constants';
import { isString } from '@faast/ts-common';
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
export function isValidPublicKey(publicKey, network) {
    try {
        bitcoin.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network });
        return true;
    }
    catch (e) {
        return false;
    }
}
export function isValidExtraId(extraId) {
    return false;
}
export function publicKeyToBuffer(publicKey) {
    return isString(publicKey) ? Buffer.from(publicKey, 'hex') : publicKey;
}
export function publicKeyToString(publicKey) {
    return isString(publicKey) ? publicKey : publicKey.toString('hex');
}
export function getMultisigPaymentScript(network, addressType, pubkeys, m) {
    const scriptParams = {
        network,
        redeem: bitcoin.payments.p2ms({
            pubkeys: pubkeys.sort(),
            m,
            network,
        })
    };
    switch (addressType) {
        case AddressType.MultisigLegacy:
            return bitcoin.payments.p2sh(scriptParams);
        case AddressType.MultisigSegwitNative:
            return bitcoin.payments.p2wsh(scriptParams);
        case AddressType.MultisigSegwitP2SH:
            return bitcoin.payments.p2sh({
                redeem: bitcoin.payments.p2wsh(scriptParams),
                network,
            });
    }
}
export function getSinglesigPaymentScript(network, addressType, pubkey) {
    const scriptParams = { network, pubkey };
    switch (addressType) {
        case AddressType.Legacy:
            return bitcoin.payments.p2pkh(scriptParams);
        case AddressType.SegwitNative:
            return bitcoin.payments.p2wpkh(scriptParams);
        case AddressType.SegwitP2SH:
            return bitcoin.payments.p2sh({
                redeem: bitcoin.payments.p2wpkh(scriptParams),
                network,
            });
    }
}
export function publicKeyToAddress(publicKey, network, addressType) {
    const pubkey = publicKeyToBuffer(publicKey);
    const script = getSinglesigPaymentScript(network, addressType, pubkey);
    const { address } = script;
    if (!address) {
        throw new Error('bitcoinjs-lib address derivation returned falsy value');
    }
    return address;
}
export function publicKeyToKeyPair(publicKey, network) {
    return bitcoin.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network });
}
export function privateKeyToKeyPair(privateKey, network) {
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