export function toError(e) {
    if (typeof e === 'string') {
        return new Error(e);
    }
    return e;
}
export function toMainDenominationNumber(amountSun) {
    return (typeof amountSun === 'number' ? amountSun : Number.parseInt(amountSun)) / 1e6;
}
export function toMainDenomination(amountSun) {
    return toMainDenominationNumber(amountSun).toString();
}
export function toBaseDenominationNumber(amountTrx) {
    return (typeof amountTrx === 'number' ? amountTrx : Number.parseFloat(amountTrx)) * 1e6;
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
//# sourceMappingURL=utils.js.map