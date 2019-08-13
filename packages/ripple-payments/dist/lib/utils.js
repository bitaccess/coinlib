export function padLeft(x, n, v) {
    while (x.length < n) {
        x = `${v}${x}`;
    }
    return x;
}
//# sourceMappingURL=utils.js.map