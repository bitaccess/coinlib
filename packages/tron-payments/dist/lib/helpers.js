import TronWeb from 'tronweb';
import { DECIMAL_PLACES } from './constants';
import { createUnitConverters, Payport } from '@faast/payments-common';
import { isNil } from '@faast/ts-common';
const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = createUnitConverters(DECIMAL_PLACES);
export { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, };
export function isValidXprv(xprv) {
    return xprv.startsWith('xprv');
}
export function isValidXpub(xpub) {
    return xpub.startsWith('xpub');
}
export function isValidAddress(address) {
    return TronWeb.isAddress(address);
}
export function isValidExtraId(extraId) {
    return false;
}
export function isValidPayport(payport) {
    if (!Payport.is(payport)) {
        return false;
    }
    const { address, extraId } = payport;
    return isValidAddress(address) && (isNil(extraId) ? true : isValidExtraId(extraId));
}
export function isValidPrivateKey(privateKey) {
    try {
        privateKeyToAddress(privateKey);
        return true;
    }
    catch (e) {
        return false;
    }
}
export function privateKeyToAddress(privateKey) {
    const address = TronWeb.address.fromPrivateKey(privateKey);
    if (isValidAddress(address)) {
        return address;
    }
    else {
        throw new Error('Validation failed for address derived from private key');
    }
}
//# sourceMappingURL=helpers.js.map