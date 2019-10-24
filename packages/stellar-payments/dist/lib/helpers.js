import { createUnitConverters } from '@faast/payments-common';
import { isNil } from '@faast/ts-common';
import * as Stellar from 'stellar-sdk';
import { isString } from 'util';
import { DECIMAL_PLACES } from './constants';
const { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, } = createUnitConverters(DECIMAL_PLACES);
export { toMainDenominationBigNumber, toMainDenominationString, toMainDenominationNumber, toBaseDenominationBigNumber, toBaseDenominationString, toBaseDenominationNumber, };
export function isValidAddress(address) {
    return isString(address) && Stellar.StrKey.isValidEd25519PublicKey(address);
}
export function isValidExtraId(extraId) {
    return isString(extraId);
}
export function isValidSecret(secret) {
    return isString(secret) && Stellar.StrKey.isValidEd25519SecretSeed(secret);
}
export function assertValidAddress(address) {
    if (!isValidAddress(address)) {
        throw new Error(`Invalid stellar address: ${address}`);
    }
}
export function assertValidExtraId(extraId) {
    if (!isValidExtraId(extraId)) {
        throw new Error(`Invalid stellar extraId: ${extraId}`);
    }
}
export function assertValidExtraIdOrNil(extraId) {
    if (!isNil(extraId) && !isValidExtraId(extraId)) {
        throw new Error(`Invalid stellar extraId: ${extraId}`);
    }
}
//# sourceMappingURL=helpers.js.map