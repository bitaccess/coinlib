import TronWeb from 'tronweb';
export function toError(e) {
    if (typeof e === 'string') {
        return new Error(e);
    }
    return e;
}
export function toMainDenominationNumber(amountSun) {
    const baseUnits = typeof amountSun === 'number' ? amountSun : Number.parseInt(amountSun);
    if (Number.isNaN(baseUnits)) {
        throw new Error('Cannot convert to main denomination - not a number');
    }
    if (!Number.isFinite(baseUnits)) {
        throw new Error('Cannot convert to main denomination - not finite');
    }
    return baseUnits / 1e6;
}
export function toMainDenomination(amountSun) {
    return toMainDenominationNumber(amountSun).toString();
}
export function toBaseDenominationNumber(amountTrx) {
    const mainUnits = typeof amountTrx === 'number' ? amountTrx : Number.parseFloat(amountTrx);
    if (Number.isNaN(mainUnits)) {
        throw new Error('Cannot convert to base denomination - not a number');
    }
    if (!Number.isFinite(mainUnits)) {
        throw new Error('Cannot convert to base denomination - not finite');
    }
    return Math.floor(mainUnits * 1e6);
}
export function toBaseDenomination(amountTrx) {
    return toBaseDenominationNumber(amountTrx).toString();
}
export function isValidXprv(xprv) {
    return xprv.startsWith('xprv');
}
export function isValidXpub(xpub) {
    return xpub.startsWith('xpub');
}
export function isValidAddress(address) {
    return TronWeb.isAddress(address);
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
//# sourceMappingURL=utils.js.map