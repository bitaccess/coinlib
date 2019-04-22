import { getFunctionName, UnionType, IntersectionType } from 'io-ts';
export { PathReporter } from 'io-ts/lib/PathReporter';
function stringify(v) {
    if (typeof v === 'function') {
        return getFunctionName(v);
    }
    if (typeof v === 'number' && !isFinite(v)) {
        if (isNaN(v)) {
            return 'NaN';
        }
        return v > 0 ? 'Infinity' : '-Infinity';
    }
    return JSON.stringify(v);
}
function getContextPath(context) {
    return context
        .filter(function (_a, i) {
        var type = _a.type;
        if (i === 0)
            return true;
        var previousType = context[i - 1].type;
        return !(previousType instanceof UnionType || previousType instanceof IntersectionType);
    })
        .map(function (_a) {
        var key = _a.key, type = _a.type;
        return (key ? key : type.name);
    })
        .join('.');
}
function getMessage(e) {
    var expectedType = e.context[e.context.length - 1].type.name;
    var contextPath = getContextPath(e.context);
    var expectedMessage = expectedType !== contextPath ? expectedType + " for " + contextPath : expectedType;
    return e.message !== undefined ? e.message : "Expected type " + expectedMessage + ", but got: " + stringify(e.value);
}
export var SimpleReporter = {
    report: function (validation) { return validation.fold(function (es) { return es.map(getMessage); }, function () { return ['No errors!']; }); }
};
export function assertType(typeCodec, value, description) {
    if (description === void 0) { description = 'type'; }
    var validation = typeCodec.decode(value);
    if (validation.isLeft()) {
        throw new TypeError("Invalid " + description + " - " + SimpleReporter.report(validation)[0]);
    }
    return validation.value;
}
//# sourceMappingURL=utils.js.map