"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toError(e) {
    if (typeof e === 'string') {
        return new Error(e);
    }
    return e;
}
exports.toError = toError;
function toMainDenominationNumber(amountSun) {
    var baseUnits = typeof amountSun === 'number' ? amountSun : Number.parseInt(amountSun);
    if (Number.isNaN(baseUnits)) {
        throw new Error('Cannot convert to main denomination - not a number');
    }
    if (!Number.isFinite(baseUnits)) {
        throw new Error('Cannot convert to main denomination - not finite');
    }
    return baseUnits / 1e6;
}
exports.toMainDenominationNumber = toMainDenominationNumber;
function toMainDenomination(amountSun) {
    return toMainDenominationNumber(amountSun).toString();
}
exports.toMainDenomination = toMainDenomination;
function toBaseDenominationNumber(amountTrx) {
    var mainUnits = typeof amountTrx === 'number' ? amountTrx : Number.parseFloat(amountTrx);
    if (Number.isNaN(mainUnits)) {
        throw new Error('Cannot convert to base denomination - not a number');
    }
    if (!Number.isFinite(mainUnits)) {
        throw new Error('Cannot convert to base denomination - not finite');
    }
    return Math.floor(mainUnits * 1e6);
}
exports.toBaseDenominationNumber = toBaseDenominationNumber;
function toBaseDenomination(amountTrx) {
    return toBaseDenominationNumber(amountTrx).toString();
}
exports.toBaseDenomination = toBaseDenomination;
function isValidXprv(xprv) {
    return xprv.startsWith('xprv');
}
exports.isValidXprv = isValidXprv;
function isValidXpub(xpub) {
    return xpub.startsWith('xpub');
}
exports.isValidXpub = isValidXpub;
//# sourceMappingURL=utils.js.map