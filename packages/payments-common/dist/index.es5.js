import { getFunctionName, UnionType, IntersectionType, type, string, number, UnknownRecord, literal, boolean, success, failure, identity, Type, keyof, intersection, partial, union, null } from 'io-ts';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var DateType = (function (_super) {
    __extends(DateType, _super);
    function DateType() {
        var _this = _super.call(this, 'Date', function (u) { return u instanceof Date; }, function (u, c) { return (_this.is(u) ? success(u) : failure(u, c)); }, identity) || this;
        _this._tag = 'DateType';
        return _this;
    }
    return DateType;
}(Type));
var DateT = new DateType();

function enumCodec(e, name) {
    var keyed = {};
    Object.values(e).forEach(function (v) {
        keyed[v] = null;
    });
    return keyof(keyed, name);
}
function extend(parent, required, optional, name) {
    return intersection([
        parent,
        type(required, name + "Req"),
        partial(optional, name + "Opt"),
    ], name);
}
var nullable = function (codec) { return union([codec, null], codec.name + "Nullable"); };

var BalanceResult = type({
    balance: string,
    unconfirmedBalance: string,
});
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Unsigned"] = "unsigned";
    TransactionStatus["Signed"] = "signed";
    TransactionStatus["Pending"] = "pending";
    TransactionStatus["Confirmed"] = "confirmed";
    TransactionStatus["Failed"] = "failed";
})(TransactionStatus || (TransactionStatus = {}));
var TransactionStatusT = enumCodec(TransactionStatus, 'TransactionStatus');
var TransactionCommon = type({
    id: nullable(string),
    from: nullable(string),
    to: nullable(string),
    toExtraId: nullable(string),
    fromIndex: nullable(number),
    toIndex: nullable(number),
    amount: nullable(string),
    fee: nullable(string),
    status: TransactionStatusT,
});
var UnsignedCommon = extend(TransactionCommon, {
    from: string,
    to: string,
    fromIndex: number,
    rawUnsigned: UnknownRecord,
}, {}, 'UnsignedCommon');
var BaseUnsignedTransaction = extend(UnsignedCommon, {
    status: literal('unsigned'),
}, {}, 'BaseUnsignedTransaction');
var BaseSignedTransaction = extend(UnsignedCommon, {
    status: literal('signed'),
    id: string,
    amount: string,
    fee: string,
    rawSigned: UnknownRecord,
}, {}, 'BaseSignedTransaction');
var BaseTransactionInfo = extend(TransactionCommon, {
    id: string,
    amount: string,
    fee: string,
    isExecuted: boolean,
    isConfirmed: boolean,
    confirmations: number,
    block: nullable(number),
    date: nullable(DateT),
    rawInfo: UnknownRecord,
}, {}, 'BaseTransactionInfo');
var BaseBroadcastResult = type({
    id: string,
}, 'BaseBroadcastResult');

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var ChainRec = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @since 1.0.0
 */
exports.tailRec = function (f, a) {
    var v = f(a);
    while (v.isLeft()) {
        v = f(v.value);
    }
    return v.value;
};
});

unwrapExports(ChainRec);
var ChainRec_1 = ChainRec.tailRec;

var _function = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @since 1.0.0
 */
exports.identity = function (a) {
    return a;
};
/**
 * @since 1.0.0
 */
exports.unsafeCoerce = exports.identity;
/**
 * @since 1.0.0
 */
exports.not = function (predicate) {
    return function (a) { return !predicate(a); };
};
function or(p1, p2) {
    return function (a) { return p1(a) || p2(a); };
}
exports.or = or;
/**
 * @since 1.0.0
 */
exports.and = function (p1, p2) {
    return function (a) { return p1(a) && p2(a); };
};
/**
 * @since 1.0.0
 */
exports.constant = function (a) {
    return function () { return a; };
};
/**
 * A thunk that returns always `true`
 *
 * @since 1.0.0
 */
exports.constTrue = function () {
    return true;
};
/**
 * A thunk that returns always `false`
 *
 * @since 1.0.0
 */
exports.constFalse = function () {
    return false;
};
/**
 * A thunk that returns always `null`
 *
 * @since 1.0.0
 */
exports.constNull = function () {
    return null;
};
/**
 * A thunk that returns always `undefined`
 *
 * @since 1.0.0
 */
exports.constUndefined = function () {
    return;
};
/**
 * A thunk that returns always `void`
 *
 * @since 1.14.0
 */
exports.constVoid = function () {
    return;
};
/**
 * Flips the order of the arguments to a function of two arguments.
 *
 * @since 1.0.0
 */
exports.flip = function (f) {
    return function (b) { return function (a) { return f(a)(b); }; };
};
/**
 * The `on` function is used to change the domain of a binary operator.
 *
 * @since 1.0.0
 */
exports.on = function (op) { return function (f) {
    return function (x, y) { return op(f(x), f(y)); };
}; };
function compose() {
    var fns = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fns[_i] = arguments[_i];
    }
    var len = fns.length - 1;
    return function (x) {
        var y = x;
        for (var i = len; i > -1; i--) {
            y = fns[i].call(this, y);
        }
        return y;
    };
}
exports.compose = compose;
function pipe() {
    var fns = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fns[_i] = arguments[_i];
    }
    var len = fns.length - 1;
    return function (x) {
        var y = x;
        for (var i = 0; i <= len; i++) {
            y = fns[i].call(this, y);
        }
        return y;
    };
}
exports.pipe = pipe;
/**
 * @since 1.0.0
 */
exports.concat = function (x, y) {
    var lenx = x.length;
    var leny = y.length;
    var r = Array(lenx + leny);
    for (var i = 0; i < lenx; i++) {
        r[i] = x[i];
    }
    for (var i = 0; i < leny; i++) {
        r[i + lenx] = y[i];
    }
    return r;
};
/**
 * @since 1.0.0
 */
function curried(f, n, acc) {
    return function (x) {
        var combined = exports.concat(acc, [x]);
        return n === 0 ? f.apply(this, combined) : curried(f, n - 1, combined);
    };
}
exports.curried = curried;
function curry(f) {
    return curried(f, f.length - 1, []);
}
exports.curry = curry;
/* tslint:disable-next-line */
var getFunctionName$$1 = function (f) { return f.displayName || f.name || "<function" + f.length + ">"; };
/**
 * @since 1.0.0
 */
exports.toString = function (x) {
    if (typeof x === 'string') {
        return JSON.stringify(x);
    }
    if (x instanceof Date) {
        return "new Date('" + x.toISOString() + "')";
    }
    if (Array.isArray(x)) {
        return "[" + x.map(exports.toString).join(', ') + "]";
    }
    if (typeof x === 'function') {
        return getFunctionName$$1(x);
    }
    if (x == null) {
        return String(x);
    }
    if (typeof x.toString === 'function' && x.toString !== Object.prototype.toString) {
        return x.toString();
    }
    try {
        return JSON.stringify(x, null, 2);
    }
    catch (e) {
        return String(x);
    }
};
/**
 * @since 1.0.0
 */
exports.tuple = function () {
    var t = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        t[_i] = arguments[_i];
    }
    return t;
};
/**
 * @since 1.0.0
 * @deprecated
 */
exports.tupleCurried = function (a) { return function (b) {
    return [a, b];
}; };
/**
 * Applies a function to an argument ($)
 *
 * @since 1.0.0
 */
exports.apply = function (f) { return function (a) {
    return f(a);
}; };
/**
 * Applies an argument to a function (#)
 *
 * @since 1.0.0
 */
exports.applyFlipped = function (a) { return function (f) {
    return f(a);
}; };
/**
 * For use with phantom fields
 *
 * @since 1.0.0
 */
exports.phantom = undefined;
/**
 * A thunk that returns always the `identity` function.
 * For use with `applySecond` methods.
 *
 * @since 1.5.0
 */
exports.constIdentity = function () {
    return exports.identity;
};
/**
 * @since 1.9.0
 */
exports.increment = function (n) {
    return n + 1;
};
/**
 * @since 1.9.0
 */
exports.decrement = function (n) {
    return n - 1;
};
});

unwrapExports(_function);
var _function_1 = _function.identity;
var _function_2 = _function.unsafeCoerce;
var _function_3 = _function.not;
var _function_4 = _function.or;
var _function_5 = _function.and;
var _function_6 = _function.constant;
var _function_7 = _function.constTrue;
var _function_8 = _function.constFalse;
var _function_9 = _function.constNull;
var _function_10 = _function.constUndefined;
var _function_11 = _function.constVoid;
var _function_12 = _function.flip;
var _function_13 = _function.on;
var _function_14 = _function.compose;
var _function_15 = _function.pipe;
var _function_16 = _function.concat;
var _function_17 = _function.curried;
var _function_18 = _function.curry;
var _function_19 = _function.tuple;
var _function_20 = _function.tupleCurried;
var _function_21 = _function.apply;
var _function_22 = _function.applyFlipped;
var _function_23 = _function.phantom;
var _function_24 = _function.constIdentity;
var _function_25 = _function.increment;
var _function_26 = _function.decrement;

var Setoid = createCommonjsModule(function (module, exports) {
/**
 * @file The `Setoid` type class represents types which support decidable equality.
 *
 * Instances must satisfy the following laws:
 *
 * 1. Reflexivity: `S.equals(a, a) === true`
 * 2. Symmetry: `S.equals(a, b) === S.equals(b, a)`
 * 3. Transitivity: if `S.equals(a, b) === true` and `S.equals(b, c) === true`, then `S.equals(a, c) === true`
 *
 * See [Getting started with fp-ts: Setoid](https://dev.to/gcanti/getting-started-with-fp-ts-setoid-39f3)
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @since 1.14.0
 */
exports.fromEquals = function (equals) {
    return {
        equals: function (x, y) { return x === y || equals(x, y); }
    };
};
/**
 * @since 1.0.0
 */
exports.strictEqual = function (a, b) {
    return a === b;
};
var setoidStrict = { equals: exports.strictEqual };
/**
 * @since 1.0.0
 */
exports.setoidString = setoidStrict;
/**
 * @since 1.0.0
 */
exports.setoidNumber = setoidStrict;
/**
 * @since 1.0.0
 */
exports.setoidBoolean = setoidStrict;
/**
 * @since 1.0.0
 */
exports.getArraySetoid = function (S) {
    return exports.fromEquals(function (xs, ys) { return xs.length === ys.length && xs.every(function (x, i) { return S.equals(x, ys[i]); }); });
};
/**
 * @since 1.14.2
 */
exports.getStructSetoid = function (setoids) {
    return exports.fromEquals(function (x, y) {
        for (var k in setoids) {
            if (!setoids[k].equals(x[k], y[k])) {
                return false;
            }
        }
        return true;
    });
};
/**
 * Use `getStructSetoid` instead
 * @since 1.0.0
 * @deprecated
 */
exports.getRecordSetoid = function (setoids) {
    return exports.getStructSetoid(setoids);
};
/**
 * Given a tuple of `Setoid`s returns a `Setoid` for the tuple
 *
 * @example
 * import { getTupleSetoid, setoidString, setoidNumber, setoidBoolean } from 'fp-ts/lib/Setoid'
 *
 * const S = getTupleSetoid(setoidString, setoidNumber, setoidBoolean)
 * assert.strictEqual(S.equals(['a', 1, true], ['a', 1, true]), true)
 * assert.strictEqual(S.equals(['a', 1, true], ['b', 1, true]), false)
 * assert.strictEqual(S.equals(['a', 1, true], ['a', 2, true]), false)
 * assert.strictEqual(S.equals(['a', 1, true], ['a', 1, false]), false)
 *
 * @since 1.14.2
 */
exports.getTupleSetoid = function () {
    var setoids = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        setoids[_i] = arguments[_i];
    }
    return exports.fromEquals(function (x, y) { return setoids.every(function (S, i) { return S.equals(x[i], y[i]); }); });
};
/**
 * Use `getTupleSetoid` instead
 * @since 1.0.0
 * @deprecated
 */
exports.getProductSetoid = function (SA, SB) {
    return exports.getTupleSetoid(SA, SB);
};
/**
 * Returns the `Setoid` corresponding to the partitions of `B` induced by `f`
 *
 * @since 1.2.0
 */
exports.contramap = function (f, fa) {
    return exports.fromEquals(function (x, y) { return fa.equals(f(x), f(y)); });
};
/**
 * @since 1.4.0
 */
exports.setoidDate = exports.contramap(function (date) { return date.valueOf(); }, exports.setoidNumber);
});

unwrapExports(Setoid);
var Setoid_1 = Setoid.fromEquals;
var Setoid_2 = Setoid.strictEqual;
var Setoid_3 = Setoid.setoidString;
var Setoid_4 = Setoid.setoidNumber;
var Setoid_5 = Setoid.setoidBoolean;
var Setoid_6 = Setoid.getArraySetoid;
var Setoid_7 = Setoid.getStructSetoid;
var Setoid_8 = Setoid.getRecordSetoid;
var Setoid_9 = Setoid.getTupleSetoid;
var Setoid_10 = Setoid.getProductSetoid;
var Setoid_11 = Setoid.contramap;
var Setoid_12 = Setoid.setoidDate;

var Either = createCommonjsModule(function (module, exports) {
/**
 * @file Represents a value of one of two possible types (a disjoint union).
 *
 * An instance of `Either` is either an instance of `Left` or `Right`.
 *
 * A common use of `Either` is as an alternative to `Option` for dealing with possible missing values. In this usage,
 * `None` is replaced with a `Left` which can contain useful information. `Right` takes the place of `Some`. Convention
 * dictates that `Left` is used for failure and `Right` is used for success.
 *
 * For example, you could use `Either<string, number>` to detect whether a received input is a `string` or a `number`.
 *
 * ```ts
 * const parse = (errorMessage: string) => (input: string): Either<string, number> => {
 *   const n = parseInt(input, 10)
 *   return isNaN(n) ? left(errorMessage) : right(n)
 * }
 * ```
 *
 * `Either` is right-biased, which means that `Right` is assumed to be the default case to operate on. If it is `Left`,
 * operations like `map`, `chain`, ... return the `Left` value unchanged:
 *
 * ```ts
 * right(12).map(double) // right(24)
 * left(23).map(double)  // left(23)
 * ```
 */
var __assign = (commonjsGlobal && commonjsGlobal.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });



exports.URI = 'Either';
/**
 * Left side of `Either`
 */
var Left = /** @class */ (function () {
    function Left(value) {
        this.value = value;
        this._tag = 'Left';
    }
    /** The given function is applied if this is a `Right` */
    Left.prototype.map = function (f) {
        return this;
    };
    Left.prototype.ap = function (fab) {
        return (fab.isLeft() ? fab : this);
    };
    /**
     * Flipped version of `ap`
     */
    Left.prototype.ap_ = function (fb) {
        return fb.ap(this);
    };
    /** Binds the given function across `Right` */
    Left.prototype.chain = function (f) {
        return this;
    };
    Left.prototype.bimap = function (f, g) {
        return new Left(f(this.value));
    };
    Left.prototype.alt = function (fy) {
        return fy;
    };
    /**
     * Lazy version of `alt`
     *
     * @example
     * import { right } from 'fp-ts/lib/Either'
     *
     * assert.deepStrictEqual(right(1).orElse(() => right(2)), right(1))
     *
     * @since 1.6.0
     */
    Left.prototype.orElse = function (fy) {
        return fy(this.value);
    };
    Left.prototype.extend = function (f) {
        return this;
    };
    Left.prototype.reduce = function (b, f) {
        return b;
    };
    /** Applies a function to each case in the data structure */
    Left.prototype.fold = function (onLeft, onRight) {
        return onLeft(this.value);
    };
    /** Returns the value from this `Right` or the given argument if this is a `Left` */
    Left.prototype.getOrElse = function (a) {
        return a;
    };
    /** Returns the value from this `Right` or the result of given argument if this is a `Left` */
    Left.prototype.getOrElseL = function (f) {
        return f(this.value);
    };
    /** Maps the left side of the disjunction */
    Left.prototype.mapLeft = function (f) {
        return new Left(f(this.value));
    };
    Left.prototype.inspect = function () {
        return this.toString();
    };
    Left.prototype.toString = function () {
        return "left(" + _function.toString(this.value) + ")";
    };
    /** Returns `true` if the either is an instance of `Left`, `false` otherwise */
    Left.prototype.isLeft = function () {
        return true;
    };
    /** Returns `true` if the either is an instance of `Right`, `false` otherwise */
    Left.prototype.isRight = function () {
        return false;
    };
    /** Swaps the disjunction values */
    Left.prototype.swap = function () {
        return new Right(this.value);
    };
    Left.prototype.filterOrElse = function (_, zero) {
        return this;
    };
    Left.prototype.filterOrElseL = function (_, zero) {
        return this;
    };
    /**
     * Use `filterOrElse` instead
     * @since 1.6.0
     * @deprecated
     */
    Left.prototype.refineOrElse = function (p, zero) {
        return this;
    };
    /**
     * Lazy version of `refineOrElse`
     * Use `filterOrElseL` instead
     * @since 1.6.0
     * @deprecated
     */
    Left.prototype.refineOrElseL = function (p, zero) {
        return this;
    };
    return Left;
}());
exports.Left = Left;
/**
 * Right side of `Either`
 */
var Right = /** @class */ (function () {
    function Right(value) {
        this.value = value;
        this._tag = 'Right';
    }
    Right.prototype.map = function (f) {
        return new Right(f(this.value));
    };
    Right.prototype.ap = function (fab) {
        return fab.isRight() ? this.map(fab.value) : exports.left(fab.value);
    };
    Right.prototype.ap_ = function (fb) {
        return fb.ap(this);
    };
    Right.prototype.chain = function (f) {
        return f(this.value);
    };
    Right.prototype.bimap = function (f, g) {
        return new Right(g(this.value));
    };
    Right.prototype.alt = function (fy) {
        return this;
    };
    Right.prototype.orElse = function (fy) {
        return this;
    };
    Right.prototype.extend = function (f) {
        return new Right(f(this));
    };
    Right.prototype.reduce = function (b, f) {
        return f(b, this.value);
    };
    Right.prototype.fold = function (onLeft, onRight) {
        return onRight(this.value);
    };
    Right.prototype.getOrElse = function (a) {
        return this.value;
    };
    Right.prototype.getOrElseL = function (f) {
        return this.value;
    };
    Right.prototype.mapLeft = function (f) {
        return new Right(this.value);
    };
    Right.prototype.inspect = function () {
        return this.toString();
    };
    Right.prototype.toString = function () {
        return "right(" + _function.toString(this.value) + ")";
    };
    Right.prototype.isLeft = function () {
        return false;
    };
    Right.prototype.isRight = function () {
        return true;
    };
    Right.prototype.swap = function () {
        return new Left(this.value);
    };
    Right.prototype.filterOrElse = function (p, zero) {
        return p(this.value) ? this : exports.left(zero);
    };
    Right.prototype.filterOrElseL = function (p, zero) {
        return p(this.value) ? this : exports.left(zero(this.value));
    };
    Right.prototype.refineOrElse = function (p, zero) {
        return p(this.value) ? this : exports.left(zero);
    };
    Right.prototype.refineOrElseL = function (p, zero) {
        return p(this.value) ? this : exports.left(zero(this.value));
    };
    return Right;
}());
exports.Right = Right;
/**
 * @since 1.17.0
 */
exports.getShow = function (SL, SA) {
    return {
        show: function (e) { return e.fold(function (l) { return "left(" + SL.show(l) + ")"; }, function (a) { return "right(" + SA.show(a) + ")"; }); }
    };
};
/**
 * @since 1.0.0
 */
exports.getSetoid = function (SL, SA) {
    return Setoid.fromEquals(function (x, y) { return (x.isLeft() ? y.isLeft() && SL.equals(x.value, y.value) : y.isRight() && SA.equals(x.value, y.value)); });
};
/**
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * appended using the provided `Semigroup`
 *
 * @example
 * import { getSemigroup, left, right } from 'fp-ts/lib/Either'
 * import { semigroupSum } from 'fp-ts/lib/Semigroup'
 *
 * const S = getSemigroup<string, number>(semigroupSum)
 * assert.deepStrictEqual(S.concat(left('a'), left('b')), left('a'))
 * assert.deepStrictEqual(S.concat(left('a'), right(2)), right(2))
 * assert.deepStrictEqual(S.concat(right(1), left('b')), right(1))
 * assert.deepStrictEqual(S.concat(right(1), right(2)), right(3))
 *
 *
 * @since 1.7.0
 */
exports.getSemigroup = function (S) {
    return {
        concat: function (x, y) { return (y.isLeft() ? x : x.isLeft() ? y : exports.right(S.concat(x.value, y.value))); }
    };
};
/**
 * `Apply` semigroup
 *
 * @example
 * import { getApplySemigroup, left, right } from 'fp-ts/lib/Either'
 * import { semigroupSum } from 'fp-ts/lib/Semigroup'
 *
 * const S = getApplySemigroup<string, number>(semigroupSum)
 * assert.deepStrictEqual(S.concat(left('a'), left('b')), left('a'))
 * assert.deepStrictEqual(S.concat(left('a'), right(2)), left('a'))
 * assert.deepStrictEqual(S.concat(right(1), left('b')), left('b'))
 * assert.deepStrictEqual(S.concat(right(1), right(2)), right(3))
 *
 *
 * @since 1.7.0
 */
exports.getApplySemigroup = function (S) {
    return {
        concat: function (x, y) { return (x.isLeft() ? x : y.isLeft() ? y : exports.right(S.concat(x.value, y.value))); }
    };
};
/**
 * @since 1.7.0
 */
exports.getApplyMonoid = function (M) {
    return __assign({}, exports.getApplySemigroup(M), { empty: exports.right(M.empty) });
};
var map = function (fa, f) {
    return fa.map(f);
};
var ap = function (fab, fa) {
    return fa.ap(fab);
};
var chain = function (fa, f) {
    return fa.chain(f);
};
var bimap = function (fla, f, g) {
    return fla.bimap(f, g);
};
var alt = function (fx, fy) {
    return fx.alt(fy);
};
var extend = function (ea, f) {
    return ea.extend(f);
};
var reduce = function (fa, b, f) {
    return fa.reduce(b, f);
};
var foldMap = function (M) { return function (fa, f) {
    return fa.isLeft() ? M.empty : f(fa.value);
}; };
var foldr = function (fa, b, f) {
    return fa.isLeft() ? b : f(fa.value, b);
};
var traverse = function (F) { return function (ta, f) {
    return ta.isLeft() ? F.of(exports.left(ta.value)) : F.map(f(ta.value), of);
}; };
var sequence = function (F) { return function (ta) {
    return ta.isLeft() ? F.of(exports.left(ta.value)) : F.map(ta.value, exports.right);
}; };
var chainRec = function (a, f) {
    return ChainRec.tailRec(function (e) {
        if (e.isLeft()) {
            return exports.right(exports.left(e.value));
        }
        else {
            var r = e.value;
            return r.isLeft() ? exports.left(f(r.value)) : exports.right(exports.right(r.value));
        }
    }, f(a));
};
/**
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
 * structure
 *
 * @since 1.0.0
 */
exports.left = function (l) {
    return new Left(l);
};
/**
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
 * of this structure
 *
 * @since 1.0.0
 */
exports.right = function (a) {
    return new Right(a);
};
var of = exports.right;
function fromPredicate(predicate, onFalse) {
    return function (a) { return (predicate(a) ? exports.right(a) : exports.left(onFalse(a))); };
}
exports.fromPredicate = fromPredicate;
/**
 * Use `fromPredicate` instead
 *
 * @since 1.6.0
 * @deprecated
 */
exports.fromRefinement = function (refinement, onFalse) { return function (a) {
    return refinement(a) ? exports.right(a) : exports.left(onFalse(a));
}; };
/**
 * Takes a default and a `Option` value, if the value is a `Some`, turn it into a `Right`, if the value is a `None` use
 * the provided default as a `Left`
 *
 * @since 1.0.0
 */
exports.fromOption = function (defaultValue) { return function (fa) {
    return fa.isNone() ? exports.left(defaultValue) : exports.right(fa.value);
}; };
/**
 * Lazy version of `fromOption`
 *
 * @since 1.3.0
 */
exports.fromOptionL = function (defaultValue) { return function (fa) {
    return fa.isNone() ? exports.left(defaultValue()) : exports.right(fa.value);
}; };
/**
 * Takes a default and a nullable value, if the value is not nully, turn it into a `Right`, if the value is nully use
 * the provided default as a `Left`
 *
 * @since 1.0.0
 */
exports.fromNullable = function (defaultValue) { return function (a) {
    return a == null ? exports.left(defaultValue) : exports.right(a);
}; };
/**
 * Default value for the optional `onerror` argument of `tryCatch`
 *
 * @since 1.0.0
 */
exports.toError = function (e) {
    if (e instanceof Error) {
        return e;
    }
    else {
        return new Error(String(e));
    }
};
/**
 * Use `tryCatch2v` instead
 *
 * @since 1.0.0
 * @deprecated
 */
exports.tryCatch = function (f, onerror) {
    if (onerror === void 0) { onerror = exports.toError; }
    return exports.tryCatch2v(f, onerror);
};
/**
 * Constructs a new `Either` from a function that might throw
 *
 * @example
 * import { Either, left, right, tryCatch2v } from 'fp-ts/lib/Either'
 *
 * const unsafeHead = <A>(as: Array<A>): A => {
 *   if (as.length > 0) {
 *     return as[0]
 *   } else {
 *     throw new Error('empty array')
 *   }
 * }
 *
 * const head = <A>(as: Array<A>): Either<Error, A> => {
 *   return tryCatch2v(() => unsafeHead(as), e => (e instanceof Error ? e : new Error('unknown error')))
 * }
 *
 * assert.deepStrictEqual(head([]), left(new Error('empty array')))
 * assert.deepStrictEqual(head([1, 2, 3]), right(1))
 *
 * @since 1.11.0
 */
exports.tryCatch2v = function (f, onerror) {
    try {
        return exports.right(f());
    }
    catch (e) {
        return exports.left(onerror(e));
    }
};
/**
 * @since 1.0.0
 */
exports.fromValidation = function (fa) {
    return fa.isFailure() ? exports.left(fa.value) : exports.right(fa.value);
};
/**
 * Returns `true` if the either is an instance of `Left`, `false` otherwise
 *
 * @since 1.0.0
 */
exports.isLeft = function (fa) {
    return fa.isLeft();
};
/**
 * Returns `true` if the either is an instance of `Right`, `false` otherwise
 *
 * @since 1.0.0
 */
exports.isRight = function (fa) {
    return fa.isRight();
};
/**
 * Builds `Compactable` instance for `Either` given `Monoid` for the left side
 *
 * @since 1.7.0
 */
function getCompactable(ML) {
    var compact = function (fa) {
        if (fa.isLeft()) {
            return fa;
        }
        if (fa.value.isNone()) {
            return exports.left(ML.empty);
        }
        return exports.right(fa.value.value);
    };
    var separate = function (fa) {
        if (fa.isLeft()) {
            return {
                left: fa,
                right: fa
            };
        }
        if (fa.value.isLeft()) {
            return {
                left: exports.right(fa.value.value),
                right: exports.left(ML.empty)
            };
        }
        return {
            left: exports.left(ML.empty),
            right: exports.right(fa.value.value)
        };
    };
    return {
        URI: exports.URI,
        _L: _function.phantom,
        compact: compact,
        separate: separate
    };
}
exports.getCompactable = getCompactable;
/**
 * Builds `Filterable` instance for `Either` given `Monoid` for the left side
 *
 * @since 1.7.0
 */
function getFilterable(ML) {
    var C = getCompactable(ML);
    var partitionMap = function (fa, f) {
        if (fa.isLeft()) {
            return {
                left: fa,
                right: fa
            };
        }
        var e = f(fa.value);
        if (e.isLeft()) {
            return {
                left: exports.right(e.value),
                right: exports.left(ML.empty)
            };
        }
        return {
            left: exports.left(ML.empty),
            right: exports.right(e.value)
        };
    };
    var partition = function (fa, p) {
        if (fa.isLeft()) {
            return {
                left: fa,
                right: fa
            };
        }
        if (p(fa.value)) {
            return {
                left: exports.left(ML.empty),
                right: exports.right(fa.value)
            };
        }
        return {
            left: exports.right(fa.value),
            right: exports.left(ML.empty)
        };
    };
    var filterMap = function (fa, f) {
        if (fa.isLeft()) {
            return fa;
        }
        var optionB = f(fa.value);
        if (optionB.isSome()) {
            return exports.right(optionB.value);
        }
        return exports.left(ML.empty);
    };
    var filter = function (fa, p) { return fa.filterOrElse(p, ML.empty); };
    return __assign({}, C, { map: map,
        partitionMap: partitionMap,
        filterMap: filterMap,
        partition: partition,
        filter: filter });
}
exports.getFilterable = getFilterable;
/**
 * Builds `Witherable` instance for `Either` given `Monoid` for the left side
 *
 * @since 1.7.0
 */
function getWitherable(ML) {
    var filterableEither = getFilterable(ML);
    var wither = function (F) {
        var traverseF = traverse(F);
        return function (wa, f) { return F.map(traverseF(wa, f), filterableEither.compact); };
    };
    var wilt = function (F) {
        var traverseF = traverse(F);
        return function (wa, f) { return F.map(traverseF(wa, f), filterableEither.separate); };
    };
    return __assign({}, filterableEither, { traverse: traverse,
        reduce: reduce,
        wither: wither,
        wilt: wilt });
}
exports.getWitherable = getWitherable;
/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @example
 * import { parseJSON, toError } from 'fp-ts/lib/Either'
 *
 * assert.deepStrictEqual(parseJSON('{"a":1}', toError).value, { a: 1 })
 * assert.deepStrictEqual(parseJSON('{"a":}', toError).value, new SyntaxError('Unexpected token } in JSON at position 5'))
 *
 * @since 1.16.0
 */
exports.parseJSON = function (s, onError) {
    return exports.tryCatch2v(function () { return JSON.parse(s); }, onError);
};
/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @example
 * import { stringifyJSON, toError } from 'fp-ts/lib/Either'
 *
 * assert.deepStrictEqual(stringifyJSON({ a: 1 }, toError).value, '{"a":1}')
 * const circular: any = { ref: null }
 * circular.ref = circular
 * assert.deepStrictEqual(stringifyJSON(circular, toError).value, new TypeError('Converting circular structure to JSON'))
 *
 * @since 1.16.0
 */
exports.stringifyJSON = function (u, onError) {
    return exports.tryCatch2v(function () { return JSON.stringify(u); }, onError);
};
var throwError = exports.left;
var fromEither = _function.identity;
/**
 * @since 1.0.0
 */
exports.either = {
    URI: exports.URI,
    map: map,
    of: of,
    ap: ap,
    chain: chain,
    reduce: reduce,
    foldMap: foldMap,
    foldr: foldr,
    traverse: traverse,
    sequence: sequence,
    bimap: bimap,
    alt: alt,
    extend: extend,
    chainRec: chainRec,
    throwError: throwError,
    fromEither: fromEither,
    fromOption: function (o, e) { return (o.isNone() ? throwError(e) : of(o.value)); }
};
});

unwrapExports(Either);
var Either_1 = Either.URI;
var Either_2 = Either.Left;
var Either_3 = Either.Right;
var Either_4 = Either.getShow;
var Either_5 = Either.getSetoid;
var Either_6 = Either.getSemigroup;
var Either_7 = Either.getApplySemigroup;
var Either_8 = Either.getApplyMonoid;
var Either_9 = Either.left;
var Either_10 = Either.right;
var Either_11 = Either.fromPredicate;
var Either_12 = Either.fromRefinement;
var Either_13 = Either.fromOption;
var Either_14 = Either.fromOptionL;
var Either_15 = Either.fromNullable;
var Either_16 = Either.toError;
var Either_17 = Either.tryCatch;
var Either_18 = Either.tryCatch2v;
var Either_19 = Either.fromValidation;
var Either_20 = Either.isLeft;
var Either_21 = Either.isRight;
var Either_22 = Either.getCompactable;
var Either_23 = Either.getFilterable;
var Either_24 = Either.getWitherable;
var Either_25 = Either.parseJSON;
var Either_26 = Either.stringifyJSON;
var Either_27 = Either.either;

var lib = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (commonjsGlobal && commonjsGlobal.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * @since 1.0.0
 */
var Type$$1 = /** @class */ (function () {
    function Type$$1(
    /** a unique name for this codec */
    name, 
    /** a custom type guard */
    is, 
    /** succeeds if a value of type I can be decoded to a value of type A */
    validate, 
    /** converts a value of type A to a value of type O */
    encode) {
        this.name = name;
        this.is = is;
        this.validate = validate;
        this.encode = encode;
        this.decode = this.decode.bind(this);
    }
    Type$$1.prototype.pipe = function (ab, name) {
        var _this = this;
        if (name === void 0) { name = "pipe(" + this.name + ", " + ab.name + ")"; }
        return new Type$$1(name, ab.is, function (i, c) {
            var validation = _this.validate(i, c);
            if (validation.isLeft()) {
                return validation;
            }
            return ab.validate(validation.value, c);
        }, this.encode === exports.identity && ab.encode === exports.identity ? exports.identity : function (b) { return _this.encode(ab.encode(b)); });
    };
    Type$$1.prototype.asDecoder = function () {
        return this;
    };
    Type$$1.prototype.asEncoder = function () {
        return this;
    };
    /** a version of `validate` with a default context */
    Type$$1.prototype.decode = function (i) {
        return this.validate(i, [{ key: '', type: this, actual: i }]);
    };
    return Type$$1;
}());
exports.Type = Type$$1;
/**
 * @since 1.0.0
 */
exports.identity = function (a) { return a; };
/**
 * @since 1.0.0
 */
exports.getFunctionName = function (f) {
    return f.displayName || f.name || "<function" + f.length + ">";
};
/**
 * @since 1.0.0
 */
exports.getContextEntry = function (key, decoder) { return ({ key: key, type: decoder }); };
/**
 * @since 1.0.0
 */
exports.appendContext = function (c, key, decoder, actual) {
    var len = c.length;
    var r = Array(len + 1);
    for (var i = 0; i < len; i++) {
        r[i] = c[i];
    }
    r[len] = { key: key, type: decoder, actual: actual };
    return r;
};
/**
 * @since 1.0.0
 */
exports.failures = function (errors) { return new Either.Left(errors); };
/**
 * @since 1.0.0
 */
exports.failure = function (value, context, message) {
    return exports.failures([{ value: value, context: context, message: message }]);
};
/**
 * @since 1.0.0
 */
exports.success = function (value) { return new Either.Right(value); };
var pushAll = function (xs, ys) {
    var l = ys.length;
    for (var i = 0; i < l; i++) {
        xs.push(ys[i]);
    }
};
var getIsCodec = function (tag) { return function (codec) { return codec._tag === tag; }; };
var isUnknownCodec = getIsCodec('UnknownType');
var isAnyCodec = getIsCodec('AnyType');
var isLiteralCodec = getIsCodec('LiteralType');
var isInterfaceCodec = getIsCodec('InterfaceType');
var isPartialCodec = getIsCodec('PartialType');
var isStrictCodec = getIsCodec('StrictType');
var isIntersectionCodec = getIsCodec('IntersectionType');
var isUnionCodec = getIsCodec('UnionType');
var isExactCodec = getIsCodec('ExactType');
var isRefinementCodec = getIsCodec('RefinementType');
var isRecursiveCodec = getIsCodec('RecursiveType');
//
// basic types
//
/**
 * @since 1.0.0
 */
var NullType = /** @class */ (function (_super) {
    __extends(NullType, _super);
    function NullType() {
        var _this = _super.call(this, 'null', function (u) { return u === null; }, function (u, c) { return (_this.is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity) || this;
        _this._tag = 'NullType';
        return _this;
    }
    return NullType;
}(Type$$1));
exports.NullType = NullType;
/**
 * @alias `null`
 * @since 1.0.0
 */
exports.nullType = new NullType();
exports.null = exports.nullType;
/**
 * @since 1.0.0
 */
var UndefinedType = /** @class */ (function (_super) {
    __extends(UndefinedType, _super);
    function UndefinedType() {
        var _this = _super.call(this, 'undefined', function (u) { return u === void 0; }, function (u, c) { return (_this.is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity) || this;
        _this._tag = 'UndefinedType';
        return _this;
    }
    return UndefinedType;
}(Type$$1));
exports.UndefinedType = UndefinedType;
var undefinedType = new UndefinedType();
exports.undefined = undefinedType;
/**
 * @since 1.2.0
 */
var VoidType = /** @class */ (function (_super) {
    __extends(VoidType, _super);
    function VoidType() {
        var _this = _super.call(this, 'void', undefinedType.is, undefinedType.validate, exports.identity) || this;
        _this._tag = 'VoidType';
        return _this;
    }
    return VoidType;
}(Type$$1));
exports.VoidType = VoidType;
/**
 * @alias `void`
 * @since 1.2.0
 */
exports.voidType = new VoidType();
exports.void = exports.voidType;
/**
 * @since 1.5.0
 */
var UnknownType = /** @class */ (function (_super) {
    __extends(UnknownType, _super);
    function UnknownType() {
        var _this = _super.call(this, 'unknown', function (_) { return true; }, exports.success, exports.identity) || this;
        _this._tag = 'UnknownType';
        return _this;
    }
    return UnknownType;
}(Type$$1));
exports.UnknownType = UnknownType;
/**
 * @since 1.5.0
 */
exports.unknown = new UnknownType();
/**
 * @since 1.0.0
 */
var StringType = /** @class */ (function (_super) {
    __extends(StringType, _super);
    function StringType() {
        var _this = _super.call(this, 'string', function (u) { return typeof u === 'string'; }, function (u, c) { return (_this.is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity) || this;
        _this._tag = 'StringType';
        return _this;
    }
    return StringType;
}(Type$$1));
exports.StringType = StringType;
/**
 * @since 1.0.0
 */
exports.string = new StringType();
/**
 * @since 1.0.0
 */
var NumberType = /** @class */ (function (_super) {
    __extends(NumberType, _super);
    function NumberType() {
        var _this = _super.call(this, 'number', function (u) { return typeof u === 'number'; }, function (u, c) { return (_this.is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity) || this;
        _this._tag = 'NumberType';
        return _this;
    }
    return NumberType;
}(Type$$1));
exports.NumberType = NumberType;
/**
 * @since 1.0.0
 */
exports.number = new NumberType();
/**
 * @since 1.0.0
 */
var BooleanType = /** @class */ (function (_super) {
    __extends(BooleanType, _super);
    function BooleanType() {
        var _this = _super.call(this, 'boolean', function (u) { return typeof u === 'boolean'; }, function (u, c) { return (_this.is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity) || this;
        _this._tag = 'BooleanType';
        return _this;
    }
    return BooleanType;
}(Type$$1));
exports.BooleanType = BooleanType;
/**
 * @since 1.0.0
 */
exports.boolean = new BooleanType();
/**
 * @since 1.0.0
 */
var AnyArrayType = /** @class */ (function (_super) {
    __extends(AnyArrayType, _super);
    function AnyArrayType() {
        var _this = _super.call(this, 'UnknownArray', Array.isArray, function (u, c) { return (_this.is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity) || this;
        _this._tag = 'AnyArrayType';
        return _this;
    }
    return AnyArrayType;
}(Type$$1));
exports.AnyArrayType = AnyArrayType;
/**
 * @since 1.7.1
 */
exports.UnknownArray = new AnyArrayType();
exports.Array = exports.UnknownArray;
/**
 * @since 1.0.0
 */
var AnyDictionaryType = /** @class */ (function (_super) {
    __extends(AnyDictionaryType, _super);
    function AnyDictionaryType() {
        var _this = _super.call(this, 'UnknownRecord', function (u) { return u !== null && typeof u === 'object'; }, function (u, c) { return (_this.is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity) || this;
        _this._tag = 'AnyDictionaryType';
        return _this;
    }
    return AnyDictionaryType;
}(Type$$1));
exports.AnyDictionaryType = AnyDictionaryType;
/**
 * @since 1.7.1
 */
exports.UnknownRecord = new AnyDictionaryType();
/**
 * @since 1.0.0
 * @deprecated
 */
var FunctionType = /** @class */ (function (_super) {
    __extends(FunctionType, _super);
    function FunctionType() {
        var _this = _super.call(this, 'Function', 
        // tslint:disable-next-line:strict-type-predicates
        function (u) { return typeof u === 'function'; }, function (u, c) { return (_this.is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity) || this;
        _this._tag = 'FunctionType';
        return _this;
    }
    return FunctionType;
}(Type$$1));
exports.FunctionType = FunctionType;
/**
 * @since 1.0.0
 * @deprecated
 */
exports.Function = new FunctionType();
/**
 * @since 1.0.0
 */
var RefinementType = /** @class */ (function (_super) {
    __extends(RefinementType, _super);
    function RefinementType(name, is, validate, encode, type$$1, predicate) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.type = type$$1;
        _this.predicate = predicate;
        _this._tag = 'RefinementType';
        return _this;
    }
    return RefinementType;
}(Type$$1));
exports.RefinementType = RefinementType;
/**
 * @since 1.8.1
 */
exports.brand = function (codec, predicate, name) {
    return refinement(codec, predicate, name);
};
/**
 * A branded codec representing an integer
 * @since 1.8.1
 */
exports.Int = exports.brand(exports.number, function (n) { return Number.isInteger(n); }, 'Int');
/**
 * @since 1.0.0
 */
var LiteralType = /** @class */ (function (_super) {
    __extends(LiteralType, _super);
    function LiteralType(name, is, validate, encode, value) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.value = value;
        _this._tag = 'LiteralType';
        return _this;
    }
    return LiteralType;
}(Type$$1));
exports.LiteralType = LiteralType;
/**
 * @since 1.0.0
 */
exports.literal = function (value, name) {
    if (name === void 0) { name = JSON.stringify(value); }
    var is = function (u) { return u === value; };
    return new LiteralType(name, is, function (u, c) { return (is(u) ? exports.success(value) : exports.failure(u, c)); }, exports.identity, value);
};
/**
 * @since 1.0.0
 */
var KeyofType = /** @class */ (function (_super) {
    __extends(KeyofType, _super);
    function KeyofType(name, is, validate, encode, keys) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.keys = keys;
        _this._tag = 'KeyofType';
        return _this;
    }
    return KeyofType;
}(Type$$1));
exports.KeyofType = KeyofType;
var hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * @since 1.0.0
 */
exports.keyof = function (keys, name) {
    if (name === void 0) { name = Object.keys(keys)
        .map(function (k) { return JSON.stringify(k); })
        .join(' | '); }
    var is = function (u) { return exports.string.is(u) && hasOwnProperty.call(keys, u); };
    return new KeyofType(name, is, function (u, c) { return (is(u) ? exports.success(u) : exports.failure(u, c)); }, exports.identity, keys);
};
/**
 * @since 1.0.0
 */
var RecursiveType = /** @class */ (function (_super) {
    __extends(RecursiveType, _super);
    function RecursiveType(name, is, validate, encode, runDefinition) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.runDefinition = runDefinition;
        _this._tag = 'RecursiveType';
        return _this;
    }
    Object.defineProperty(RecursiveType.prototype, "type", {
        get: function () {
            return this.runDefinition();
        },
        enumerable: true,
        configurable: true
    });
    return RecursiveType;
}(Type$$1));
exports.RecursiveType = RecursiveType;
/**
 * @since 1.0.0
 */
exports.recursion = function (name, definition) {
    var cache;
    var runDefinition = function () {
        if (!cache) {
            cache = definition(Self);
            cache.name = name;
        }
        return cache;
    };
    var Self = new RecursiveType(name, function (u) { return runDefinition().is(u); }, function (u, c) { return runDefinition().validate(u, c); }, function (a) { return runDefinition().encode(a); }, runDefinition);
    var indexRecordCache;
    Self.getIndexRecord = function () {
        if (!indexRecordCache) {
            isRecursiveCodecIndexable = false;
            indexRecordCache = getCodecIndexRecord(definition(Self), Self, Self);
            isRecursiveCodecIndexable = true;
        }
        return indexRecordCache;
    };
    return Self;
};
/**
 * @since 1.0.0
 */
var ArrayType = /** @class */ (function (_super) {
    __extends(ArrayType, _super);
    function ArrayType(name, is, validate, encode, type$$1) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.type = type$$1;
        _this._tag = 'ArrayType';
        return _this;
    }
    return ArrayType;
}(Type$$1));
exports.ArrayType = ArrayType;
/**
 * @since 1.0.0
 */
exports.array = function (codec, name) {
    if (name === void 0) { name = "Array<" + codec.name + ">"; }
    return new ArrayType(name, function (u) { return exports.UnknownArray.is(u) && u.every(codec.is); }, function (u, c) {
        var unknownArrayValidation = exports.UnknownArray.validate(u, c);
        if (unknownArrayValidation.isLeft()) {
            return unknownArrayValidation;
        }
        var us = unknownArrayValidation.value;
        var len = us.length;
        var as = us;
        var errors = [];
        for (var i = 0; i < len; i++) {
            var ui = us[i];
            var validation = codec.validate(ui, exports.appendContext(c, String(i), codec, ui));
            if (validation.isLeft()) {
                pushAll(errors, validation.value);
            }
            else {
                var ai = validation.value;
                if (ai !== ui) {
                    if (as === us) {
                        as = us.slice();
                    }
                    as[i] = ai;
                }
            }
        }
        return errors.length > 0 ? exports.failures(errors) : exports.success(as);
    }, codec.encode === exports.identity ? exports.identity : function (a) { return a.map(codec.encode); }, codec);
};
/**
 * @since 1.0.0
 */
var InterfaceType = /** @class */ (function (_super) {
    __extends(InterfaceType, _super);
    function InterfaceType(name, is, validate, encode, props) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.props = props;
        _this._tag = 'InterfaceType';
        return _this;
    }
    return InterfaceType;
}(Type$$1));
exports.InterfaceType = InterfaceType;
var getNameFromProps = function (props) {
    return Object.keys(props)
        .map(function (k) { return k + ": " + props[k].name; })
        .join(', ');
};
var useIdentity = function (codecs, len) {
    for (var i = 0; i < len; i++) {
        if (codecs[i].encode !== exports.identity) {
            return false;
        }
    }
    return true;
};
var getInterfaceTypeName = function (props) {
    return "{ " + getNameFromProps(props) + " }";
};
/**
 * @alias `interface`
 * @since 1.0.0
 */
exports.type = function (props, name) {
    if (name === void 0) { name = getInterfaceTypeName(props); }
    var keys = Object.keys(props);
    var types = keys.map(function (key) { return props[key]; });
    var len = keys.length;
    return new InterfaceType(name, function (u) {
        if (!exports.UnknownRecord.is(u)) {
            return false;
        }
        for (var i = 0; i < len; i++) {
            var k = keys[i];
            if (!hasOwnProperty.call(u, k) || !types[i].is(u[k])) {
                return false;
            }
        }
        return true;
    }, function (u, c) {
        var unknownRecordValidation = exports.UnknownRecord.validate(u, c);
        if (unknownRecordValidation.isLeft()) {
            return unknownRecordValidation;
        }
        var o = unknownRecordValidation.value;
        var a = o;
        var errors = [];
        for (var i = 0; i < len; i++) {
            var k = keys[i];
            if (!hasOwnProperty.call(a, k)) {
                if (a === o) {
                    a = __assign({}, o);
                }
                a[k] = a[k];
            }
            var ak = a[k];
            var type_1 = types[i];
            var validation = type_1.validate(ak, exports.appendContext(c, k, type_1, ak));
            if (validation.isLeft()) {
                pushAll(errors, validation.value);
            }
            else {
                var vak = validation.value;
                if (vak !== ak) {
                    /* istanbul ignore next */
                    if (a === o) {
                        a = __assign({}, o);
                    }
                    a[k] = vak;
                }
            }
        }
        return errors.length > 0 ? exports.failures(errors) : exports.success(a);
    }, useIdentity(types, len)
        ? exports.identity
        : function (a) {
            var s = __assign({}, a);
            for (var i = 0; i < len; i++) {
                var k = keys[i];
                var encode = types[i].encode;
                if (encode !== exports.identity) {
                    s[k] = encode(a[k]);
                }
            }
            return s;
        }, props);
};
exports.interface = exports.type;
/**
 * @since 1.0.0
 */
var PartialType = /** @class */ (function (_super) {
    __extends(PartialType, _super);
    function PartialType(name, is, validate, encode, props) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.props = props;
        _this._tag = 'PartialType';
        return _this;
    }
    return PartialType;
}(Type$$1));
exports.PartialType = PartialType;
var getPartialTypeName = function (inner) {
    return "Partial<" + inner + ">";
};
/**
 * @since 1.0.0
 */
exports.partial = function (props, name) {
    if (name === void 0) { name = getPartialTypeName(getInterfaceTypeName(props)); }
    var keys = Object.keys(props);
    var types = keys.map(function (key) { return props[key]; });
    var len = keys.length;
    return new PartialType(name, function (u) {
        if (!exports.UnknownRecord.is(u)) {
            return false;
        }
        for (var i = 0; i < len; i++) {
            var k = keys[i];
            var uk = u[k];
            if (uk !== undefined && !props[k].is(uk)) {
                return false;
            }
        }
        return true;
    }, function (u, c) {
        var unknownRecordValidation = exports.UnknownRecord.validate(u, c);
        if (unknownRecordValidation.isLeft()) {
            return unknownRecordValidation;
        }
        var o = unknownRecordValidation.value;
        var a = o;
        var errors = [];
        for (var i = 0; i < len; i++) {
            var k = keys[i];
            var ak = a[k];
            var type_2 = props[k];
            var validation = type_2.validate(ak, exports.appendContext(c, k, type_2, ak));
            if (validation.isLeft() && ak !== undefined) {
                pushAll(errors, validation.value);
            }
            else if (validation.isRight()) {
                var vak = validation.value;
                if (vak !== ak) {
                    /* istanbul ignore next */
                    if (a === o) {
                        a = __assign({}, o);
                    }
                    a[k] = vak;
                }
            }
        }
        return errors.length > 0 ? exports.failures(errors) : exports.success(a);
    }, useIdentity(types, len)
        ? exports.identity
        : function (a) {
            var s = __assign({}, a);
            for (var i = 0; i < len; i++) {
                var k = keys[i];
                var ak = a[k];
                if (ak !== undefined) {
                    s[k] = types[i].encode(ak);
                }
            }
            return s;
        }, props);
};
/**
 * @since 1.0.0
 */
var DictionaryType = /** @class */ (function (_super) {
    __extends(DictionaryType, _super);
    function DictionaryType(name, is, validate, encode, domain, codomain) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.domain = domain;
        _this.codomain = codomain;
        _this._tag = 'DictionaryType';
        return _this;
    }
    return DictionaryType;
}(Type$$1));
exports.DictionaryType = DictionaryType;
var isObject = function (r) { return Object.prototype.toString.call(r) === '[object Object]'; };
/**
 * @since 1.7.1
 */
exports.record = function (domain, codomain, name) {
    if (name === void 0) { name = "{ [K in " + domain.name + "]: " + codomain.name + " }"; }
    return new DictionaryType(name, function (u) {
        if (!exports.UnknownRecord.is(u)) {
            return false;
        }
        if (!isUnknownCodec(codomain) && !isAnyCodec(codomain) && !isObject(u)) {
            return false;
        }
        return Object.keys(u).every(function (k) { return domain.is(k) && codomain.is(u[k]); });
    }, function (u, c) {
        var unknownRecordValidation = exports.UnknownRecord.validate(u, c);
        if (unknownRecordValidation.isLeft()) {
            return unknownRecordValidation;
        }
        var o = unknownRecordValidation.value;
        if (!isUnknownCodec(codomain) && !isAnyCodec(codomain) && !isObject(o)) {
            return exports.failure(u, c);
        }
        var a = {};
        var errors = [];
        var keys = Object.keys(o);
        var len = keys.length;
        var changed = false;
        for (var i = 0; i < len; i++) {
            var k = keys[i];
            var ok = o[k];
            var domainValidation = domain.validate(k, exports.appendContext(c, k, domain, k));
            if (domainValidation.isLeft()) {
                pushAll(errors, domainValidation.value);
            }
            else {
                var vk = domainValidation.value;
                changed = changed || vk !== k;
                k = vk;
                var codomainValidation = codomain.validate(ok, exports.appendContext(c, k, codomain, ok));
                if (codomainValidation.isLeft()) {
                    pushAll(errors, codomainValidation.value);
                }
                else {
                    var vok = codomainValidation.value;
                    changed = changed || vok !== ok;
                    a[k] = vok;
                }
            }
        }
        return errors.length > 0 ? exports.failures(errors) : exports.success((changed ? a : o));
    }, domain.encode === exports.identity && codomain.encode === exports.identity
        ? exports.identity
        : function (a) {
            var s = {};
            var keys = Object.keys(a);
            var len = keys.length;
            for (var i = 0; i < len; i++) {
                var k = keys[i];
                s[String(domain.encode(k))] = codomain.encode(a[k]);
            }
            return s;
        }, domain, codomain);
};
/**
 * @since 1.0.0
 */
var UnionType$$1 = /** @class */ (function (_super) {
    __extends(UnionType$$1, _super);
    function UnionType$$1(name, is, validate, encode, types) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.types = types;
        _this._tag = 'UnionType';
        return _this;
    }
    return UnionType$$1;
}(Type$$1));
exports.UnionType = UnionType$$1;
var getUnionName = function (codecs) {
    return '(' + codecs.map(function (type$$1) { return type$$1.name; }).join(' | ') + ')';
};
/**
 * @since 1.0.0
 */
exports.union = function (codecs, name) {
    if (name === void 0) { name = getUnionName(codecs); }
    var len = codecs.length;
    return new UnionType$$1(name, function (u) { return codecs.some(function (type$$1) { return type$$1.is(u); }); }, function (u, c) {
        var errors = [];
        for (var i = 0; i < len; i++) {
            var type_3 = codecs[i];
            var validation = type_3.validate(u, exports.appendContext(c, String(i), type_3, u));
            if (validation.isRight()) {
                return validation;
            }
            pushAll(errors, validation.value);
        }
        return errors.length > 0 ? exports.failures(errors) : exports.failure(u, c);
    }, useIdentity(codecs, len)
        ? exports.identity
        : function (a) {
            for (var i = 0; i < len; i++) {
                var codec = codecs[i];
                if (codec.is(a)) {
                    return codec.encode(a);
                }
            }
            // https://github.com/gcanti/io-ts/pull/305
            throw new Error("no codec found to encode value in union type " + name);
        }, codecs);
};
/**
 * @since 1.0.0
 */
var IntersectionType$$1 = /** @class */ (function (_super) {
    __extends(IntersectionType$$1, _super);
    function IntersectionType$$1(name, is, validate, encode, types) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.types = types;
        _this._tag = 'IntersectionType';
        return _this;
    }
    return IntersectionType$$1;
}(Type$$1));
exports.IntersectionType = IntersectionType$$1;
var mergeAll = function (base, us) {
    var r = base;
    for (var i = 0; i < us.length; i++) {
        var u = us[i];
        if (u !== base) {
            // `u` contains a prismatic value or is the result of a stripping combinator
            if (r === base) {
                r = Object.assign({}, u);
                continue;
            }
            for (var k in u) {
                if (u[k] !== base[k] || !r.hasOwnProperty(k)) {
                    r[k] = u[k];
                }
            }
        }
    }
    return r;
};
function intersection$$1(codecs, name) {
    if (name === void 0) { name = "(" + codecs.map(function (type$$1) { return type$$1.name; }).join(' & ') + ")"; }
    var len = codecs.length;
    return new IntersectionType$$1(name, function (u) { return codecs.every(function (type$$1) { return type$$1.is(u); }); }, codecs.length === 0
        ? exports.success
        : function (u, c) {
            var us = [];
            var errors = [];
            for (var i = 0; i < len; i++) {
                var codec = codecs[i];
                var validation = codec.validate(u, exports.appendContext(c, String(i), codec, u));
                if (validation.isLeft()) {
                    pushAll(errors, validation.value);
                }
                else {
                    us.push(validation.value);
                }
            }
            return errors.length > 0 ? exports.failures(errors) : exports.success(mergeAll(u, us));
        }, codecs.length === 0 ? exports.identity : function (a) { return mergeAll(a, codecs.map(function (codec) { return codec.encode(a); })); }, codecs);
}
exports.intersection = intersection$$1;
/**
 * @since 1.0.0
 */
var TupleType = /** @class */ (function (_super) {
    __extends(TupleType, _super);
    function TupleType(name, is, validate, encode, types) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.types = types;
        _this._tag = 'TupleType';
        return _this;
    }
    return TupleType;
}(Type$$1));
exports.TupleType = TupleType;
function tuple(codecs, name) {
    if (name === void 0) { name = "[" + codecs.map(function (type$$1) { return type$$1.name; }).join(', ') + "]"; }
    var len = codecs.length;
    return new TupleType(name, function (u) { return exports.UnknownArray.is(u) && u.length === len && codecs.every(function (type$$1, i) { return type$$1.is(u[i]); }); }, function (u, c) {
        var unknownArrayValidation = exports.UnknownArray.validate(u, c);
        if (unknownArrayValidation.isLeft()) {
            return unknownArrayValidation;
        }
        var us = unknownArrayValidation.value;
        var as = us.length > len ? us.slice(0, len) : us; // strip additional components
        var errors = [];
        for (var i = 0; i < len; i++) {
            var a = us[i];
            var type_4 = codecs[i];
            var validation = type_4.validate(a, exports.appendContext(c, String(i), type_4, a));
            if (validation.isLeft()) {
                pushAll(errors, validation.value);
            }
            else {
                var va = validation.value;
                if (va !== a) {
                    /* istanbul ignore next */
                    if (as === us) {
                        as = us.slice();
                    }
                    as[i] = va;
                }
            }
        }
        return errors.length > 0 ? exports.failures(errors) : exports.success(as);
    }, useIdentity(codecs, len) ? exports.identity : function (a) { return codecs.map(function (type$$1, i) { return type$$1.encode(a[i]); }); }, codecs);
}
exports.tuple = tuple;
/**
 * @since 1.0.0
 */
var ReadonlyType = /** @class */ (function (_super) {
    __extends(ReadonlyType, _super);
    function ReadonlyType(name, is, validate, encode, type$$1) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.type = type$$1;
        _this._tag = 'ReadonlyType';
        return _this;
    }
    return ReadonlyType;
}(Type$$1));
exports.ReadonlyType = ReadonlyType;
/**
 * @since 1.0.0
 */
exports.readonly = function (codec, name) {
    if (name === void 0) { name = "Readonly<" + codec.name + ">"; }
    return new ReadonlyType(name, codec.is, function (u, c) {
        return codec.validate(u, c).map(function (x) {
            if (process.env.NODE_ENV !== 'production') {
                return Object.freeze(x);
            }
            return x;
        });
    }, codec.encode === exports.identity ? exports.identity : codec.encode, codec);
};
/**
 * @since 1.0.0
 */
var ReadonlyArrayType = /** @class */ (function (_super) {
    __extends(ReadonlyArrayType, _super);
    function ReadonlyArrayType(name, is, validate, encode, type$$1) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.type = type$$1;
        _this._tag = 'ReadonlyArrayType';
        return _this;
    }
    return ReadonlyArrayType;
}(Type$$1));
exports.ReadonlyArrayType = ReadonlyArrayType;
/**
 * @since 1.0.0
 */
exports.readonlyArray = function (codec, name) {
    if (name === void 0) { name = "ReadonlyArray<" + codec.name + ">"; }
    var arrayType = exports.array(codec);
    return new ReadonlyArrayType(name, arrayType.is, function (u, c) {
        return arrayType.validate(u, c).map(function (x) {
            if (process.env.NODE_ENV !== 'production') {
                return Object.freeze(x);
            }
            return x;
        });
    }, arrayType.encode, codec);
};
/**
 * Strips additional properties
 * @since 1.0.0
 */
exports.strict = function (props, name) {
    return exports.exact(exports.type(props), name);
};
/** @internal */
exports.emptyIndexRecord = {};
var monoidIndexRecord = {
    concat: function (a, b) {
        var _a;
        if (a === monoidIndexRecord.empty) {
            return b;
        }
        if (b === monoidIndexRecord.empty) {
            return a;
        }
        var r = cloneIndexRecord(a);
        for (var k in b) {
            if (r.hasOwnProperty(k)) {
                (_a = r[k]).push.apply(_a, b[k]);
            }
            else {
                r[k] = b[k];
            }
        }
        return r;
    },
    empty: exports.emptyIndexRecord
};
var isIndexRecordEmpty = function (a) {
    for (var _ in a) {
        return false;
    }
    return true;
};
var foldMapIndexRecord = function (as, f) {
    return as.reduce(function (acc, a) { return monoidIndexRecord.concat(acc, f(a)); }, monoidIndexRecord.empty);
};
var cloneIndexRecord = function (a) {
    var r = {};
    for (var k in a) {
        r[k] = a[k].slice();
    }
    return r;
};
var updateindexRecordOrigin = function (origin, indexRecord) {
    var r = {};
    for (var k in indexRecord) {
        r[k] = indexRecord[k].map(function (_a) {
            var v = _a[0], _ = _a[1], id = _a[2];
            return [v, origin, id];
        });
    }
    return r;
};
var getCodecIndexRecord = function (codec, origin, id) {
    if (isInterfaceCodec(codec) || isStrictCodec(codec)) {
        var interfaceIndex = {};
        for (var k in codec.props) {
            var prop = codec.props[k];
            if (isLiteralCodec(prop)) {
                var value = prop.value;
                interfaceIndex[k] = [[value, origin, id]];
            }
        }
        return interfaceIndex;
    }
    if (isIntersectionCodec(codec)) {
        return foldMapIndexRecord(codec.types, function (type$$1) { return getCodecIndexRecord(type$$1, origin, codec); });
    }
    if (isUnionCodec(codec)) {
        return foldMapIndexRecord(codec.types, function (type$$1) { return getCodecIndexRecord(type$$1, origin, type$$1); });
    }
    if (isExactCodec(codec) || isRefinementCodec(codec)) {
        return getCodecIndexRecord(codec.type, origin, codec);
    }
    if (isRecursiveCodec(codec)) {
        var indexRecord = codec.getIndexRecord();
        if (codec !== origin) {
            return updateindexRecordOrigin(origin, indexRecord);
        }
        return indexRecord;
    }
    return monoidIndexRecord.empty;
};
var isRecursiveCodecIndexable = true;
var isIndexableCodec = function (codec) {
    return (((isInterfaceCodec(codec) || isStrictCodec(codec)) &&
        Object.keys(codec.props).some(function (key) { return isLiteralCodec(codec.props[key]); })) ||
        ((isExactCodec(codec) || isRefinementCodec(codec)) && isIndexableCodec(codec.type)) ||
        (isIntersectionCodec(codec) && codec.types.some(isIndexableCodec)) ||
        (isUnionCodec(codec) && codec.types.every(isIndexableCodec)) ||
        (isRecursiveCodecIndexable && isRecursiveCodec(codec)));
};
/**
 * @internal
 */
exports.getIndexRecord = function (codecs) {
    var len = codecs.length;
    if (len === 0 || !codecs.every(isIndexableCodec)) {
        return monoidIndexRecord.empty;
    }
    var firstCodec = codecs[0];
    var ir = cloneIndexRecord(getCodecIndexRecord(firstCodec, firstCodec, firstCodec));
    for (var i = 1; i < len; i++) {
        var codec = codecs[i];
        var cir = getCodecIndexRecord(codec, codec, codec);
        for (var k in ir) {
            if (cir.hasOwnProperty(k)) {
                var is = ir[k];
                var cis = cir[k];
                var _loop_1 = function (j) {
                    var indexItem = cis[j];
                    var index = is.findIndex(function (_a) {
                        var v = _a[0];
                        return v === indexItem[0];
                    });
                    if (index === -1) {
                        is.push(indexItem);
                    }
                    else if (indexItem[2] !== is[index][2]) {
                        delete ir[k];
                        return "break";
                    }
                };
                for (var j = 0; j < cis.length; j++) {
                    var state_1 = _loop_1(j);
                    if (state_1 === "break")
                        break;
                }
            }
            else {
                delete ir[k];
            }
        }
    }
    return isIndexRecordEmpty(ir) ? monoidIndexRecord.empty : ir;
};
var getTaggedUnion = function (index, tag, codecs, name) {
    var len = codecs.length;
    var indexWithPosition = index.map(function (_a) {
        var v = _a[0], origin = _a[1];
        return [
            v,
            codecs.findIndex(function (codec) { return codec === origin; })
        ];
    });
    var findIndex = function (tagValue) {
        for (var i = 0; i < indexWithPosition.length; i++) {
            var _a = indexWithPosition[i], value = _a[0], position = _a[1];
            if (value === tagValue) {
                return position;
            }
        }
    };
    var isTagValue = function (u) { return findIndex(u) !== undefined; };
    return new TaggedUnionType(name, function (u) {
        if (!exports.UnknownRecord.is(u)) {
            return false;
        }
        var tagValue = u[tag];
        var index = findIndex(tagValue);
        return index !== undefined ? codecs[index].is(u) : false;
    }, function (u, c) {
        var dictionaryResult = exports.UnknownRecord.validate(u, c);
        if (dictionaryResult.isLeft()) {
            return dictionaryResult;
        }
        var d = dictionaryResult.value;
        var tagValue = d[tag];
        if (!isTagValue(tagValue)) {
            return exports.failure(u, c);
        }
        var index = findIndex(tagValue);
        var codec = codecs[index];
        return codec.validate(d, exports.appendContext(c, String(index), codec, d));
    }, useIdentity(codecs, len) ? exports.identity : function (a) { return codecs[findIndex(a[tag])].encode(a); }, codecs, tag);
};
/**
 * @since 1.3.0
 */
var TaggedUnionType = /** @class */ (function (_super) {
    __extends(TaggedUnionType, _super);
    function TaggedUnionType(name, is, validate, encode, codecs, tag) {
        var _this = _super.call(this, name, is, validate, encode, codecs) /* istanbul ignore next */ // <= workaround for https://github.com/Microsoft/TypeScript/issues/13455
         || this;
        _this.tag = tag;
        return _this;
    }
    return TaggedUnionType;
}(UnionType$$1));
exports.TaggedUnionType = TaggedUnionType;
/**
 * @since 1.3.0
 */
exports.taggedUnion = function (tag, codecs, name) {
    if (name === void 0) { name = getUnionName(codecs); }
    var indexRecord = exports.getIndexRecord(codecs);
    if (!indexRecord.hasOwnProperty(tag)) {
        if (isRecursiveCodecIndexable && codecs.length > 0) {
            console.warn("[io-ts] Cannot build a tagged union for " + name + ", returning a de-optimized union");
        }
        var U = exports.union(codecs, name);
        return new TaggedUnionType(name, U.is, U.validate, U.encode, codecs, tag);
    }
    return getTaggedUnion(indexRecord[tag], tag, codecs, name);
};
/**
 * @since 1.1.0
 */
var ExactType = /** @class */ (function (_super) {
    __extends(ExactType, _super);
    function ExactType(name, is, validate, encode, type$$1) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.type = type$$1;
        _this._tag = 'ExactType';
        return _this;
    }
    return ExactType;
}(Type$$1));
exports.ExactType = ExactType;
var getProps = function (codec) {
    switch (codec._tag) {
        case 'RefinementType':
        case 'ReadonlyType':
            return getProps(codec.type);
        case 'InterfaceType':
        case 'StrictType':
        case 'PartialType':
            return codec.props;
        case 'IntersectionType':
            return codec.types.reduce(function (props, type$$1) { return Object.assign(props, getProps(type$$1)); }, {});
    }
};
var stripKeys = function (o, props) {
    var keys = Object.getOwnPropertyNames(o);
    var shouldStrip = false;
    var r = {};
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!hasOwnProperty.call(props, key)) {
            shouldStrip = true;
        }
        else {
            r[key] = o[key];
        }
    }
    return shouldStrip ? r : o;
};
var getExactTypeName = function (codec) {
    if (isInterfaceCodec(codec)) {
        return "{| " + getNameFromProps(codec.props) + " |}";
    }
    else if (isPartialCodec(codec)) {
        return getPartialTypeName("{| " + getNameFromProps(codec.props) + " |}");
    }
    return "Exact<" + codec.name + ">";
};
/**
 * Strips additional properties
 * @since 1.1.0
 */
exports.exact = function (codec, name) {
    if (name === void 0) { name = getExactTypeName(codec); }
    var props = getProps(codec);
    return new ExactType(name, codec.is, function (u, c) {
        var unknownRecordValidation = exports.UnknownRecord.validate(u, c);
        if (unknownRecordValidation.isLeft()) {
            return unknownRecordValidation;
        }
        var validation = codec.validate(u, c);
        if (validation.isLeft()) {
            return validation;
        }
        return exports.success(stripKeys(validation.value, props));
    }, function (a) { return codec.encode(stripKeys(a, props)); }, codec);
};
/**
 * @since 1.0.0
 * @deprecated
 */
exports.getValidationError /* istanbul ignore next */ = function (value, context) { return ({
    value: value,
    context: context
}); };
/**
 * @since 1.0.0
 * @deprecated
 */
exports.getDefaultContext /* istanbul ignore next */ = function (decoder) { return [
    { key: '', type: decoder }
]; };
/**
 * @since 1.0.0
 * @deprecated
 */
var NeverType = /** @class */ (function (_super) {
    __extends(NeverType, _super);
    function NeverType() {
        var _this = _super.call(this, 'never', function (_) { return false; }, function (u, c) { return exports.failure(u, c); }, 
        /* istanbul ignore next */
        function () {
            throw new Error('cannot encode never');
        }) || this;
        _this._tag = 'NeverType';
        return _this;
    }
    return NeverType;
}(Type$$1));
exports.NeverType = NeverType;
/**
 * @since 1.0.0
 * @deprecated
 */
exports.never = new NeverType();
/**
 * @since 1.0.0
 * @deprecated
 */
var AnyType = /** @class */ (function (_super) {
    __extends(AnyType, _super);
    function AnyType() {
        var _this = _super.call(this, 'any', function (_) { return true; }, exports.success, exports.identity) || this;
        _this._tag = 'AnyType';
        return _this;
    }
    return AnyType;
}(Type$$1));
exports.AnyType = AnyType;
/**
 * Use `unknown` instead
 * @since 1.0.0
 * @deprecated
 */
exports.any = new AnyType();
/**
 * Use `UnknownRecord` instead
 * @since 1.0.0
 * @deprecated
 */
exports.Dictionary = exports.UnknownRecord;
/**
 * @since 1.0.0
 * @deprecated
 */
var ObjectType = /** @class */ (function (_super) {
    __extends(ObjectType, _super);
    function ObjectType() {
        var _this = _super.call(this, 'object', exports.UnknownRecord.is, exports.UnknownRecord.validate, exports.identity) || this;
        _this._tag = 'ObjectType';
        return _this;
    }
    return ObjectType;
}(Type$$1));
exports.ObjectType = ObjectType;
/**
 * Use `UnknownRecord` instead
 * @since 1.0.0
 * @deprecated
 */
exports.object = new ObjectType();
/**
 * Use `brand` instead
 * @since 1.0.0
 * @deprecated
 */
function refinement(codec, predicate, name) {
    if (name === void 0) { name = "(" + codec.name + " | " + exports.getFunctionName(predicate) + ")"; }
    return new RefinementType(name, function (u) { return codec.is(u) && predicate(u); }, function (i, c) {
        var validation = codec.validate(i, c);
        if (validation.isLeft()) {
            return validation;
        }
        var a = validation.value;
        return predicate(a) ? exports.success(a) : exports.failure(a, c);
    }, codec.encode, codec, predicate);
}
exports.refinement = refinement;
/**
 * Use `Int` instead
 * @since 1.0.0
 * @deprecated
 */
exports.Integer = refinement(exports.number, Number.isInteger, 'Integer');
/**
 * Use `record` instead
 * @since 1.0.0
 * @deprecated
 */
exports.dictionary = exports.record;
/**
 * @since 1.0.0
 * @deprecated
 */
var StrictType = /** @class */ (function (_super) {
    __extends(StrictType, _super);
    function StrictType(name, is, validate, encode, props) {
        var _this = _super.call(this, name, is, validate, encode) || this;
        _this.props = props;
        _this._tag = 'StrictType';
        return _this;
    }
    return StrictType;
}(Type$$1));
exports.StrictType = StrictType;
/**
 * Drops the codec "kind"
 * @since 1.1.0
 * @deprecated
 */
function clean(codec) {
    return codec;
}
exports.clean = clean;
function alias(codec) {
    return function () { return codec; };
}
exports.alias = alias;
});

unwrapExports(lib);
var lib_1 = lib.Type;
var lib_2 = lib.identity;
var lib_3 = lib.getFunctionName;
var lib_4 = lib.getContextEntry;
var lib_5 = lib.appendContext;
var lib_6 = lib.failures;
var lib_7 = lib.failure;
var lib_8 = lib.success;
var lib_9 = lib.NullType;
var lib_10 = lib.nullType;
var lib_11 = lib.UndefinedType;
var lib_12 = lib.undefined;
var lib_13 = lib.VoidType;
var lib_14 = lib.voidType;
var lib_15 = lib.UnknownType;
var lib_16 = lib.unknown;
var lib_17 = lib.StringType;
var lib_18 = lib.string;
var lib_19 = lib.NumberType;
var lib_20 = lib.number;
var lib_21 = lib.BooleanType;
var lib_22 = lib.AnyArrayType;
var lib_23 = lib.UnknownArray;
var lib_24 = lib.Array;
var lib_25 = lib.AnyDictionaryType;
var lib_26 = lib.UnknownRecord;
var lib_27 = lib.FunctionType;
var lib_28 = lib.Function;
var lib_29 = lib.RefinementType;
var lib_30 = lib.brand;
var lib_31 = lib.Int;
var lib_32 = lib.LiteralType;
var lib_33 = lib.literal;
var lib_34 = lib.KeyofType;
var lib_35 = lib.keyof;
var lib_36 = lib.RecursiveType;
var lib_37 = lib.recursion;
var lib_38 = lib.ArrayType;
var lib_39 = lib.array;
var lib_40 = lib.InterfaceType;
var lib_41 = lib.type;
var lib_42 = lib.PartialType;
var lib_43 = lib.partial;
var lib_44 = lib.DictionaryType;
var lib_45 = lib.record;
var lib_46 = lib.UnionType;
var lib_47 = lib.union;
var lib_48 = lib.IntersectionType;
var lib_49 = lib.intersection;
var lib_50 = lib.TupleType;
var lib_51 = lib.tuple;
var lib_52 = lib.ReadonlyType;
var lib_53 = lib.readonly;
var lib_54 = lib.ReadonlyArrayType;
var lib_55 = lib.readonlyArray;
var lib_56 = lib.strict;
var lib_57 = lib.emptyIndexRecord;
var lib_58 = lib.getIndexRecord;
var lib_59 = lib.TaggedUnionType;
var lib_60 = lib.taggedUnion;
var lib_61 = lib.ExactType;
var lib_62 = lib.exact;
var lib_63 = lib.getValidationError;
var lib_64 = lib.getDefaultContext;
var lib_65 = lib.NeverType;
var lib_66 = lib.never;
var lib_67 = lib.AnyType;
var lib_68 = lib.any;
var lib_69 = lib.Dictionary;
var lib_70 = lib.ObjectType;
var lib_71 = lib.object;
var lib_72 = lib.refinement;
var lib_73 = lib.Integer;
var lib_74 = lib.dictionary;
var lib_75 = lib.StrictType;
var lib_76 = lib.clean;
var lib_77 = lib.alias;

var PathReporter = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

function stringify(v) {
    if (typeof v === 'function') {
        return lib.getFunctionName(v);
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
    return context.map(function (_a) {
        var key = _a.key, type$$1 = _a.type;
        return key + ": " + type$$1.name;
    }).join('/');
}
function getMessage(e) {
    return e.message !== undefined
        ? e.message
        : "Invalid value " + stringify(e.value) + " supplied to " + getContextPath(e.context);
}
/**
 * @since 1.0.0
 */
function failure$$1(es) {
    return es.map(getMessage);
}
exports.failure = failure$$1;
/**
 * @since 1.0.0
 */
function success$$1() {
    return ['No errors!'];
}
exports.success = success$$1;
/**
 * @since 1.0.0
 */
exports.PathReporter = {
    report: function (validation) { return validation.fold(failure$$1, success$$1); }
};
});

unwrapExports(PathReporter);
var PathReporter_1 = PathReporter.failure;
var PathReporter_2 = PathReporter.success;
var PathReporter_3 = PathReporter.PathReporter;

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
        var type$$1 = _a.type;
        if (i === 0)
            return true;
        var previousType = context[i - 1].type;
        return !(previousType instanceof UnionType || previousType instanceof IntersectionType);
    })
        .map(function (_a) {
        var key = _a.key, type$$1 = _a.type;
        return (key ? key : type$$1.name);
    })
        .join('.');
}
function getMessage(e) {
    var expectedType = e.context[e.context.length - 1].type.name;
    var contextPath = getContextPath(e.context);
    var expectedMessage = expectedType !== contextPath ? expectedType + " for " + contextPath : expectedType;
    return e.message !== undefined ? e.message : "Expected type " + expectedMessage + ", but got: " + stringify(e.value);
}
var SimpleReporter = {
    report: function (validation) { return validation.fold(function (es) { return es.map(getMessage); }, function () { return ['No errors!']; }); }
};
function assertType(typeCodec, value, description) {
    if (description === void 0) { description = 'type'; }
    var validation = typeCodec.decode(value);
    if (validation.isLeft()) {
        throw new TypeError("Invalid " + description + " - " + SimpleReporter.report(validation)[0]);
    }
    return validation.value;
}

export { BalanceResult, TransactionStatus, TransactionStatusT, TransactionCommon, BaseUnsignedTransaction, BaseSignedTransaction, BaseTransactionInfo, BaseBroadcastResult, DateType, DateT, enumCodec, extend, nullable, SimpleReporter, assertType, PathReporter_3 as PathReporter };
//# sourceMappingURL=index.es5.js.map
