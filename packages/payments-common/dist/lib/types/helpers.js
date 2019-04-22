import * as t from 'io-ts';
export function enumCodec(e, name) {
    var keyed = {};
    Object.values(e).forEach(function (v) {
        keyed[v] = null;
    });
    return t.keyof(keyed, name);
}
export function extend(parent, required, optional, name) {
    return t.intersection([
        parent,
        t.type(required, name + "Req"),
        t.partial(optional, name + "Opt"),
    ], name);
}
export var nullable = function (codec) { return t.union([codec, t.null], codec.name + "Nullable"); };
//# sourceMappingURL=helpers.js.map