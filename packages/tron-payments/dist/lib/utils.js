export function toError(e) {
    if (typeof e === 'string') {
        return new Error(e);
    }
    return e;
}
//# sourceMappingURL=utils.js.map